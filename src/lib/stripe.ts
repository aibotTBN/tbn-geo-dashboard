/**
 * Stripe configuration and helpers for LLM Radar.
 * 
 * Env vars required:
 *   STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_...
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — pk_test_... or pk_live_...
 * 
 * Price env vars (set per environment — test vs live have different IDs):
 *   STRIPE_PRICE_STARTER    — price_... for €99/month
 *   STRIPE_PRICE_PRO        — price_... for €499/month
 *   STRIPE_PRICE_MANAGED    — price_... for €799/month (optional, manual onboarding)
 */

import Stripe from 'stripe'

// Server-side Stripe instance (never expose to client)
// Use the SDK's default API version for best compatibility
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

// Plan → Stripe Price ID mapping
export function getPriceId(plan: 'STARTER' | 'PRO' | 'MANAGED'): string | null {
  switch (plan) {
    case 'STARTER':
      return process.env.STRIPE_PRICE_STARTER || null
    case 'PRO':
      return process.env.STRIPE_PRICE_PRO || null
    case 'MANAGED':
      return process.env.STRIPE_PRICE_MANAGED || null
    default:
      return null
  }
}

// Stripe Price ID → Plan mapping (for webhook processing)
export function getPlanFromPriceId(priceId: string): 'STARTER' | 'PRO' | 'MANAGED' | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'STARTER'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'PRO'
  if (priceId === process.env.STRIPE_PRICE_MANAGED) return 'MANAGED'
  return null
}

// Verify that Stripe is configured
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  )
}
