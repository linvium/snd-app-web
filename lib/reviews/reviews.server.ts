import type { SupabaseClient } from '@supabase/supabase-js'

import type { ListingReview, ReviewScope, ReviewSummary } from '@/types/listing-detail'

/**
 * Reviews on the item page (doc 04 §11).
 *
 * Two scopes rather than one list. Doc 04 §11 says the page shows reviews whose
 * `listing_id` is this listing *or* whose `subject_user_id` is the owner, but
 * merging them would put a review of a different item under this item's title
 * and let it read as being about this one. `owner_other` is returned separately
 * so the interface can label it for what it is.
 *
 * Only `renter_to_owner` rows: an owner's review of a renter is about somebody
 * who is not on this page. `is_published` is enforced by RLS as well as here —
 * a review under the double-blind hold (doc 00 §3.14) is visible to nobody but
 * its author.
 */

const REVIEW_COLUMNS = 'id, rating, comment, reply, reply_at, created_at, author_id, listing_id'

export async function loadReviews(
  supabase: SupabaseClient,
  options: {
    listingId: string
    ownerId: string
    scope: ReviewScope
    limit: number
    offset: number
  }
): Promise<{ reviews: ListingReview[]; total: number }> {
  let query = supabase
    .from('reviews')
    .select(REVIEW_COLUMNS, { count: 'exact' })
    .eq('is_published', true)
    .eq('direction', 'renter_to_owner')

  if (options.scope === 'owner_other') {
    query = query
      .eq('subject_user_id', options.ownerId)
      // `neq` alone would drop rows where listing_id is null, and a review left
      // on a since-deleted listing is still a review of this owner.
      .or(`listing_id.is.null,listing_id.neq.${options.listingId}`)
  } else {
    query = query.eq('listing_id', options.listingId)
  }

  const { data, count, error } = await query
    // Newest first (doc 04 §11.2).
    .order('created_at', { ascending: false })
    .range(options.offset, options.offset + options.limit - 1)

  if (error) {
    console.error('[reviews] load failed', error)
    return { reviews: [], total: 0 }
  }

  const rows = data ?? []
  if (rows.length === 0) return { reviews: [], total: count ?? 0 }

  const authorIds = [...new Set(rows.map((row) => row.author_id as string))]
  const listingIds = [
    ...new Set(rows.map((row) => row.listing_id as string | null).filter((id): id is string => !!id)),
  ]

  const [{ data: authors }, { data: listings }] = await Promise.all([
    supabase
      .from('public_owner_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', authorIds),
    listingIds.length > 0
      ? supabase.from('listings').select('id, slug, title').in('id', listingIds)
      : Promise.resolve({ data: [] as { id: string; slug: string; title: string }[] }),
  ])

  const authorById = new Map((authors ?? []).map((author) => [author.user_id as string, author]))
  const listingById = new Map((listings ?? []).map((listing) => [listing.id as string, listing]))

  const reviews: ListingReview[] = rows.map((row) => {
    const author = authorById.get(row.author_id as string)
    const listing = row.listing_id ? listingById.get(row.listing_id as string) : undefined

    return {
      id: row.id as string,
      rating: Number(row.rating),
      comment: (row.comment as string | null) ?? null,
      reply: (row.reply as string | null) ?? null,
      reply_at: (row.reply_at as string | null) ?? null,
      created_at: row.created_at as string,
      author: {
        id: row.author_id as string,
        // A deleted account leaves its reviews standing but loses its name.
        display_name: (author?.display_name as string) ?? 'Korisnik',
        avatar_url: (author?.avatar_url as string | null) ?? null,
      },
      listing: {
        id: (row.listing_id as string | null) ?? null,
        slug: (listing?.slug as string | null) ?? null,
        title: (listing?.title as string | null) ?? null,
      },
    }
  })

  return { reviews, total: count ?? reviews.length }
}

/**
 * The histogram above the list (doc 04 §11.1).
 *
 * Tallied from the rows rather than read off `listings.rating_avg`, so the
 * header, the bars and the reviews printed underneath can never disagree.
 */
export async function loadReviewSummary(
  supabase: SupabaseClient,
  listingId: string
): Promise<ReviewSummary> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('listing_id', listingId)
    .eq('is_published', true)
    .eq('direction', 'renter_to_owner')

  const histogram: ReviewSummary['histogram'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  if (error || !data || data.length === 0) {
    if (error) console.error('[reviews] summary failed', error)
    return { rating_avg: null, rating_count: 0, histogram }
  }

  let sum = 0
  for (const row of data) {
    const rating = Number(row.rating)
    if (rating >= 1 && rating <= 5) {
      histogram[rating as 1 | 2 | 3 | 4 | 5] += 1
      sum += rating
    }
  }

  return {
    rating_avg: Number((sum / data.length).toFixed(2)),
    rating_count: data.length,
    histogram,
  }
}
