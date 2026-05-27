import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/stripe/billing-portal
 * 
 * Creates a Stripe Billing Portal session for subscription management.
 * Allows customers to:
 *   - View/download invoices
 *   - Update payment method
 *   - Cancel subscription
 *   - Change plan (up/downgrade)
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Zahlungssystem ist noch nicht konfiguriert' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Kein Stripe-Konto verknüpft. Bitte zuerst ein Abo abschließen.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://llmradar.de'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/dashboard`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('[Stripe] Billing portal error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Öffnen des Kundenportals' },
      { status: 500 }
    )
  }
}
