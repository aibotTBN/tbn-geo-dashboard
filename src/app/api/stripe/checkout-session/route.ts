import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, getPriceId, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/stripe/checkout-session
 * 
 * Creates a Stripe Checkout Session for plan subscription.
 * Requires authentication. Accepts: { plan: "STARTER" | "PRO" }
 * 
 * Also used for unauthenticated checkout after registration:
 * Accepts: { plan, userId } — userId is set by the register flow
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
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
      return NextResponse.json(
        { error: `Preis für Plan ${plan} nicht konfiguriert` },
        { status: 500 }
      )
    }

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
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://llmradar.de'

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
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
      // German locale for B2B DACH customers
      locale: 'de',
      // Allow promotion codes
      allow_promotion_codes: true,
      // Tax ID collection for B2B
      tax_id_collection: { enabled: true },
      // Billing address for invoices
      billing_address_collection: 'required',
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error: any) {
    console.error('[Stripe] Checkout session error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Checkout-Session' },
      { status: 500 }
    )
  }
}
