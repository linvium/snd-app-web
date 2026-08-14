import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { SearchResultListing } from '@/types/search'

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

/**
 * GET /api/v1/listings/recent — doc 02 §5.4.
 *
 * Search uses it for one job only: the "Možda te zanima" strip under an empty
 * result set. A dead end with no way out is the worst outcome the page can
 * produce (doc 03 §10), so this deliberately applies no filters.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  const hasCenter = url.searchParams.has('lat') && Number.isFinite(lat) && Number.isFinite(lng)

  const requestedLimit = Number(url.searchParams.get('limit') ?? 8)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 24)
    : 8

  const supabase = await createClient()

  const fetchPage = (radiusKm: number | null) =>
    supabase.rpc('snd_search_listings', {
      p_query: null,
      p_category_slug: null,
      p_lat: hasCenter ? lat : null,
      p_lng: hasCenter ? lng : null,
      p_radius_km: radiusKm,
      p_price_min_minor: null,
      p_price_max_minor: null,
      p_date_from: null,
      p_date_to: null,
      p_sort: hasCenter ? 'distance' : 'newest',
      p_page: 1,
      p_limit: limit,
      p_fuzzy: false,
    })

  // Nearby first, then the rest of the country if that came up short — an
  // empty section reads as a dead platform (doc 02 §5.5).
  const nearby = await fetchPage(hasCenter ? 50 : null)
  if (nearby.error) {
    console.error('[recent] snd_search_listings failed', nearby.error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  let rows = (nearby.data ?? []) as SearchRow[]

  if (hasCenter && rows.length < limit) {
    const countrywide = await fetchPage(null)
    if (!countrywide.error) {
      const seen = new Set(rows.map((row) => row.id))
      for (const row of (countrywide.data ?? []) as SearchRow[]) {
        if (rows.length >= limit) break
        if (!seen.has(row.id)) rows.push(row)
      }
    }
  }

  const listings: SearchResultListing[] = rows
    // Your own things are not a suggestion (doc 02 §5.4, step 4).
    .filter((row) => !row.is_own)
    .map((row) => ({
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
      is_favorite: row.is_favorite,
      is_own: row.is_own,
      owner: {
        id: row.owner_id,
        display_name: row.owner_display_name,
        is_verified: row.owner_is_verified,
      },
    }))

  return apiList(listings, { total: listings.length }, 300)
}
