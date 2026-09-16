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
 * reaches our pages: the owner leaves for Stripe and comes back to
 * `/profile/billing?order=<token>&status=success`. That return is a hint, not
 * proof - the webhook is what settles the order, because it is the only
 * version of events the browser cannot influence.
 *
 * Credits are a one-off `payment` session. A plan is a `subscription` session
 * with an inline recurring price, so nothing has to be set up in the dashboard
 * first; later periods arrive as `invoice.paid`.
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
 * Stripe caps a session at 24 hours and floors it at 30 minutes. Clamping to
 * the order's own deadline is the part that matters: a session that could
 * complete long after the order lapsed would take money for a checkout the
 * owner has already given up on.
 */
function sessionExpiry(orderExpiry: Date, now = new Date()): number | null {
  const cap = new Date(now.getTime() + SESSION_MAX_HOURS * 3_600_000)
  const chosen = orderExpiry < cap ? orderExpiry : cap
  const minutesAway = (chosen.getTime() - now.getTime()) / 60_000
  if (minutesAway < SESSION_MIN_MINUTES) return null
  return Math.floor(chosen.getTime() / 1000)
}

/** Stripe fields that come back as an id or as an expanded object, depending on the call. */
function idOf(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id
  }
  return null
}

type Metadata = Record<string, string> | null | undefined

export const stripeProvider: PaymentProvider = {
  name: 'stripe',

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const expiresAt = sessionExpiry(request.expiresAt)
    if (expiresAt === null) {
      throw new Error('ORDER_EXPIRING')
    }

    const recurring = request.mode === 'subscription'
    const metadata = { snd_token: request.token }

    const session = await client().checkout.sessions.create({
      mode: request.mode,
      // Card only. Delayed-notification methods can settle days later, long
      // after the owner expected the plan or the credits to be there.
      payment_method_types: ['card'],
      customer_email: request.customerEmail ?? undefined,
      client_reference_id: request.token,
      expires_at: expiresAt,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: request.currency.toLowerCase(),
            unit_amount: request.amountMinor,
            product_data: {
              name: request.productName,
              description: request.productDescription ?? undefined,
            },
            ...(recurring
              ? {
                  recurring: {
                    interval: 'month' as const,
                    interval_count: Math.max(1, request.intervalMonths),
                  },
                }
              : {}),
          },
        },
      ],
      // On the session and on what it creates: a renewal invoice carries only
      // the subscription's metadata, a refused card only the intent's.
      metadata,
      ...(recurring
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
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

    const object = event.data.object as Record<string, unknown>
    const metadata = object.metadata as Metadata

    const base: PaymentEvent = {
      kind: 'ignored',
      token: null,
      providerReference: null,
      subscriptionId: null,
      periodEnd: null,
      amountMinor: null,
      reason: null,
      type: event.type,
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = object as {
          id?: string
          client_reference_id?: string | null
          payment_intent?: unknown
          subscription?: unknown
          invoice?: unknown
          payment_status?: string
        }
        // A completed session can still be unpaid while a delayed method
        // clears; it then settles through `async_payment_succeeded`.
        if (event.type === 'checkout.session.completed' && session.payment_status === 'unpaid') {
          return base
        }
        return {
          ...base,
          kind: 'paid',
          token: session.client_reference_id ?? metadata?.snd_token ?? null,
          providerReference:
            idOf(session.invoice) ?? idOf(session.payment_intent) ?? session.id ?? null,
          subscriptionId: idOf(session.subscription),
        }
      }

      case 'checkout.session.async_payment_failed': {
        const session = object as { id?: string; client_reference_id?: string | null }
        return {
          ...base,
          kind: 'failed',
          token: session.client_reference_id ?? metadata?.snd_token ?? null,
          providerReference: session.id ?? null,
          reason: 'Plaćanje nije prošlo.',
        }
      }

      case 'payment_intent.payment_failed': {
        const intent = object as {
          id?: string
          last_payment_error?: { message?: string } | null
        }
        return {
          ...base,
          kind: 'failed',
          token: metadata?.snd_token ?? null,
          providerReference: intent.id ?? null,
          reason: intent.last_payment_error?.message ?? 'Plaćanje nije prošlo.',
        }
      }

      case 'checkout.session.expired': {
        const session = object as { id?: string; client_reference_id?: string | null }
        return {
          ...base,
          kind: 'expired',
          token: session.client_reference_id ?? metadata?.snd_token ?? null,
          providerReference: session.id ?? null,
          reason: 'Sesija plaćanja je istekla.',
        }
      }

      case 'invoice.paid': {
        const invoice = object as {
          id?: string
          subscription?: unknown
          amount_paid?: number
          lines?: { data?: Array<{ period?: { end?: number } }> }
          subscription_details?: { metadata?: Metadata } | null
          parent?: {
            subscription_details?: { subscription?: unknown; metadata?: Metadata } | null
          } | null
        }
        // Older API versions put the subscription on the invoice, newer ones
        // under `parent`; either is the same subscription.
        const details = invoice.parent?.subscription_details
        const end = invoice.lines?.data?.[0]?.period?.end
        return {
          ...base,
          kind: 'renewed',
          token:
            details?.metadata?.snd_token ?? invoice.subscription_details?.metadata?.snd_token ?? null,
          providerReference: invoice.id ?? null,
          subscriptionId: idOf(invoice.subscription) ?? idOf(details?.subscription),
          periodEnd: typeof end === 'number' ? new Date(end * 1000) : null,
          amountMinor: typeof invoice.amount_paid === 'number' ? invoice.amount_paid : null,
        }
      }

      case 'customer.subscription.deleted':
        return {
          ...base,
          kind: 'subscription_ended',
          token: metadata?.snd_token ?? null,
          subscriptionId: idOf(object.id),
        }

      default:
        return base
    }
  },

  async cancelSubscription(subscriptionId: string, options?: { immediately?: boolean }) {
    if (options?.immediately) {
      await client().subscriptions.cancel(subscriptionId)
      return
    }
    await client().subscriptions.update(subscriptionId, { cancel_at_period_end: true })
  },
}
