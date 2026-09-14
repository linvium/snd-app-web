/**
 * What a payment provider has to do for us, and nothing more.
 *
 * SND charges for listing, not for renting: an order buys a subscription plan
 * or a pack of listing credits. Everything downstream of a settled payment -
 * the subscription row, the credits, the confirmation mail - lives in
 * `snd_settle_billing_order` and knows nothing about who collected the money.
 * A provider's job is to open a place where the order can be paid, to tell us
 * afterwards what happened, and to stop a recurring charge when asked.
 */

export type CheckoutMode = 'payment' | 'subscription'

export interface CheckoutRequest {
  /** Our order token. Round-trips through the provider as the id we match on. */
  token: string
  /** A one-off payment for credits, or the first charge of a recurring plan. */
  mode: CheckoutMode
  amountMinor: number
  /** ISO 4217, as stored on the order (RSD today). */
  currency: string
  productName: string
  productDescription: string | null
  customerEmail: string | null
  /** How many months one subscription period lasts. Ignored for one-off payments. */
  intervalMonths: number
  successUrl: string
  cancelUrl: string
  /** The order's own deadline. A session must never outlive it. */
  expiresAt: Date
}

export interface CheckoutSession {
  sessionId: string
  url: string
}

/** What a webhook turned out to mean, in our vocabulary rather than theirs. */
export type PaymentEventKind =
  | 'paid'
  | 'failed'
  | 'expired'
  | 'renewed'
  | 'subscription_ended'
  | 'ignored'

export interface PaymentEvent {
  kind: PaymentEventKind
  /** Our order token, recovered from the provider's payload when it carries one. */
  token: string | null
  /** The provider's id for the payment (invoice, intent or session), for reconciliation. */
  providerReference: string | null
  /** The provider's recurring subscription, when the event is about one. */
  subscriptionId: string | null
  /** End of the period a payment or renewal covers, when the provider says. */
  periodEnd: Date | null
  amountMinor: number | null
  reason: string | null
  /** For logs only. */
  type: string
}

export interface PaymentProvider {
  readonly name: string
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>
  /**
   * Verify and interpret a webhook. Must throw if the signature does not check
   * out - an unverified webhook is an attacker claiming an order was paid.
   */
  parseWebhook(request: Request, rawBody: string): Promise<PaymentEvent>
  /** Stop billing a subscription: at the end of the period by default, or right away. */
  cancelSubscription(subscriptionId: string, options?: { immediately?: boolean }): Promise<void>
}
