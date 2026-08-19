import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { loadReviews } from '@/lib/reviews/reviews.server'
import { createClient } from '@/lib/supabase/server'
import { REVIEW_PAGE_SIZE, type ReviewScope } from '@/types/listing-detail'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_LIMIT = 50

/**
 * GET /api/v1/listings/<id>/reviews — doc 04 §11.
 *
 * The first page is rendered on the server with the rest of the item page; this
 * serves "Prikaži svih 12 recenzija" and the other-items list.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const url = new URL(request.url)
  const scope: ReviewScope = url.searchParams.get('scope') === 'owner_other' ? 'owner_other' : 'listing'

  const page = Math.max(1, Math.trunc(Number(url.searchParams.get('page') ?? 1)) || 1)
  const requestedLimit = Math.trunc(Number(url.searchParams.get('limit') ?? REVIEW_PAGE_SIZE))
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : REVIEW_PAGE_SIZE

  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle()

  if (!listing) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const { reviews, total } = await loadReviews(supabase, {
    listingId: id,
    ownerId: listing.owner_id as string,
    scope,
    limit,
    offset: (page - 1) * limit,
  })

  return apiList(reviews, {
    page,
    limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / limit)),
    scope,
  })
}
