'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { searchKeys, searchService } from '@/lib/search'
import type { SearchCenterSource, SearchParams } from '@/types/search'

/**
 * React Query hands the query function an AbortSignal and aborts it when the
 * key changes, which is exactly the "new query cancels the one still running"
 * rule from doc 03 §12 — no manual controller needed.
 */
export function useSearchResults(
  params: SearchParams,
  centerSource: SearchCenterSource,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: searchKeys.results(params),
    queryFn: ({ signal }) => searchService.searchListings(params, centerSource, signal),
    enabled: options.enabled ?? true,
    // Changing a filter should dim the old results, not blank the page.
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

/**
 * Pins are fetched separately and keyed without `page`, so walking through the
 * list never redraws the map (doc 03 §9.4).
 */
export function useSearchPins(
  params: SearchParams,
  centerSource: SearchCenterSource,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: searchKeys.pins(params),
    queryFn: ({ signal }) => searchService.searchPins(params, centerSource, signal),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

/**
 * Just the total, for the mobile modal's "Pretraži (147)" button — it updates
 * while the user is still editing, so it asks for a single row rather than a
 * page of results (doc 03 §5.3).
 */
export function useSearchCount(params: SearchParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: searchKeys.count(params),
    queryFn: ({ signal }) =>
      searchService.searchListings({ ...params, page: 1 }, undefined, signal),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    select: (response) => response.meta.total,
  })
}

/** The "Možda te zanima" strip shown under every empty result (doc 03 §10). */
export function useSuggestedListings(
  lat: number | null,
  lng: number | null,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: searchKeys.suggested(lat, lng),
    queryFn: ({ signal }) => searchService.suggestedListings({ lat, lng }, signal),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    select: (response) => response.data,
  })
}
