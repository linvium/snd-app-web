import { ApiError } from '@/lib/search/search.service'
import type { ApiErrorBody } from '@/types/search'
import type {
  ConfirmPaymentResponse,
  CreateBookingRequestInput,
  CreateBookingRequestResponse,
  PaymentLinkSummary,
  RespondToBookingInput,
  RespondToBookingResponse,
  StartCheckoutResponse,
  SubmitBookingReviewInput,
  SubmitBookingReviewResponse,
} from '@/types/booking'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Zahtev nije poslat. Pokušaj ponovo.' }
    )
  }
  return (await response.json()) as T
}

export const bookingsService = {
  createRequest: async (input: CreateBookingRequestInput): Promise<CreateBookingRequestResponse> => {
    const response = await fetch('/api/v1/bookings', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: input.listingId,
        body: input.body,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
      }),
    })
    const payload = await parseJson<{ data: CreateBookingRequestResponse }>(response)
    return payload.data
  },

  respond: async (input: RespondToBookingInput): Promise<RespondToBookingResponse> => {
    const response = await fetch(`/api/v1/bookings/${input.bookingId}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: input.action,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
      }),
    })
    const payload = await parseJson<{ data: RespondToBookingResponse }>(response)
    return payload.data
  },

  review: async (input: SubmitBookingReviewInput): Promise<SubmitBookingReviewResponse> => {
    const response = await fetch(`/api/v1/bookings/${input.bookingId}/review`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: input.rating, comment: input.comment ?? null }),
    })
    const payload = await parseJson<{ data: SubmitBookingReviewResponse }>(response)
    return payload.data
  },

  paymentLink: async (token: string): Promise<PaymentLinkSummary> => {
    const response = await fetch(`/api/v1/payments/${token}`, {
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: PaymentLinkSummary }>(response)
    return payload.data
  },

  startCheckout: async (token: string): Promise<StartCheckoutResponse> => {
    const response = await fetch(`/api/v1/payments/${token}/checkout`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    })
    const payload = await parseJson<{ data: StartCheckoutResponse }>(response)
    return payload.data
  },

  confirmPayment: async (token: string): Promise<ConfirmPaymentResponse> => {
    const response = await fetch(`/api/v1/payments/${token}/confirm`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    })
    const payload = await parseJson<{ data: ConfirmPaymentResponse }>(response)
    return payload.data
  },
}
