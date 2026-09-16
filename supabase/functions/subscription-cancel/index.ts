import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/email.ts'
import { resolveProvider } from '../_shared/payments/index.ts'
import { mapRpcError } from '../_shared/payments/settle.ts'

/**
 * Stops the caller's subscription from renewing.
 *
 * The owner keeps what they paid for: the plan stays current until the end of
 * the period, and only then are listings above the limit paused. The provider
 * is told first - if it cannot be reached, nothing is marked here, because a
 * plan that reads "cancelled" on SND while the card keeps being charged is the
 * worst of both.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !authHeader) {
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

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('subscription-cancel: admin client', error)
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
  }

  const { data: subscription, error: lookupError } = await admin
    .from('user_subscriptions')
    .select('id, provider, provider_subscription_id, cancel_at_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    console.error('subscription-cancel: lookup', lookupError)
    return jsonResponse({ error: 'lookup failed' }, 500, corsHeaders)
  }

  if (!subscription) {
    return jsonResponse({ error: 'NOT_FOUND' }, 404, corsHeaders)
  }

  const row = subscription as {
    provider: string | null
    provider_subscription_id: string | null
    cancel_at_period_end: boolean
  }

  // A sandbox plan has no provider subscription: there is nothing to stop.
  if (row.provider_subscription_id && !row.cancel_at_period_end) {
    try {
      await resolveProvider(row.provider).cancelSubscription(row.provider_subscription_id)
    } catch (error) {
      console.error('subscription-cancel: provider refused', error)
      return jsonResponse({ error: 'PAYMENTS_UNAVAILABLE' }, 503, corsHeaders)
    }
  }

  const { data, error: rpcError } = await admin.rpc('snd_schedule_subscription_cancel', {
    p_user_id: user.id,
  })

  if (rpcError) {
    const mapped = mapRpcError(rpcError.message ?? '')
    if (mapped.status === 500) console.error('subscription-cancel: rpc failed', rpcError)
    return jsonResponse({ error: mapped.code }, mapped.status, corsHeaders)
  }

  return jsonResponse({ data }, 200, corsHeaders)
})
