'use client'

import { useMutation, useQuery } from '@tanstack/react-query'

import { reviewKeys, reviewsService } from '@/lib/reviews'
import { REVIEW_PAGE_SIZE, type ReviewReportReason, type ReviewScope } from '@/types/listing-detail'

/**
 * The rest of the reviews (doc 04 §11.2).
 *
 * The first six are rendered on the server with the page; this loads the full
 * list behind "Prikaži svih N recenzija", and the owner's other items.
 */
export function useListingReviews(
  listingId: string,
  scope: ReviewScope,
  options: { enabled?: boolean; limit?: number } = {}
) {
  const limit = options.limit ?? REVIEW_PAGE_SIZE * 5

  return useQuery({
    queryKey: [...reviewKeys.list(listingId, scope), limit],
    enabled: options.enabled ?? true,
    queryFn: () => reviewsService.list(listingId, scope, 1, limit),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportReview() {
  return useMutation({
    mutationFn: ({
      reviewId,
      reason,
      details,
    }: {
      reviewId: string
      reason: ReviewReportReason
      details: string
    }) => reviewsService.report(reviewId, reason, details),
  })
}
