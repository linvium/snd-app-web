import {
  ACTIVE_BOOKING_STATUSES,
  type Listing,
  type ListingImage,
  type OwnedListingSummary,
  type SaveListingInput,
} from '@/types/listing'
import { apiError, ERROR_CODES } from '@/lib/api/response'
import { nextSlugCandidate, slugifyTitle } from '@/lib/listings/listings.slug'
import {
  minorToRsd,
  publishFieldErrors,
  type ListingFormValues,
} from '@/lib/listings/listings.validation'
import type { SupabaseClient } from '@supabase/supabase-js'

type ListingRow = Omit<Listing, 'images' | 'location_ids' | 'has_active_booking'>

const LISTING_COLUMNS =
  'id, owner_id, category_id, title, slug, description, price_1_day_minor, price_3_days_minor, price_7_days_minor, item_value_minor, cancellation_policy, status, published_at, created_at, updated_at, deleted_at'

export async function loadOwnedListing(
  supabase: SupabaseClient,
  listingId: string,
  userId: string
): Promise<{ listing: Listing } | { response: ReturnType<typeof apiError> }> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('id', listingId)
    .maybeSingle()

  if (error) {
    console.error('[listings] load failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  if (!data || data.owner_id !== userId || data.status === 'deleted' || data.deleted_at) {
    return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.') }
  }

  const listing = await attachListingRelations(supabase, data as ListingRow)
  return { listing }
}

export async function attachListingRelations(
  supabase: SupabaseClient,
  row: ListingRow
): Promise<Listing> {
  const [{ data: images }, { data: locations }, { count }] = await Promise.all([
    supabase
      .from('listing_images')
      .select('id, listing_id, url, thumbnail_url, medium_url, large_url, width, height, sort_order, created_at')
      .eq('listing_id', row.id)
      .order('sort_order', { ascending: true }),
    supabase.from('listing_locations').select('location_id').eq('listing_id', row.id),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', row.id)
      .in('status', [...ACTIVE_BOOKING_STATUSES]),
  ])

  return {
    ...row,
    images: (images ?? []) as ListingImage[],
    location_ids: (locations ?? []).map((row) => row.location_id as string),
    has_active_booking: (count ?? 0) > 0,
  }
}

export async function listOwnDrafts(supabase: SupabaseClient, userId: string) {
  await supabase.rpc('snd_purge_expired_drafts')

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, updated_at')
    .eq('owner_id', userId)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function listOwnPublishedListings(
  supabase: SupabaseClient,
  userId: string
): Promise<OwnedListingSummary[]> {
  const { data: rows, error } = await supabase
    .from('listings')
    .select('id, slug, title, price_1_day_minor, status, published_at, updated_at')
    .eq('owner_id', userId)
    .in('status', ['published', 'paused'])
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw error
  const listings = rows ?? []
  if (listings.length === 0) return []

  const ids = listings.map((row) => row.id)
  const [{ data: images }, { data: listingLocations }] = await Promise.all([
    supabase
      .from('listing_images')
      .select('listing_id, thumbnail_url, sort_order')
      .in('listing_id', ids)
      .order('sort_order', { ascending: true }),
    supabase.from('listing_locations').select('listing_id, location_id').in('listing_id', ids),
  ])

  const locationIds = [...new Set((listingLocations ?? []).map((row) => row.location_id as string))]
  const { data: locations } =
    locationIds.length > 0
      ? await supabase.from('locations').select('id, city').in('id', locationIds)
      : { data: [] as { id: string; city: string }[] }

  const cityByLocationId = new Map((locations ?? []).map((row) => [row.id as string, row.city as string]))
  const cityByListingId = new Map<string, string>()
  for (const row of listingLocations ?? []) {
    const listingId = row.listing_id as string
    if (cityByListingId.has(listingId)) continue
    const city = cityByLocationId.get(row.location_id as string)
    if (city) cityByListingId.set(listingId, city)
  }

  const thumbByListingId = new Map<string, string>()
  for (const image of images ?? []) {
    const listingId = image.listing_id as string
    if (thumbByListingId.has(listingId)) continue
    if (image.thumbnail_url) thumbByListingId.set(listingId, image.thumbnail_url as string)
  }

  return listings.map((row) => ({
    id: row.id as string,
    slug: (row.slug as string | null) ?? null,
    title: (row.title as string | null) ?? 'Bez naslova',
    thumbnail_url: thumbByListingId.get(row.id as string) ?? null,
    price_1_day_minor: (row.price_1_day_minor as number | null) ?? 0,
    status: row.status as Listing['status'],
    city: cityByListingId.get(row.id as string) ?? null,
  }))
}

export async function createDraft(supabase: SupabaseClient, userId: string) {
  await supabase.rpc('snd_purge_expired_drafts')

  const { data, error } = await supabase
    .from('listings')
    .insert({
      owner_id: userId,
      cancellation_policy: 'flexible',
      status: 'draft',
    })
    .select(LISTING_COLUMNS)
    .single()

  if (error) {
    console.error('[listings] create draft failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  const listing = await attachListingRelations(supabase, data as ListingRow)
  return { listing }
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function saveListing(
  supabase: SupabaseClient,
  listing: Listing,
  input: SaveListingInput
): Promise<{ listing: Listing } | { response: ReturnType<typeof apiError> }> {
  if (listing.has_active_booking) {
    if (input.category_id !== undefined && input.category_id !== listing.category_id) {
      return {
        response: apiError(
          409,
          ERROR_CODES.CONFLICT,
          'Ne može se menjati dok traje aktivna rezervacija.',
          { category_id: 'Ne može se menjati dok traje aktivna rezervacija.' }
        ),
      }
    }
    if (
      input.cancellation_policy !== undefined &&
      input.cancellation_policy !== listing.cancellation_policy
    ) {
      return {
        response: apiError(
          409,
          ERROR_CODES.CONFLICT,
          'Ne može se menjati dok traje aktivna rezervacija.',
          { cancellation_policy: 'Ne može se menjati dok traje aktivna rezervacija.' }
        ),
      }
    }
    if (
      input.item_value_minor !== undefined &&
      input.item_value_minor !== listing.item_value_minor
    ) {
      return {
        response: apiError(
          409,
          ERROR_CODES.CONFLICT,
          'Ne može se menjati dok traje aktivna rezervacija.',
          { item_value_minor: 'Ne može se menjati dok traje aktivna rezervacija.' }
        ),
      }
    }
  }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = emptyToNull(input.title)
  if (input.description !== undefined) patch.description = emptyToNull(input.description)
  if (input.category_id !== undefined) patch.category_id = input.category_id
  if (input.price_1_day_minor !== undefined) patch.price_1_day_minor = input.price_1_day_minor
  if (input.price_3_days_minor !== undefined) patch.price_3_days_minor = input.price_3_days_minor
  if (input.price_7_days_minor !== undefined) patch.price_7_days_minor = input.price_7_days_minor
  if (input.item_value_minor !== undefined) patch.item_value_minor = input.item_value_minor
  if (input.cancellation_policy !== undefined) patch.cancellation_policy = input.cancellation_policy

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('listings').update(patch).eq('id', listing.id)
    if (error) {
      console.error('[listings] save failed', error)
      return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da sačuvamo izmene. Pokušaj ponovo.') }
    }
  }

  if (input.location_ids) {
    const uniqueIds = [...new Set(input.location_ids)]
    const { error: deleteError } = await supabase
      .from('listing_locations')
      .delete()
      .eq('listing_id', listing.id)
    if (deleteError) {
      console.error('[listings] clear locations failed', deleteError)
      return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da sačuvamo izmene. Pokušaj ponovo.') }
    }

    if (uniqueIds.length > 0) {
      const { error: insertError } = await supabase.from('listing_locations').insert(
        uniqueIds.map((locationId) => ({ listing_id: listing.id, location_id: locationId }))
      )
      if (insertError) {
        console.error('[listings] set locations failed', insertError)
        return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da sačuvamo izmene. Pokušaj ponovo.') }
      }
    }
  }

  const reloaded = await loadOwnedListing(supabase, listing.id, listing.owner_id)
  if ('response' in reloaded) return reloaded
  return { listing: reloaded.listing }
}

export async function allocateSlug(supabase: SupabaseClient, title: string): Promise<string> {
  const base = slugifyTitle(title)
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = nextSlugCandidate(base, attempt)
    const { data } = await supabase.from('listings').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

export async function loadCategoryForPublish(
  supabase: SupabaseClient,
  categoryId: string | null
) {
  if (!categoryId) return { exists: false, isLeaf: false, isEnabled: false, name: '' }

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, is_enabled')
    .eq('id', categoryId)
    .maybeSingle()

  if (!category) return { exists: false, isLeaf: false, isEnabled: false, name: '' }

  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', categoryId)

  return {
    exists: true,
    isLeaf: (count ?? 0) === 0,
    isEnabled: Boolean(category.is_enabled),
    name: category.name as string,
  }
}

export async function publishListing(supabase: SupabaseClient, listing: Listing) {
  const category = await loadCategoryForPublish(supabase, listing.category_id)

  const values: ListingFormValues = {
    title: listing.title ?? '',
    description: listing.description ?? '',
    categoryId: listing.category_id,
    categoryIsLeaf: category.isLeaf,
    categoryEnabled: category.isEnabled,
    imageCount: listing.images.length,
    price1DayRsd: listing.price_1_day_minor == null ? null : minorToRsd(listing.price_1_day_minor),
    price3DaysRsd: listing.price_3_days_minor == null ? null : minorToRsd(listing.price_3_days_minor),
    price7DaysRsd: listing.price_7_days_minor == null ? null : minorToRsd(listing.price_7_days_minor),
    locationIds: listing.location_ids,
    cancellationPolicy: listing.cancellation_policy,
    itemValueRsd: listing.item_value_minor == null ? null : minorToRsd(listing.item_value_minor),
  }

  const fields = publishFieldErrors(values)
  if (!category.exists && listing.category_id) {
    fields.category_id = 'Izaberi kategoriju.'
  }

  if (Object.keys(fields).length > 0) {
    return {
      response: apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Popravi polja pre objave.', fields),
    }
  }

  const slug =
    listing.status === 'draft' || !listing.slug
      ? await allocateSlug(supabase, listing.title ?? '')
      : listing.slug

  const { error } = await supabase
    .from('listings')
    .update({
      status: 'published',
      slug,
      published_at: listing.published_at ?? new Date().toISOString(),
    })
    .eq('id', listing.id)

  if (error) {
    console.error('[listings] publish failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  return { id: listing.id, slug, status: 'published' as const }
}
