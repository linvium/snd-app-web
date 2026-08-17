import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { loadOwnedListing, saveListing } from '@/lib/listings/listings.server'
import { ACTIVE_BOOKING_STATUSES, type SaveListingInput } from '@/types/listing'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const result = await loadOwnedListing(auth.supabase, id, auth.userId)
  if ('response' in result) return result.response
  return apiOk(result.listing)
}

export async function PATCH(
  request: NextRequest,
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

  let body: SaveListingInput
  try {
    body = (await request.json()) as SaveListingInput
  } catch {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const saved = await saveListing(auth.supabase, loaded.listing, body)
  if ('response' in saved) return saved.response
  return apiOk(saved.listing)
}

export async function DELETE(
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

  if (loaded.listing.has_active_booking) {
    return apiError(
      409,
      ERROR_CODES.CONFLICT,
      'Oglas se ne može obrisati dok traje aktivna rezervacija.'
    )
  }

  const { count } = await auth.supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', id)
    .in('status', [...ACTIVE_BOOKING_STATUSES])

  if ((count ?? 0) > 0) {
    return apiError(
      409,
      ERROR_CODES.CONFLICT,
      'Oglas se ne može obrisati dok traje aktivna rezervacija.'
    )
  }

  const { error } = await auth.supabase
    .from('listings')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[listings] delete failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  return apiOk({ id, status: 'deleted' })
}
