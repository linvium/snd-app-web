import { ApiError } from '@/lib/search/search.service'
import type {
  BillingCatalog,
  BillingCheckoutResponse,
  BillingOrder,
  BillingSummary,
  CancelSubscriptionResponse,
  ConfirmBillingOrderResponse,
  CreateBillingOrderInput,
} from '@/types/billing'
import type { ApiErrorBody } from '@/types/search'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Nešto je krenulo naopako. Pokušaj ponovo.' }
    )
  }
  return (await response.json()) as T
}

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' }

export const billingService = {
  catalog: async (signal?: AbortSignal): Promise<BillingCatalog> => {
    const response = await fetch('/api/v1/billing/catalog', {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: BillingCatalog }>(response)
    return payload.data
  },

  summary: async (signal?: AbortSignal): Promise<BillingSummary> => {
    const response = await fetch('/api/v1/billing/summary', {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: BillingSummary }>(response)
    return payload.data
  },

  startCheckout: async (input: CreateBillingOrderInput): Promise<BillingCheckoutResponse> => {
    const response = await fetch('/api/v1/billing/orders', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ kind: input.kind, itemKey: input.itemKey }),
    })
    const payload = await parseJson<{ data: BillingCheckoutResponse }>(response)
    return payload.data
  },

  order: async (token: string): Promise<BillingOrder> => {
    const response = await fetch(`/api/v1/billing/orders/${token}`, {
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: BillingOrder }>(response)
    return payload.data
  },

  confirmOrder: async (token: string): Promise<ConfirmBillingOrderResponse> => {
    const response = await fetch(`/api/v1/billing/orders/${token}/confirm`, {
      method: 'POST',
      headers: JSON_HEADERS,
    })
    const payload = await parseJson<{ data: ConfirmBillingOrderResponse }>(response)
    return payload.data
  },

  cancelSubscription: async (): Promise<CancelSubscriptionResponse> => {
    const response = await fetch('/api/v1/billing/subscription/cancel', {
      method: 'POST',
      headers: JSON_HEADERS,
    })
    const payload = await parseJson<{ data: CancelSubscriptionResponse }>(response)
    return payload.data
  },
}
