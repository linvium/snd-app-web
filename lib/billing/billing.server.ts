import type { SupabaseClient } from '@supabase/supabase-js'

import { apiError, ERROR_CODES } from '@/lib/api/response'
import { BILLING_PATH } from '@/lib/billing/billing.helpers'
import type {
  BillingCatalog,
  BillingCheckoutResponse,
  BillingOrder,
  BillingPlan,
  BillingSummary,
  CancelSubscriptionResponse,
  ConfirmBillingOrderResponse,
  CreateBillingOrderInput,
  CreditPack,
} from '@/types/billing'

type ErrorResult = { response: ReturnType<typeof apiError> }
type RpcError = { message?: string }

function invokeStatus(error: unknown): number | undefined {
  return (error as { context?: { status?: number } }).context?.status
}

/**
 * The price list. Readable by anyone, so the public page can render it from a
 * session-less client and cache it.
 */
export async function loadBillingCatalog(supabase: SupabaseClient): Promise<BillingCatalog> {
  const [{ data: plans, error: plansError }, { data: packs, error: packsError }] = await Promise.all([
    supabase
      .from('billing_plans')
      .select('key, name, description, listing_limit, price_minor, currency, interval_months, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('credit_packs')
      .select('key, name, credits, price_minor, currency, sort_order')
      .eq('is_active', true)
      .order('credits', { ascending: true }),
  ])

  if (plansError) console.error('[billing] plans failed', plansError)
  if (packsError) console.error('[billing] packs failed', packsError)

  return {
    plans: ((plans ?? []) as BillingPlan[]).map((plan) => ({
      ...plan,
      listing_limit: Number(plan.listing_limit),
      price_minor: Number(plan.price_minor),
      interval_months: Number(plan.interval_months),
    })),
    packs: ((packs ?? []) as CreditPack[]).map((pack) => ({
      ...pack,
      credits: Number(pack.credits),
      price_minor: Number(pack.price_minor),
    })),
  }
}

export async function getBillingSummary(
  supabase: SupabaseClient
): Promise<BillingSummary | ErrorResult> {
  const { data, error } = await supabase.rpc('snd_billing_summary')

  if (error) {
    if ((error.message ?? '').includes('UNAUTHENTICATED')) {
      return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
    }
    console.error('[billing] summary failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  return data as BillingSummary
}

function orderRpcError(error: RpcError): ReturnType<typeof apiError> {
  const message = error.message ?? ''
  if (message.includes('UNAUTHENTICATED')) {
    return apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.')
  }
  if (message.includes('SUBSCRIPTION_ACTIVE')) {
    return apiError(
      409,
      ERROR_CODES.CONFLICT,
      'Već imaš aktivnu pretplatu. Drugi paket možeš da izabereš kada ona istekne.'
    )
  }
  if (message.includes('NOT_FOUND')) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Paket nije pronađen.')
  }
  if (message.includes('VALIDATION_FAILED')) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Izaberi paket.')
  }
  console.error('[billing] create order failed', error)
  return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
}

function checkoutError(status: number | undefined, error: unknown): ReturnType<typeof apiError> {
  switch (status) {
    case 401:
      return apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.')
    case 403:
      return apiError(403, ERROR_CODES.FORBIDDEN, 'Ova porudžbina nije tvoja.')
    case 404:
      return apiError(404, ERROR_CODES.NOT_FOUND, 'Porudžbina ne postoji.')
    case 409:
      return apiError(409, ERROR_CODES.CONFLICT, 'Porudžbina je već plaćena.')
    case 410:
      return apiError(409, ERROR_CODES.CONFLICT, 'Porudžbina je istekla. Izaberi paket ponovo.')
    case 422:
      return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Iznos je premali za plaćanje karticom.')
    case 503:
      return apiError(503, ERROR_CODES.INTERNAL, 'Plaćanje trenutno nije dostupno. Javi se podršci.')
    default:
      console.error('[billing] checkout failed', error)
      return apiError(502, ERROR_CODES.INTERNAL, 'Plaćanje nije moglo da se otvori. Pokušaj ponovo.')
  }
}

/**
 * Starts a purchase: writes the order, then opens the provider's checkout for
 * it. The order comes first so the token the provider carries back always
 * points at a row that exists.
 *
 * In sandbox mode there is no provider: the owner is sent back to the billing
 * page, which offers to mark the order as paid.
 */
export async function createBillingCheckout(
  supabase: SupabaseClient,
  input: CreateBillingOrderInput,
  options: { manualConfirm: boolean }
): Promise<BillingCheckoutResponse | ErrorResult> {
  const { data, error } = await supabase.rpc('snd_create_billing_order', {
    p_kind: input.kind,
    p_item_key: input.itemKey,
  })

  if (error) return { response: orderRpcError(error) }

  const order = data as BillingOrder

  if (options.manualConfirm) {
    return { token: order.token, url: `${BILLING_PATH}?order=${order.token}`, provider: 'manual' }
  }

  const { data: checkout, error: invokeError } = await supabase.functions.invoke('payment-checkout', {
    body: { token: order.token },
  })

  if (invokeError) {
    return { response: checkoutError(invokeStatus(invokeError), invokeError) }
  }

  const payload = (checkout as { data?: { url?: string; provider?: string } } | null)?.data
  if (!payload?.url) {
    return {
      response: apiError(502, ERROR_CODES.INTERNAL, 'Plaćanje nije moglo da se otvori. Pokušaj ponovo.'),
    }
  }

  return { token: order.token, url: payload.url, provider: payload.provider ?? 'stripe' }
}

export async function getBillingOrder(
  supabase: SupabaseClient,
  token: string
): Promise<BillingOrder | null | ErrorResult> {
  const { data, error } = await supabase.rpc('snd_billing_order_summary', { p_token: token })

  if (error) {
    if ((error.message ?? '').includes('UNAUTHENTICATED')) {
      return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
    }
    console.error('[billing] order lookup failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  return (data as BillingOrder | null) ?? null
}

export async function confirmBillingOrder(
  supabase: SupabaseClient,
  token: string
): Promise<ConfirmBillingOrderResponse | ErrorResult> {
  const { data, error } = await supabase.functions.invoke('payment-confirm', { body: { token } })

  if (error) {
    switch (invokeStatus(error)) {
      case 401:
        return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
      case 403:
        return { response: apiError(403, ERROR_CODES.FORBIDDEN, 'Ova porudžbina nije tvoja.') }
      case 404:
        return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Porudžbina ne postoji.') }
      case 409:
        return { response: apiError(409, ERROR_CODES.CONFLICT, 'Porudžbina je već plaćena ili otkazana.') }
      case 503:
        return {
          response: apiError(503, ERROR_CODES.INTERNAL, 'Ručna potvrda uplate nije uključena na serveru.'),
        }
      default:
        console.error('[billing] confirm failed', error)
        return { response: apiError(500, ERROR_CODES.INTERNAL, 'Uplata nije potvrđena. Pokušaj ponovo.') }
    }
  }

  const payload = (data as { data?: { already_paid?: boolean } } | null)?.data
  return { token, alreadyPaid: Boolean(payload?.already_paid) }
}

export async function cancelSubscription(
  supabase: SupabaseClient
): Promise<CancelSubscriptionResponse | ErrorResult> {
  const { data, error } = await supabase.functions.invoke('subscription-cancel', { body: {} })

  if (error) {
    switch (invokeStatus(error)) {
      case 401:
        return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
      case 404:
        return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Nemaš aktivnu pretplatu.') }
      case 503:
        return {
          response: apiError(503, ERROR_CODES.INTERNAL, 'Otkazivanje trenutno nije dostupno. Javi se podršci.'),
        }
      default:
        console.error('[billing] cancel failed', error)
        return { response: apiError(502, ERROR_CODES.INTERNAL, 'Pretplata nije otkazana. Pokušaj ponovo.') }
    }
  }

  const payload = (data as { data?: { current_period_end?: string | null } } | null)?.data
  return { currentPeriodEnd: payload?.current_period_end ?? null }
}
