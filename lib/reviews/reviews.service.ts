import { ApiError } from '@/lib/search'
import type { ListingReview, ReviewReportReason, ReviewScope } from '@/types/listing-detail'
import type { ApiErrorBody } from '@/types/search'

interface ReviewListResponse {
  data: ListingReview[]
  meta: { page: number; limit: number; total: number; total_pages: number }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Nešto je krenulo naopako.' }
    )
  }

  return (await response.json()) as T
}

export const reviewsService = {
  list: (
    listingId: string,
    scope: ReviewScope,
    page: number,
    limit: number
  ): Promise<ReviewListResponse> =>
    request<ReviewListResponse>(
      `/api/v1/listings/${listingId}/reviews?scope=${scope}&page=${page}&limit=${limit}`
    ),

  report: (reviewId: string, reason: ReviewReportReason, details: string): Promise<void> =>
    request<void>(`/api/v1/reviews/${reviewId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }).then(() => undefined),
}
