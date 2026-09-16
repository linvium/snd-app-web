import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/email.ts'
import { stripeProvider } from '../_shared/payments/index.ts'
import {
  endSubscription,
  failOrder,
  renewSubscription,
  settleOrder,
} from '../_shared/payments/settle.ts'

/**
 * Where Stripe tells us an order was paid, a plan renewed, or a plan ended.
 *
 * `verify_jwt` is off because Stripe does not carry a Supabase token; the
 * signature check in the adapter is the authentication, and it runs before
 * anything is read out of the payload. An unsigned request never reaches the
 * database.
 *
 * Every branch answers 200 once the event has been understood, including the
 * ones we choose not to act on. A non-2xx tells Stripe to redeliver, and
 * redelivering an event we have already handled correctly is noise, not safety
 * - settling an order is idempotent for the case that matters.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders)
  }

  // The raw body, byte for byte: the signature is over exactly these bytes, so
  // it must not be parsed and re-serialised first.
  const rawBody = await req.text()

  let event
  try {
    event = await stripeProvider.parseWebhook(req, rawBody)
  } catch (error) {
    console.error('stripe-webhook: signature rejected', error)
    return jsonResponse({ error: 'invalid signature' }, 400, corsHeaders)
  }

  if (event.kind === 'ignored') {
    return jsonResponse({ received: true, handled: false, type: event.type }, 200, corsHeaders)
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('stripe-webhook: admin client', error)
    // This one is worth a retry: the event was fine, we were not.
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
  }

  if (event.kind === 'renewed' || event.kind === 'subscription_ended') {
    if (!event.subscriptionId) {
      console.warn('stripe-webhook: no subscription on', event.type)
      return jsonResponse({ received: true, handled: false, reason: 'no subscription' }, 200, corsHeaders)
    }

    const outcome =
      event.kind === 'renewed'
        ? await renewSubscription(admin, event)
        : await endSubscription(admin, event.subscriptionId)

    // NOT_FOUND on a first invoice is expected: it can arrive before the
    // checkout that created the plan has been settled, and settling records it.
    if (!outcome.ok && outcome.status === 500) {
      return jsonResponse({ error: outcome.code }, 500, corsHeaders)
    }

    return jsonResponse({ received: true, handled: outcome.ok, kind: event.kind }, 200, corsHeaders)
  }

  if (!event.token) {
    // A live Stripe account may be taking payments that are nothing to do with
    // us. Accept the delivery, do nothing, and say so in the logs.
    console.warn('stripe-webhook: no snd_token on', event.type)
    return jsonResponse({ received: true, handled: false, reason: 'no token' }, 200, corsHeaders)
  }

  if (event.kind === 'paid') {
    const outcome = await settleOrder(admin, event)

    if (!outcome.ok && outcome.status === 500) {
      return jsonResponse({ error: outcome.code }, 500, corsHeaders)
    }

    if (!outcome.ok) {
      console.warn('stripe-webhook: paid event not settled', outcome.code, event.token)
    }

    // Two plans paid for in two tabs: the newer one won in the database, so
    // the older one must stop charging the card as well.
    const replaced = (outcome.data as { replaced_provider_subscription_id?: string | null } | null)
      ?.replaced_provider_subscription_id
    if (replaced) {
      try {
        await stripeProvider.cancelSubscription(replaced, { immediately: true })
      } catch (error) {
        console.error('stripe-webhook: could not stop replaced subscription', replaced, error)
      }
    }

    return jsonResponse(
      { received: true, handled: outcome.ok, code: outcome.code },
      200,
      corsHeaders
    )
  }

  const outcome = await failOrder(admin, event.token, event.reason, event.providerReference)
  if (!outcome.ok && outcome.status === 500) {
    return jsonResponse({ error: outcome.code }, 500, corsHeaders)
  }

  return jsonResponse({ received: true, handled: outcome.ok, kind: event.kind }, 200, corsHeaders)
})
