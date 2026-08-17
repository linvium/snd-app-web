import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { loadOwnedListing, publishListing } from '@/lib/listings/listings.server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const loaded = await loadOwnedListing(auth.supabase, id, auth.userId)
  if ('response' in loaded) return loaded.response

  if (loaded.listing.status === 'deleted') {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const published = await publishListing(auth.supabase, loaded.listing)
  if ('response' in published) return published.response
  return apiOk(published)
}
