import type { SupabaseClient } from '@supabase/supabase-js'

import { apiError, ERROR_CODES } from '@/lib/api/response'
import type { SearchResultListing } from '@/types/search'

export async function listFavoriteListings(
  supabase: SupabaseClient,
  userId: string
): Promise<SearchResultListing[] | { response: ReturnType<typeof apiError> }> {
  const { data: favoriteRows, error: favoriteError } = await supabase
    .from('favorites')
    .select('listing_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (favoriteError) {
    console.error('[favorites] list failed', favoriteError)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  const listingIds = (favoriteRows ?? []).map((row) => row.listing_id as string)
  if (listingIds.length === 0) return []

  const [{ data: listings, error: listingError }, { data: images }, { data: pickupRows }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, slug, title, price_1_day_minor, owner_id, rating_avg, rating_count, status')
      .in('id', listingIds)
      .eq('status', 'published')
      .is('deleted_at', null),
    supabase
      .from('listing_images')
      .select('listing_id, thumbnail_url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('public_listing_locations')
      .select('listing_id, municipality, city, approx_latitude, approx_longitude')
      .in('listing_id', listingIds),
  ])

  if (listingError) {
    console.error('[favorites] listings failed', listingError)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  const ownerIds = [...new Set((listings ?? []).map((row) => row.owner_id as string))]
  const { data: owners } =
    ownerIds.length > 0
      ? await supabase
          .from('public_owner_profiles')
          .select('user_id, display_name, is_verified')
          .in('user_id', ownerIds)
      : { data: [] }

  const listingById = new Map((listings ?? []).map((row) => [row.id as string, row]))
  const thumbByListing = new Map<string, string>()
  for (const image of images ?? []) {
    const listingId = image.listing_id as string
    if (!thumbByListing.has(listingId) && image.thumbnail_url) {
      thumbByListing.set(listingId, image.thumbnail_url as string)
    }
  }

  const pickupByListing = new Map<
    string,
    { municipality: string | null; lat: number; lng: number }
  >()
  for (const row of pickupRows ?? []) {
    const listingId = row.listing_id as string
    if (pickupByListing.has(listingId)) continue
    pickupByListing.set(listingId, {
      municipality: (row.municipality as string | null) ?? (row.city as string | null),
      lat: Number(row.approx_latitude) || 0,
      lng: Number(row.approx_longitude) || 0,
    })
  }

  const ownerById = new Map(
    (owners ?? []).map((row) => [
      row.user_id as string,
      {
        display_name: (row.display_name as string | null) ?? 'Vlasnik',
        is_verified: Boolean(row.is_verified),
      },
    ])
  )

  return listingIds.flatMap((listingId) => {
    const listing = listingById.get(listingId)
    if (!listing || !listing.slug) return []
    const pickup = pickupByListing.get(listingId)
    const owner = ownerById.get(listing.owner_id as string)
    return [
      {
        id: listing.id as string,
        slug: listing.slug as string,
        title: (listing.title as string | null) ?? 'Oglas',
        thumbnail_url: thumbByListing.get(listingId) ?? null,
        price_1_day_minor: (listing.price_1_day_minor as number | null) ?? 0,
        rating_avg: listing.rating_avg == null ? null : Number(listing.rating_avg),
        rating_count: (listing.rating_count as number | null) ?? 0,
        distance_m: null,
        municipality: pickup?.municipality ?? null,
        approx_latitude: pickup?.lat ?? 0,
        approx_longitude: pickup?.lng ?? 0,
        is_favorite: true,
        is_own: listing.owner_id === userId,
        owner: {
          id: listing.owner_id as string,
          display_name: owner?.display_name ?? 'Vlasnik',
          is_verified: owner?.is_verified ?? false,
        },
      } satisfies SearchResultListing,
    ]
  })
}
