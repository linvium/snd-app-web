/**
 * What a payment provider has to do for us, and nothing more.
 *
 * Everything downstream of a settled payment - the `booked` status, the two
 * emails, the message in the thread - lives in `snd_confirm_booking_payment`
 * and knows nothing about who collected the money. A provider's job is only to
 * take a link to a place where it can be paid, and to tell us afterwards which
 * link was paid and under what reference.
 */

export interface CheckoutRequest {
  /** Our payment link token. Round-trips through the provider as the id we match on. */
  token: string
  amountMinor: number
  /** ISO 4217, as stored on the link (RSD today). */
  currency: string
  listingTitle: string
  bookingReference: string | null
  renterEmail: string | null
  successUrl: string
  cancelUrl: string
  /** The link's own deadline. A session must never outlive it. */
  expiresAt: Date
}

export interface CheckoutSession {
  sessionId: string
  url: string
}

/** What a webhook turned out to mean, in our vocabulary rather than theirs. */
export type PaymentEventKind = 'paid' | 'failed' | 'expired' | 'ignored'

export interface PaymentEvent {
  kind: PaymentEventKind
  /** Our link token, recovered from the provider's payload. */
  token: string | null
  /** The provider's id for the payment, stored for reconciliation. */
  providerReference: string | null
  reason: string | null
  /** For logs only. */
  type: string
}

export interface PaymentProvider {
  readonly name: string
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>
  /**
   * Verify and interpret a webhook. Must throw if the signature does not check
   * out - an unverified webhook is an attacker claiming a booking was paid.
   */
  parseWebhook(request: Request, rawBody: string): Promise<PaymentEvent>
}
