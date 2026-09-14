import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient, appUrl } from '../_shared/email.ts'
import { resolveProvider } from '../_shared/payments/index.ts'

/**
 * Opens a checkout for a billing order - a subscription plan or a credit pack -
 * and hands back somewhere to send the owner.
 *
 * Only the owner who created the order may start one: the token travels
 * through URLs and the provider, and holding it must not be enough to put a
 * charge in motion on somebody else's account.
 *
 * The session id is recorded on the order before the URL is returned, so a
 * webhook that arrives before the browser does still has something to match.
 */

/**
 * Config problems, as opposed to a provider having a bad minute.
 *
 * An unset key never reaches the provider; a wrong one comes back as an
 * authentication error. Both mean somebody has to fix a secret before any
 * purchase on this deployment can succeed.
 */
function isMisconfigured(error: unknown, message: string): boolean {
  const type = (error as { type?: string } | null)?.type
  const status = (error as { statusCode?: number } | null)?.statusCode
  return (
    message.includes('is not set') ||
    type === 'StripeAuthenticationError' ||
    type === 'StripePermissionError' ||
    status === 401 ||
    status === 403
  )
}

/** Card networks have a floor - Stripe's is about $0.50 equivalent. */
function isAmountTooSmall(error: unknown, message: string): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'amount_too_small' || message.includes('must convert to at least')
}

type OrderRow = {
  token: string
  user_id: string
  kind: 'subscription' | 'credits'
  amount_minor: number
  currency: string
  credits: number | null
  status: string
  expires_at: string
  provider: string | null
  billing_plans: { name: string; listing_limit: number; interval_months: number } | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders)
  }

  let body: { token?: string }
  try {
    body = (await req.json()) as { token?: string }
  } catch {
    return jsonResponse({ error: 'invalid body' }, 422, corsHeaders)
  }

  const token = body.token?.trim()
  if (!token) {
    return jsonResponse({ error: 'token is required' }, 422, corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !authHeader) {
    return jsonResponse({ error: 'unauthenticated' }, 401, corsHeaders)
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('payment-checkout: admin client', error)
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
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

  const { data: order, error: orderError } = await admin
    .from('billing_orders')
    .select(
      'token, user_id, kind, amount_minor, currency, credits, status, expires_at, provider, billing_plans(name, listing_limit, interval_months)'
    )
    .eq('token', token)
    .maybeSingle()

  if (orderError) {
    console.error('payment-checkout: order lookup', orderError)
    return jsonResponse({ error: 'lookup failed' }, 500, corsHeaders)
  }

  const row = order as unknown as OrderRow | null

  if (!row) {
    return jsonResponse({ error: 'NOT_FOUND' }, 404, corsHeaders)
  }

  if (row.user_id !== user.id) {
    return jsonResponse({ error: 'FORBIDDEN' }, 403, corsHeaders)
  }

  if (row.status === 'paid') {
    return jsonResponse({ error: 'ALREADY_PAID' }, 409, corsHeaders)
  }

  if (row.status !== 'pending' || new Date(row.expires_at) <= new Date()) {
    return jsonResponse({ error: 'EXPIRED' }, 410, corsHeaders)
  }

  const base = appUrl()
  const provider = resolveProvider(row.provider)
  const plan = row.billing_plans
  const isSubscription = row.kind === 'subscription'

  let session
  try {
    session = await provider.createCheckout({
      token: row.token,
      mode: isSubscription ? 'subscription' : 'payment',
      amountMinor: row.amount_minor,
      currency: row.currency,
      productName: isSubscription
        ? `SND pretplata ${plan?.name ?? ''}`.trim()
        : `${row.credits ?? 0} kredita za oglase`,
      productDescription: isSubscription
        ? `Do ${plan?.listing_limit ?? 0} objavljenih oglasa u isto vreme`
        : 'Jedan kredit je jedan objavljen oglas',
      customerEmail: user.email ?? null,
      intervalMonths: plan?.interval_months ?? 1,
      successUrl: `${base}/profile/billing?order=${row.token}&status=success`,
      cancelUrl: `${base}/profile/billing?order=${row.token}&status=cancelled`,
      expiresAt: new Date(row.expires_at),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'checkout failed'

    // Too little of the order's life left for the provider's minimum session.
    if (message.includes('ORDER_EXPIRING')) {
      return jsonResponse({ error: 'EXPIRED' }, 410, corsHeaders)
    }

    if (isAmountTooSmall(error, message)) {
      console.error('payment-checkout: amount below provider minimum -', message)
      return jsonResponse({ error: 'AMOUNT_TOO_SMALL' }, 422, corsHeaders)
    }

    // A missing key and a rejected key are the same fact to the owner:
    // payments are not configured. Neither is worth a retry.
    if (isMisconfigured(error, message)) {
      console.error('payment-checkout: provider not configured -', message)
      return jsonResponse({ error: 'PAYMENTS_UNAVAILABLE' }, 503, corsHeaders)
    }

    console.error('payment-checkout: provider error', error)
    return jsonResponse({ error: 'PROVIDER_ERROR', detail: message }, 502, corsHeaders)
  }

  const { error: recordError } = await admin.rpc('snd_start_billing_checkout', {
    p_token: row.token,
    p_provider: provider.name,
    p_session_id: session.sessionId,
    p_checkout_url: session.url,
  })

  if (recordError) {
    // The session exists at the provider but we could not write it down. Better
    // to fail loudly than to send the owner to a charge we cannot reconcile.
    console.error('payment-checkout: could not record session', recordError)
    return jsonResponse({ error: 'INTERNAL' }, 500, corsHeaders)
  }

  return jsonResponse({ data: { url: session.url, provider: provider.name } }, 200, corsHeaders)
})
