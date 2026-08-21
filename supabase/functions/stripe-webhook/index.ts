import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/email.ts'
import { stripeProvider } from '../_shared/payments/index.ts'
import { failPayment, settlePayment } from '../_shared/payments/settle.ts'

/**
 * Where Stripe tells us a payment happened.
 *
 * `verify_jwt` is off because Stripe does not carry a Supabase token; the
 * signature check in the adapter is the authentication, and it runs before
 * anything is read out of the payload. An unsigned request never reaches the
 * database.
 *
 * Every branch answers 200 once the event has been understood, including the
 * ones we choose not to act on. A non-2xx tells Stripe to redeliver, and
 * redelivering an event we have already handled correctly is noise, not safety
 * - `snd_confirm_booking_payment` is idempotent for the case that matters.
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

  if (!event.token) {
    // A live Stripe account may be taking payments that are nothing to do with
    // us. Accept the delivery, do nothing, and say so in the logs.
    console.warn('stripe-webhook: no snd_token on', event.type)
    return jsonResponse({ received: true, handled: false, reason: 'no token' }, 200, corsHeaders)
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('stripe-webhook: admin client', error)
    // This one is worth a retry: the event was fine, we were not.
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
  }

  if (event.kind === 'paid') {
    const outcome = await settlePayment(admin, event.token, event.providerReference)

    // 409/410 mean the link was already settled or had run out - both are
    // final answers about this event, not reasons to hear it again.
    if (!outcome.ok && outcome.status === 500) {
      return jsonResponse({ error: outcome.code }, 500, corsHeaders)
    }

    if (!outcome.ok) {
      console.warn('stripe-webhook: paid event not settled', outcome.code, event.token)
    }

    return jsonResponse(
      { received: true, handled: outcome.ok, code: outcome.code },
      200,
      corsHeaders
    )
  }

  const outcome = await failPayment(admin, event.token, event.reason, event.providerReference)
  if (!outcome.ok && outcome.status === 500) {
    return jsonResponse({ error: outcome.code }, 500, corsHeaders)
  }

  return jsonResponse({ received: true, handled: outcome.ok, kind: event.kind }, 200, corsHeaders)
})
