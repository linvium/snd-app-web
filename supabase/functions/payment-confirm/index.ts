import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/email.ts'
import { settleOrder } from '../_shared/payments/settle.ts'

/**
 * Settles a billing order without a provider adapter.
 *
 * Stripe settles through `stripe-webhook`; this is the door for everything
 * else. Two callers:
 *
 *   1. A PSP with no adapter yet, holding PSP_WEBHOOK_SECRET in
 *      `x-psp-signature`.
 *   2. The owner's own browser, while PAYMENT_MANUAL_CONFIRM is on - the
 *      sandbox path that lets plans and credits be exercised end to end
 *      without money. Leaving that flag unset closes it, which is the correct
 *      state for any environment where Stripe is configured.
 *
 * Both land in `settleOrder`, so the rules about double payment are the same
 * ones the Stripe webhook obeys.
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
    // this door, which is a different answer from "this order is not yours".
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

    // Only the owner who placed the order may say it was paid.
    const { data: order, error: orderError } = await admin
      .from('billing_orders')
      .select('id, user_id')
      .eq('token', token)
      .maybeSingle()

    if (orderError) {
      console.error('payment-confirm: order lookup', orderError)
      return jsonResponse({ error: 'lookup failed' }, 500, corsHeaders)
    }

    if (!order || (order as { user_id?: string }).user_id !== user.id) {
      return jsonResponse({ error: 'forbidden' }, 403, corsHeaders)
    }
  }

  const outcome = await settleOrder(admin, {
    token,
    providerReference: body.providerReference ?? null,
    subscriptionId: null,
    periodEnd: null,
  })

  if (!outcome.ok) {
    return jsonResponse({ error: outcome.code }, outcome.status, corsHeaders)
  }

  return jsonResponse({ data: outcome.data }, 200, corsHeaders)
})
