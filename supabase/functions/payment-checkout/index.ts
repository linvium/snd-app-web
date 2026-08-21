import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { createAdminClient, appUrl } from '../_shared/email.ts'
import { resolveProvider } from '../_shared/payments/index.ts'

/**
 * Opens a checkout for a payment link and hands back somewhere to send the
 * renter.
 *
 * Only the renter who owes the money may start one - the token alone is enough
 * to *see* a link, because it arrives by email, but not to put a charge in
 * motion against somebody else's reservation.
 *
 * The session id is recorded on the link before the URL is returned, so a
 * webhook that arrives before the browser does still has something to match.
 */

/**
 * Config problems, as opposed to a provider having a bad minute.
 *
 * An unset key never reaches the provider; a wrong one comes back as an
 * authentication error. Both mean somebody has to fix a secret before any
 * payment on this deployment can succeed.
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

/**
 * Card networks have a floor - Stripe's is about $0.50 equivalent - and a
 * booking cheaper than that cannot be taken by card at all.
 */
function isAmountTooSmall(error: unknown, message: string): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'amount_too_small' || message.includes('must convert to at least')
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

  const { data: link, error: linkError } = await admin
    .from('booking_payment_links')
    .select(
      'id, token, amount_minor, currency, status, expires_at, provider, provider_session_id, provider_checkout_url, bookings!inner(id, reference, renter_id, listing_id)'
    )
    .eq('token', token)
    .maybeSingle()

  if (linkError) {
    console.error('payment-checkout: link lookup', linkError)
    return jsonResponse({ error: 'lookup failed' }, 500, corsHeaders)
  }

  const row = link as unknown as
    | {
        token: string
        amount_minor: number
        currency: string
        status: string
        expires_at: string
        provider: string | null
        provider_checkout_url: string | null
        bookings: {
          id: string
          reference: string | null
          renter_id: string
          listing_id: string
        }
      }
    | null

  if (!row) {
    return jsonResponse({ error: 'NOT_FOUND' }, 404, corsHeaders)
  }

  if (row.bookings.renter_id !== user.id) {
    return jsonResponse({ error: 'FORBIDDEN' }, 403, corsHeaders)
  }

  if (row.status === 'paid') {
    return jsonResponse({ error: 'ALREADY_PAID' }, 409, corsHeaders)
  }

  if (row.status !== 'pending' || new Date(row.expires_at) <= new Date()) {
    return jsonResponse({ error: 'EXPIRED' }, 410, corsHeaders)
  }

  const { data: listing } = await admin
    .from('listings')
    .select('title')
    .eq('id', row.bookings.listing_id)
    .maybeSingle()

  const base = appUrl()
  const provider = resolveProvider(row.provider)

  let session
  try {
    session = await provider.createCheckout({
      token: row.token,
      amountMinor: row.amount_minor,
      currency: row.currency,
      listingTitle: (listing?.title as string | undefined) ?? 'Rezervacija',
      bookingReference: row.bookings.reference,
      renterEmail: user.email ?? null,
      successUrl: `${base}/pay/${row.token}?status=success`,
      cancelUrl: `${base}/pay/${row.token}?status=cancelled`,
      expiresAt: new Date(row.expires_at),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'checkout failed'

    // Too little of the link's life left for the provider's minimum session.
    if (message.includes('LINK_EXPIRING')) {
      return jsonResponse({ error: 'EXPIRED' }, 410, corsHeaders)
    }

    // Under the provider's floor for a card charge. A property of this booking's
    // total, not a bad moment - the renter retrying changes nothing.
    if (isAmountTooSmall(error, message)) {
      console.error('payment-checkout: amount below provider minimum -', message)
      return jsonResponse({ error: 'AMOUNT_TOO_SMALL' }, 422, corsHeaders)
    }

    // A missing key and a rejected key are the same fact to the renter:
    // payments are not configured. Neither is worth a retry, so neither gets
    // the "try again" of a 502. The log line names which one it was.
    if (isMisconfigured(error, message)) {
      console.error('payment-checkout: provider not configured -', message)
      return jsonResponse({ error: 'PAYMENTS_UNAVAILABLE' }, 503, corsHeaders)
    }

    console.error('payment-checkout: provider error', error)
    return jsonResponse({ error: 'PROVIDER_ERROR', detail: message }, 502, corsHeaders)
  }

  const { error: recordError } = await admin.rpc('snd_start_payment_checkout', {
    p_token: row.token,
    p_provider: provider.name,
    p_session_id: session.sessionId,
    p_checkout_url: session.url,
  })

  if (recordError) {
    // The session exists at the provider but we could not write it down. Better
    // to fail loudly than to send the renter to a charge we cannot reconcile.
    console.error('payment-checkout: could not record session', recordError)
    return jsonResponse({ error: 'INTERNAL' }, 500, corsHeaders)
  }

  return jsonResponse({ data: { url: session.url, provider: provider.name } }, 200, corsHeaders)
})
