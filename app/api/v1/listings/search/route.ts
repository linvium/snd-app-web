import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { appliedFilters, parseSearchRequest } from '@/lib/search/search.request'
import { createClient } from '@/lib/supabase/server'
import { SEARCH_PAGE_SIZE, type SearchResultListing } from '@/types/search'

/** Row shape returned by snd_search_listings. */
interface SearchRow {
  id: string
  slug: string
  title: string
  thumbnail_url: string | null
  price_1_day_minor: number
  rating_avg: number | null
  rating_count: number
  distance_m: number | null
  municipality: string | null
  approx_latitude: number
  approx_longitude: number
  is_favorite: boolean
  is_own: boolean
  owner_id: string
  owner_display_name: string
  owner_is_verified: boolean
  total_count: number
}

const MAX_LIMIT = 100

/**
 * GET /api/v1/listings/search — doc 03 §7.5.
 *
 * The filtering itself lives in the database (see snd_filter_listings); this
 * route's job is translating the URL into arguments, shaping the response, and
 * making sure nothing beyond the approximate location leaves the building.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { params, centerSource, rpcArgs } = parseSearchRequest(url)

  const requestedLimit = Number(url.searchParams.get('limit') ?? SEARCH_PAGE_SIZE)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT)
    : SEARCH_PAGE_SIZE

  const supabase = await createClient()

  const runSearch = (fuzzy: boolean) =>
    supabase.rpc('snd_search_listings', {
      ...rpcArgs,
      p_sort: params.sort,
      p_page: params.page,
      p_limit: limit,
      p_fuzzy: fuzzy,
    })

  let { data, error } = await runSearch(false)

  if (error) {
    console.error('[search] snd_search_listings failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  let rows = (data ?? []) as SearchRow[]
  let didYouMean: string | null = null

  // Nothing matched exactly, so try again on similarity and offer the closest
  // title as "da li si mislio…" (doc 03 §7.2).
  if (rows.length === 0 && params.q) {
    const suggestion = await supabase.rpc('snd_search_suggestion', { p_query: params.q })
    if (!suggestion.error && suggestion.data) {
      didYouMean = suggestion.data as string

      const fuzzy = await runSearch(true)
      if (!fuzzy.error) {
        rows = (fuzzy.data ?? []) as SearchRow[]
      }
    }
  }

  const total = rows[0]?.total_count ?? 0

  const listings: SearchResultListing[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    price_1_day_minor: row.price_1_day_minor,
    rating_avg: row.rating_avg === null ? null : Number(row.rating_avg),
    rating_count: row.rating_count,
    distance_m: row.distance_m === null ? null : Math.round(row.distance_m),
    municipality: row.municipality,
    approx_latitude: row.approx_latitude,
    approx_longitude: row.approx_longitude,
    // A listing you own has no heart — you cannot favourite your own thing
    // (doc 03 §7.6, "Sopstveni oglasi").
    is_favorite: row.is_own ? false : row.is_favorite,
    is_own: row.is_own,
    owner: {
      id: row.owner_id,
      display_name: row.owner_display_name,
      is_verified: row.owner_is_verified,
    },
  }))

  return apiList(
    listings,
    {
      page: params.page,
      limit,
      total: Number(total),
      total_pages: Math.max(1, Math.ceil(Number(total) / limit)),
      search_center: {
        lat: params.lat,
        lng: params.lng,
        source: centerSource,
      },
      applied_filters: appliedFilters(params),
      did_you_mean: didYouMean,
    },
    60
  )
}
