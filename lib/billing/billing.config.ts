/**
 * The sandbox path for buying without a provider.
 *
 * With this on, starting a purchase skips the hosted checkout and returns to
 * the billing page, where a "mark as paid" button settles the order through
 * `payment-confirm`. The edge function only honours that with
 * PAYMENT_MANUAL_CONFIRM=true, so both switches have to be on, and neither
 * belongs anywhere Stripe keys are configured.
 */
export const MANUAL_BILLING_CONFIRM = process.env.NEXT_PUBLIC_PAYMENT_MANUAL_CONFIRM === 'true'
