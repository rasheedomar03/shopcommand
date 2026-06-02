import { api } from './api'

/**
 * Redirect the user to Stripe Checkout for the founding member subscription.
 * After payment, they return to /dashboard?subscribed=1
 */
export async function startCheckout() {
  const origin = window.location.origin
  const { url } = await api('/api/stripe-checkout', {
    method: 'POST',
    body: {
      successUrl: `${origin}/dashboard?subscribed=1`,
      cancelUrl: `${origin}/settings?tab=billing`,
    },
  })
  window.location.href = url
}

/**
 * Fetch current billing/subscription status.
 */
export async function getBillingStatus() {
  return api('/api/billing')
}
