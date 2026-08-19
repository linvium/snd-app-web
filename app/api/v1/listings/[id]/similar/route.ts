import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { SearchResultListing } from '@/types/search'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DEFAULT_LIMIT = 4
const RADIUS_KM = 25

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
}

/**
 * GET /api/v1/listings/<id>/similar — doc 04 §12.
 *
 * Built on `snd_search_listings` rather than on a query of its own: "same
 * category, within 25 km, nearest first" is a search, and running it through
 * the same function means the strip and the results page can never disagree
 * about which listings exist or how far away they are.
 *
 * Distance is measured from this listing's own pickup point — "similar" here
 * means "an alternative you could collect instead", which is a fact about the
 * two items rather than about who is looking.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const url = new URL(request.url)
  const requestedLimit = Math.trunc(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT))
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 12)
    : DEFAULT_LIMIT

  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, category_id')
    .eq('id', id)
    .maybeSingle()

  if (!listing) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const [{ data: locations }, { data: category }] = await Promise.all([
    supabase
      .from('public_listing_locations')
      .select('approx_latitude, approx_longitude')
      .eq('listing_id', id)
      .limit(1),
    listing.category_id
      ? supabase
          .from('categories')
          .select('slug, parent_id')
          .eq('id', listing.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const origin = locations?.[0]
  const lat = origin ? Number(origin.approx_latitude) : null
  const lng = origin ? Number(origin.approx_longitude) : null

  const { data: parentCategory } = category?.parent_id
    ? await supabase.from('categories').select('slug').eq('id', category.parent_id).maybeSingle()
    : { data: null }

  const ownerId = listing.owner_id as string
  const collected: SearchResultListing[] = []
  const seen = new Set<string>([id])

  const fetchTier = async (categorySlug: string | null, radiusKm: number | null) => {
    if (collected.length >= limit) return

    const { data, error } = await supabase.rpc('snd_search_listings', {
      p_query: null,
      p_category_slug: categorySlug,
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_price_min_minor: null,
      p_price_max_minor: null,
      p_date_from: null,
      p_date_to: null,
      p_sort: lat === null ? 'newest' : 'distance',
      p_page: 1,
      // Over-fetch: the owner's own listings are filtered out below, and a
      // strip that comes back short because of that filter is the bug this
      // avoids.
      p_limit: limit * 4,
      p_fuzzy: false,
    })

    if (error) {
      console.error('[similar] snd_search_listings failed', error)
      return
    }

    for (const row of (data ?? []) as SearchRow[]) {
      if (collected.length >= limit) break
      if (seen.has(row.id)) continue
      // Excluded by doc 04 §12: a strip of the same person's things is a
      // catalogue, not a comparison.
      if (row.owner_id === ownerId) continue

      seen.add(row.id)
      collected.push({
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
      })
    }
  }

  // Doc 04 §12's fallback ladder, each rung widening only after the one above
  // came up short.
  await fetchTier(category?.slug ?? null, RADIUS_KM)
  if (collected.length < limit && parentCategory?.slug) {
    await fetchTier(parentCategory.slug as string, RADIUS_KM)
  }
  if (collected.length < limit) {
    await fetchTier(null, RADIUS_KM)
  }
  if (collected.length < limit) {
    await fetchTier(null, null)
  }

  return apiList(collected, { total: collected.length }, 300)
}
