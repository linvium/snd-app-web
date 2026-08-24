import Stripe from 'npm:stripe@17.7.0'
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentEvent,
  PaymentProvider,
} from './types.ts'

/**
 * Stripe Checkout, hosted.
 *
 * Hosted rather than embedded so no card data, and no publishable key, ever
 * reaches our pages: the renter leaves for Stripe and comes back to
 * `/pay/<token>?status=success`. That return is a hint, not proof - the
 * `checkout.session.completed` webhook is what settles the booking, because it
 * is the only version of events the renter's browser cannot influence.
 *
 * `apiVersion` is deliberately unset: the account's own default applies, so a
 * pinned string here can never drift out of step with the dashboard.
 */

const SESSION_MIN_MINUTES = 30
const SESSION_MAX_HOURS = 24

function client(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key, {
    // Deno has no Node http stack; Stripe ships a fetch client for exactly this.
    httpClient: Stripe.createFetchHttpClient(),
  })
}

/**
 * Stripe caps a session at 24 hours and floors it at 30 minutes, while our link
 * lives for 72. Clamping to the link's own deadline is the part that matters:
 * a session that could complete after the link expired would take money for a
 * reservation the database would then refuse to settle.
 */
function sessionExpiry(linkExpiry: Date, now = new Date()): number | null {
  const cap = new Date(now.getTime() + SESSION_MAX_HOURS * 3_600_000)
  const chosen = linkExpiry < cap ? linkExpiry : cap
  const minutesAway = (chosen.getTime() - now.getTime()) / 60_000
  if (minutesAway < SESSION_MIN_MINUTES) return null
  return Math.floor(chosen.getTime() / 1000)
}

export function minutesUntil(date: Date, now = new Date()): number {
  return (date.getTime() - now.getTime()) / 60_000
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const expiresAt = sessionExpiry(request.expiresAt)
    if (expiresAt === null) {
      throw new Error('LINK_EXPIRING')
    }

    const session = await client().checkout.sessions.create({
      mode: 'payment',
      // Card only. Delayed-notification methods can settle days later, which is
      // exactly the case where the link would have expired underneath us.
      payment_method_types: ['card'],
      customer_email: request.renterEmail ?? undefined,
      client_reference_id: request.token,
      expires_at: expiresAt,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: request.currency.toLowerCase(),
            unit_amount: request.amountMinor,
            product_data: {
              name: request.listingTitle,
              description: request.bookingReference
                ? `Rezervacija ${request.bookingReference}`
                : undefined,
            },
          },
        },
      ],
      // On both the session and the intent: the webhook may carry either.
      metadata: { snd_token: request.token },
      payment_intent_data: { metadata: { snd_token: request.token } },
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
    })

    if (!session.url) throw new Error('Stripe returned a session with no URL')
    return { sessionId: session.id, url: session.url }
  },

  async parseWebhook(request: Request, rawBody: string): Promise<PaymentEvent> {
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set')

    const signature = request.headers.get('stripe-signature')
    if (!signature) throw new Error('missing stripe-signature')

    // Deno's crypto is async-only, so the async constructor is required here.
    const event = await client().webhooks.constructEventAsync(
      rawBody,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    )

    const object = event.data.object as {
      id?: string
      client_reference_id?: string | null
      payment_intent?: string | { id?: string } | null
      metadata?: Record<string, string> | null
      last_payment_error?: { message?: string; code?: string } | null
    }

    const token = object.client_reference_id ?? object.metadata?.snd_token ?? null
    const intent =
      typeof object.payment_intent === 'string'
        ? object.payment_intent
        : (object.payment_intent?.id ?? object.id ?? null)

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return { kind: 'paid', token, providerReference: intent, reason: null, type: event.type }

      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed':
        return {
          kind: 'failed',
          token,
          providerReference: intent,
          reason: object.last_payment_error?.message ?? 'Plaćanje nije prošlo.',
          type: event.type,
        }

      case 'checkout.session.expired':
        return {
          kind: 'expired',
          token,
          providerReference: intent,
          reason: 'Sesija plaćanja je istekla.',
          type: event.type,
        }

      default:
        return { kind: 'ignored', token, providerReference: intent, reason: null, type: event.type }
    }
  },
}
