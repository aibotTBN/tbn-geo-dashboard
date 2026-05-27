import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import type Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 * 
 * Handles incoming Stripe webhook events.
 * This endpoint must NOT require authentication — Stripe calls it directly.
 * 
 * Events handled:
 *   - checkout.session.completed → Activate plan after payment
 *   - customer.subscription.updated → Handle plan changes / renewals
 *   - customer.subscription.deleted → Deactivate plan on cancellation
 *   - invoice.payment_failed → Mark payment issue
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error)
    // Return 200 to prevent Stripe from retrying (we'll log and investigate)
    return NextResponse.json({ received: true, error: error.message }, { status: 200 })
  }

  return NextResponse.json({ received: true })
}

// ─── Event Handlers ──────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan as 'STARTER' | 'PRO' | 'MANAGED' | undefined
  const subscriptionId = session.subscription as string | null
  const customerId = session.customer as string | null

  console.log(`[Stripe] Checkout completed: userId=${userId}, plan=${plan}, sub=${subscriptionId}`)

  if (!userId) {
    console.error('[Stripe] No userId in checkout session metadata')
    return
  }

  // Verify the plan from the metadata or derive from subscription
  let activePlan = plan

  if (!activePlan && subscriptionId) {
    // Fetch subscription to determine plan from price
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = subscription.items.data[0]?.price?.id
    if (priceId) {
      activePlan = getPlanFromPriceId(priceId) || undefined
    }
  }

  if (!activePlan) {
    console.error('[Stripe] Could not determine plan for checkout session')
    return
  }

  // Update user with plan and Stripe IDs
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: activePlan,
      stripeSubId: subscriptionId,
      stripeCustomerId: customerId || undefined,
      planExpiresAt: null, // Managed by Stripe, no manual expiry
    },
  })

  console.log(`[Stripe] User ${userId} activated: plan=${activePlan}, sub=${subscriptionId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const subscriptionId = subscription.id
  const status = subscription.status
  const priceId = subscription.items.data[0]?.price?.id

  console.log(`[Stripe] Subscription updated: sub=${subscriptionId}, status=${status}`)

  // Find user by subscription ID or customer ID
  let user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null

  if (!user) {
    const customerId = subscription.customer as string
    user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
  }

  if (!user) {
    console.error(`[Stripe] No user found for subscription ${subscriptionId}`)
    return
  }

  if (status === 'active' || status === 'trialing') {
    // Active subscription — update plan if changed
    const newPlan = priceId ? getPlanFromPriceId(priceId) : null
    if (newPlan) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: newPlan,
          stripeSubId: subscriptionId,
          planExpiresAt: null,
        },
      })
      console.log(`[Stripe] User ${user.id} plan updated to ${newPlan}`)
    }
  } else if (status === 'past_due' || status === 'unpaid') {
    // Payment issue — log but keep plan active for grace period
    console.warn(`[Stripe] User ${user.id} subscription is ${status}`)
  } else if (status === 'canceled' || status === 'incomplete_expired') {
    // Subscription ended
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: null,
        stripeSubId: null,
        // Keep stripeCustomerId for future resubscription
      },
    })
    console.log(`[Stripe] User ${user.id} plan deactivated (${status})`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id
  const customerId = subscription.customer as string

  console.log(`[Stripe] Subscription deleted: sub=${subscriptionId}`)

  // Find user by subscription or customer ID
  let user = await prisma.user.findFirst({ where: { stripeSubId: subscriptionId } })
  if (!user) {
    user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
  }

  if (!user) {
    console.error(`[Stripe] No user found for deleted subscription ${subscriptionId}`)
    return
  }

  // Deactivate plan — projects remain accessible (read-only) for 90 days
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: null,
      stripeSubId: null,
      // planExpiresAt: set to 90 days from now for graceful downgrade
      planExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  })

  console.log(`[Stripe] User ${user.id} subscription cancelled. Graceful period until ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string | null

  console.warn(`[Stripe] Payment failed: customer=${customerId}, sub=${subscriptionId}`)

  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
  if (user) {
    console.warn(`[Stripe] Payment failed for user ${user.id} (${user.email})`)
    // Don't deactivate yet — Stripe will retry. 
    // After final failure, subscription.deleted event will fire.
  }
}
