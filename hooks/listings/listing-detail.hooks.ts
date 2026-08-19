'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

import { listingKeys } from '@/lib/listings'
import { ApiError } from '@/lib/search'
import type { ListingQuote } from '@/types/listing-detail'
import type { ApiErrorBody, SearchResultListing } from '@/types/search'

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      payload?.error ?? { code: 'UNKNOWN', message: 'Nešto je krenulo naopako.' }
    )
  }

  return (await response.json()) as T
}

export const listingDetailKeys = {
  quote: (listingId: string, from: string | null, to: string | null) =>
    [...listingKeys.all, 'quote', listingId, from, to] as const,
  similar: (listingId: string) => [...listingKeys.all, 'similar', listingId] as const,
}

/**
 * The sum in the booking card (doc 04 §13.2).
 *
 * Runs only once both dates are set, and the server is the only place the
 * numbers come from — nothing here recomputes a total locally while waiting.
 */
export function useListingQuote(listingId: string, from: string | null, to: string | null) {
  return useQuery({
    queryKey: listingDetailKeys.quote(listingId, from, to),
    enabled: Boolean(from && to),
    queryFn: ({ signal }) =>
      postJson<ListingQuote>(
        `/api/v1/listings/${listingId}/quote`,
        { start_date: from, end_date: to },
        signal
      ),
    // Prices do not move while somebody is looking at them, and re-quoting on
    // every window focus would make the total flicker mid-decision.
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status >= 400 && error.status < 500
        ? false
        : failureCount < 2,
  })
}

export function useSimilarListings(listingId: string, limit = 4) {
  return useQuery({
    queryKey: listingDetailKeys.similar(listingId),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/v1/listings/${listingId}/similar?limit=${limit}`, {
        signal,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('similar failed')
      return (await response.json()) as { data: SearchResultListing[] }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Records the visit once per mount (doc 04 §14).
 *
 * Fire-and-forget on purpose: the count is a nice-to-have and must never delay
 * paint or surface an error. `keepalive` lets it survive a reader who leaves
 * immediately, which is exactly the visit worth counting.
 */
export function useRecordListingView(listingId: string) {
  useEffect(() => {
    if (!listingId) return

    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/listings/${listingId}/view`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => undefined)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [listingId])
}
