import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/email.ts'
import { settlePayment } from '../_shared/payments/settle.ts'

/**
 * Settles a payment link without a provider adapter.
 *
 * Stripe settles through `stripe-webhook`; this is the door for everything
 * else. Two callers:
 *
 *   1. A PSP with no adapter yet, holding PSP_WEBHOOK_SECRET in
 *      `x-psp-signature`.
 *   2. The renter's own browser, while PAYMENT_MANUAL_CONFIRM is on - the
 *      sandbox path that lets the lifecycle be exercised end to end without
 *      money. Leaving that flag unset closes it, which is the correct state for
 *      any environment where Stripe is configured.
 *
 * Both land in `settlePayment`, so the rules about double payment and expiry
 * are the same ones the Stripe webhook obeys.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders)
  }

  let body: { token?: string; providerReference?: string }
  try {
    body = (await req.json()) as { token?: string; providerReference?: string }
  } catch {
    return jsonResponse({ error: 'invalid body' }, 422, corsHeaders)
  }

  const token = body.token?.trim()
  if (!token) {
    return jsonResponse({ error: 'token is required' }, 422, corsHeaders)
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('payment-confirm: admin client', error)
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
  }

  const webhookSecret = Deno.env.get('PSP_WEBHOOK_SECRET')
  const signature = req.headers.get('x-psp-signature')
  const fromProvider = Boolean(webhookSecret && signature && signature === webhookSecret)

  if (!fromProvider) {
    // No sandbox flag and no adapter secret: there is no way to pay through
    // this door, which is a different answer from "this link is not yours".
    if (Deno.env.get('PAYMENT_MANUAL_CONFIRM') !== 'true') {
      return jsonResponse({ error: 'PAYMENTS_UNAVAILABLE' }, 503, corsHeaders)
    }

    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!authHeader || !supabaseUrl || !anonKey) {
      return jsonResponse({ error: 'unauthenticated' }, 401, corsHeaders)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'unauthenticated' }, 401, corsHeaders)
    }

    // Only the person who owes the money may say it was paid.
    const { data: link, error: linkError } = await admin
      .from('booking_payment_links')
      .select('id, bookings!inner(renter_id)')
      .eq('token', token)
      .maybeSingle()

    if (linkError) {
      console.error('payment-confirm: link lookup', linkError)
      return jsonResponse({ error: 'lookup failed' }, 500, corsHeaders)
    }

    const renterId = (link as { bookings?: { renter_id?: string } } | null)?.bookings?.renter_id
    if (!link || renterId !== user.id) {
      return jsonResponse({ error: 'forbidden' }, 403, corsHeaders)
    }
  }

  const outcome = await settlePayment(admin, token, body.providerReference ?? null)
  if (!outcome.ok) {
    return jsonResponse({ error: outcome.code }, outcome.status, corsHeaders)
  }

  return jsonResponse({ data: outcome.data }, 200, corsHeaders)
})
