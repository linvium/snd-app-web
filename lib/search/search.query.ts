import { buildSearchQuery } from '@/lib/search/search.params'
import type { SearchParams } from '@/types/search'

/**
 * Cache keys mirror the URL, so two searches that look the same to the user
 * share a cache entry and a filter change that alters nothing refetches
 * nothing.
 */
export const searchKeys = {
  all: ['search'] as const,
  results: (params: SearchParams) =>
    [...searchKeys.all, 'results', buildSearchQuery(params).toString()] as const,
  // Paging must not redraw the map, so the pin key deliberately drops `page`.
  pins: (params: SearchParams) =>
    [
      ...searchKeys.all,
      'pins',
      buildSearchQuery({ ...params, page: 1 }).toString(),
    ] as const,
  count: (params: SearchParams) =>
    [...searchKeys.all, 'count', buildSearchQuery({ ...params, page: 1 }).toString()] as const,
  suggested: (lat: number | null, lng: number | null) =>
    [...searchKeys.all, 'suggested', lat, lng] as const,
}
