import type { SupabaseClient } from '@supabase/supabase-js'

import { addDaysIso, todayIso } from '@/lib/availability'
import { buildBreadcrumb, guaranteeCapMinor, inheritedGuaranteeCap, toDetailImages } from '@/lib/listings/listings.detail'
import { AVAILABILITY_MONTHS_AHEAD } from '@/lib/pricing'
import type {
  CategoryNode,
  ListingDetail,
  OwnerSummary,
  PickupLocation,
} from '@/types/listing-detail'
import type { CancellationPolicy, ListingStatus } from '@/types/listing'

/**
 * Loads everything the item page shows (doc 04 §14).
 *
 * Plain SDK queries throughout. The parts an anonymous visitor cannot reach —
 * the owner's name and reputation, the blurred pickup coordinates — come from
 * the `public_*` views, whose column lists are the enforcement of doc 04 §9:
 * `street`, `postal_code` and the exact coordinates are not selectable there at
 * all. The one path that does return them is `locations` itself, which stays
 * behind RLS and opens only to a renter with a paid or running booking.
 */

// One literal, not a concatenation: `.select()` infers its row type from the
// string, and anything the compiler cannot read as a literal degrades the whole
// result to an untyped error shape.
const LISTING_COLUMNS =
  'id, owner_id, category_id, title, slug, description, price_1_day_minor, price_3_days_minor, price_7_days_minor, item_value_minor, cancellation_policy, status, rating_avg, rating_count, published_at, created_at, deleted_at'

export type LoadDetailResult =
  | { kind: 'found'; listing: ListingDetail }
  | { kind: 'not_found' }
  /** Published once, gone now — the route turns this into 410 (doc 04 §15). */
  | { kind: 'gone' }

export async function loadListingDetail(
  supabase: SupabaseClient,
  slug: string,
  viewer: { id: string | null; lat?: number | null; lng?: number | null } = { id: null }
): Promise<LoadDetailResult> {
  const { data: row, error } = await supabase
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[listing-detail] load failed', error)
    return { kind: 'not_found' }
  }

  // RLS already limits this to published listings plus the caller's own, so a
  // miss here is either "never existed", "still a draft" or "deleted".
  if (!row || row.deleted_at || row.status === 'deleted') {
    const { data: tombstone } = await supabase
      .from('public_deleted_listing_slugs')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()
    return tombstone ? { kind: 'gone' } : { kind: 'not_found' }
  }

  // A draft is reachable only by its owner, and RLS has already established
  // that the caller is one or the other.
  if (row.status === 'rejected' && row.owner_id !== viewer.id) {
    return { kind: 'not_found' }
  }

  const listingId = row.id as string
  const ownerId = row.owner_id as string
  const today = todayIso()

  const [
    { data: images, error: imagesError },
    { data: pickupRows },
    { data: categories },
    { data: ownerRow },
    { data: blocked },
    { data: favorite },
    { data: entitlingBookings },
  ] = await Promise.all([
    supabase
      .from('listing_images')
      .select('id, thumbnail_url, medium_url, large_url, sort_order')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('public_listing_locations')
      .select('location_id, label, municipality, city, approx_latitude, approx_longitude')
      .eq('listing_id', listingId),
    supabase.from('categories').select('id, parent_id, name, slug, level, guarantee_cap_minor'),
    supabase
      .from('public_owner_profiles')
      .select(
        'user_id, display_name, avatar_url, rating_avg, rating_count, avg_response_minutes, response_rate, member_since, is_verified, conversation_count'
      )
      .eq('user_id', ownerId)
      .maybeSingle(),
    // Availability is one readable table: a trigger mirrors accepted, booked and
    // picked-up bookings into `blocked_dates` (doc 00 §6.4), so the public
    // calendar never has to read `bookings`.
    supabase
      .from('blocked_dates')
      .select('date')
      .eq('listing_id', listingId)
      .gte('date', today)
      .lte('date', addDaysIso(today, Math.round(AVAILABILITY_MONTHS_AHEAD * 30.5)))
      .order('date', { ascending: true }),
    viewer.id
      ? supabase
          .from('favorites')
          .select('listing_id')
          .eq('listing_id', listingId)
          .eq('user_id', viewer.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    viewer.id
      ? supabase
          .from('bookings')
          .select('pickup_location_id')
          .eq('listing_id', listingId)
          .eq('renter_id', viewer.id)
          .in('status', ['booked', 'picked_up'])
      : Promise.resolve({ data: [] }),
  ])

  if (imagesError) {
    console.error('[listing-detail] images failed', imagesError)
  }

  const isOwner = ownerId === viewer.id
  const canSeeExact = isOwner || (entitlingBookings ?? []).length > 0

  let pickup_locations: PickupLocation[] = (pickupRows ?? []).map((location) => ({
    id: location.location_id as string,
    label: location.label as string,
    municipality: (location.municipality as string) ?? (location.city as string),
    city: location.city as string,
    approx_latitude: Number(location.approx_latitude),
    approx_longitude: Number(location.approx_longitude),
  }))

  if (canSeeExact && pickup_locations.length > 0) {
    // `locations` is still RLS-guarded; this returns rows only for the owner or
    // for a renter the paid-booking policy has unlocked. No branch here decides
    // that — the database does, and an empty result simply leaves the blurred
    // version in place.
    const { data: exact } = await supabase
      .from('locations')
      .select('id, street, postal_code, latitude, longitude')
      .in(
        'id',
        pickup_locations.map((location) => location.id)
      )

    const exactById = new Map((exact ?? []).map((location) => [location.id as string, location]))
    pickup_locations = pickup_locations.map((location) => {
      const match = exactById.get(location.id)
      if (!match) return location
      return {
        ...location,
        street: match.street as string,
        postal_code: (match.postal_code as string | null) ?? null,
        latitude: Number(match.latitude),
        longitude: Number(match.longitude),
      }
    })
  }

  const categoryById = new Map<string, CategoryNode>(
    (categories ?? []).map((category) => [
      category.id as string,
      {
        id: category.id as string,
        parent_id: (category.parent_id as string | null) ?? null,
        name: category.name as string,
        slug: category.slug as string,
        level: Number(category.level),
        guarantee_cap_minor: (category.guarantee_cap_minor as number | null) ?? null,
      },
    ])
  )

  const trail = buildBreadcrumb((row.category_id as string | null) ?? null, categoryById)
  const itemValueMinor = (row.item_value_minor as number | null) ?? null

  const owner: OwnerSummary = {
    id: ownerId,
    display_name: (ownerRow?.display_name as string) ?? 'Korisnik',
    avatar_url: (ownerRow?.avatar_url as string | null) ?? null,
    is_verified: Boolean(ownerRow?.is_verified),
    member_since: (ownerRow?.member_since as string) ?? (row.created_at as string),
    rating_avg: ownerRow?.rating_avg == null ? null : Number(ownerRow.rating_avg),
    rating_count: Number(ownerRow?.rating_count ?? 0),
    avg_response_minutes:
      ownerRow?.avg_response_minutes == null ? null : Number(ownerRow.avg_response_minutes),
    response_rate: ownerRow?.response_rate == null ? null : Number(ownerRow.response_rate),
    conversation_count: Number(ownerRow?.conversation_count ?? 0),
  }

  return {
    kind: 'found',
    listing: {
      id: listingId,
      slug: row.slug as string,
      title: (row.title as string) ?? '',
      description: (row.description as string) ?? '',
      status: row.status as ListingStatus,
      category: trail.length
        ? {
            id: trail[trail.length - 1].id,
            name: trail[trail.length - 1].name,
            full_path: trail.map((node) => node.name).join(' › '),
            breadcrumb: trail.map((node) => ({ name: node.name, slug: node.slug })),
          }
        : null,
      images: toDetailImages(images),
      price_1_day_minor: Number(row.price_1_day_minor ?? 0),
      price_3_days_minor: (row.price_3_days_minor as number | null) ?? null,
      price_7_days_minor: (row.price_7_days_minor as number | null) ?? null,
      item_value_minor: itemValueMinor,
      cancellation_policy: row.cancellation_policy as CancellationPolicy,
      guarantee_cap_minor: guaranteeCapMinor(inheritedGuaranteeCap(trail), itemValueMinor),
      rating_avg: row.rating_avg == null ? null : Number(row.rating_avg),
      rating_count: Number(row.rating_count ?? 0),
      is_favorite: Boolean(favorite),
      is_own_listing: isOwner,
      can_see_exact_location: canSeeExact,
      distance_m: nearestDistanceMeters(pickup_locations, viewer.lat, viewer.lng),
      pickup_locations,
      owner,
      unavailable_dates: (blocked ?? []).map((entry) => entry.date as string),
      published_at: (row.published_at as string | null) ?? null,
      created_at: row.created_at as string,
    },
  }
}

const EARTH_RADIUS_M = 6371000

/** Same haversine as `snd_haversine_m`, so the page and search agree (doc 03 §7.3). */
function nearestDistanceMeters(
  locations: readonly PickupLocation[],
  lat: number | null | undefined,
  lng: number | null | undefined
): number | null {
  if (lat == null || lng == null || locations.length === 0) return null

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const distances = locations.map((location) => {
    const dLat = toRad(location.approx_latitude - lat)
    const dLng = toRad(location.approx_longitude - lng)
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(location.approx_latitude)) * Math.sin(dLng / 2) ** 2
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
  })

  return Math.round(Math.min(...distances))
}
