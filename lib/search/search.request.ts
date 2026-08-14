import { parseSearchParams } from '@/lib/search/search.params'
import type { SearchCenterSource, SearchParams } from '@/types/search'

const CENTER_SOURCES: SearchCenterSource[] = ['user_gps', 'user_profile', 'city_center', 'none']

export interface ParsedSearchRequest {
  params: SearchParams
  centerSource: SearchCenterSource
  /** Arguments for snd_filter_listings, already converted to database units. */
  rpcArgs: {
    p_query: string | null
    p_category_slug: string | null
    p_lat: number | null
    p_lng: number | null
    p_radius_km: number | null
    p_price_min_minor: number | null
    p_price_max_minor: number | null
    p_date_from: string | null
    p_date_to: string | null
  }
}

/**
 * Turns a request URL into the arguments the search functions take.
 *
 * The one conversion that matters: prices arrive in dinars because that is
 * what the user typed, and leave in para because that is what the column
 * holds (doc 00 §2.2, doc 03 §7.1 step 4).
 */
export function parseSearchRequest(url: URL): ParsedSearchRequest {
  const params = parseSearchParams(url.searchParams)

  const rawSource = url.searchParams.get('center_source')
  const claimedSource = CENTER_SOURCES.includes(rawSource as SearchCenterSource)
    ? (rawSource as SearchCenterSource)
    : null

  const hasCenter = params.lat !== null && params.lng !== null
  const centerSource: SearchCenterSource = hasCenter ? (claimedSource ?? 'city_center') : 'none'

  return {
    params,
    centerSource,
    rpcArgs: {
      p_query: params.q,
      p_category_slug: params.category,
      p_lat: params.lat,
      p_lng: params.lng,
      // Without a centre there is nothing to measure a radius from, so it is
      // dropped rather than applied against a null point.
      p_radius_km: hasCenter ? params.radiusKm : null,
      p_price_min_minor: params.priceMin === null ? null : params.priceMin * 100,
      p_price_max_minor: params.priceMax === null ? null : params.priceMax * 100,
      p_date_from: params.from,
      p_date_to: params.to,
    },
  }
}

export function appliedFilters(params: SearchParams): Record<string, string | number> {
  const applied: Record<string, string | number> = {}
  if (params.q) applied.q = params.q
  if (params.category) applied.category = params.category
  if (params.priceMin !== null) applied.price_min = params.priceMin
  if (params.priceMax !== null) applied.price_max = params.priceMax
  if (params.from) applied.from = params.from
  if (params.to) applied.to = params.to
  if (params.lat !== null && params.lng !== null) applied.radius = params.radiusKm
  applied.sort = params.sort
  return applied
}
