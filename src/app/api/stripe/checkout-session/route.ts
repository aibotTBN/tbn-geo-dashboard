import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, getPriceId, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/stripe/checkout-session
 * 
 * Creates a Stripe Checkout Session for plan subscription.
 * Requires authentication OR a userId from the registration flow.
 * Accepts: { plan: "STARTER" | "PRO", userId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      console.error('[Stripe] Not configured: missing STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
      return NextResponse.json(
        { error: 'Zahlungssystem ist noch nicht konfiguriert' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { plan, userId: bodyUserId } = body

    // Validate plan
    if (!plan || !['STARTER', 'PRO'].includes(plan)) {
      return NextResponse.json(
        { error: 'Ungültiger Plan. Verfügbar: STARTER, PRO' },
        { status: 400 }
      )
    }

    // Get the user — either from session or from body (post-registration flow)
    let userId: string | null = null
    let userEmail: string | null = null

    const session = await getServerSession(authOptions)
    if (session?.user) {
      userId = (session.user as any).id
      userEmail = session.user.email || null
    } else if (bodyUserId) {
      // Post-registration flow: user just registered, not yet logged in
      const user = await prisma.user.findUnique({ where: { id: bodyUserId } })
      if (user) {
        userId = user.id
        userEmail = user.email
      }
    }

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const priceId = getPriceId(plan)
    if (!priceId) {
      console.error(`[Stripe] No price ID for plan "${plan}". Check env vars STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO`)
      return NextResponse.json(
        { error: `Preis für Plan ${plan} nicht konfiguriert. Bitte STRIPE_PRICE_${plan} prüfen.` },
        { status: 500 }
      )
    }

    console.log(`[Stripe] Creating checkout for user=${userId}, plan=${plan}, priceId=${priceId}`)

    // Look up or create Stripe customer
    const user = await prisma.user.findUnique({ where: { id: userId } })
    let stripeCustomerId = user?.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: user?.name || undefined,
        metadata: { userId, plan },
      })
      stripeCustomerId = customer.id

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      })
      console.log(`[Stripe] Created customer ${stripeCustomerId} for ${userEmail}`)
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://llmradar.de'

    // Create Checkout Session
    // Don't specify payment_method_types — let Stripe auto-detect
    // based on what's enabled in the Dashboard (card is always available)
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/login?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl}/register?checkout=cancelled`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
      locale: 'de',
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    console.log(`[Stripe] Checkout session created: ${checkoutSession.id}`)

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error: any) {
    // Log the full Stripe error for debugging
    console.error('[Stripe] Checkout session error:', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      raw: error?.raw?.message,
    })
    
    // Return a more helpful error message
    const errorMessage = error?.raw?.message || error?.message || 'Unbekannter Fehler'
    return NextResponse.json(
      { error: `Fehler beim Erstellen der Checkout-Session: ${errorMessage}` },
      { status: 500 }
    )
  }
}
