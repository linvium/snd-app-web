import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { loadOwnedListing } from '@/lib/listings/listings.server'
import { ACTIVE_BOOKING_STATUSES } from '@/types/listing'

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

  if (loaded.listing.status !== 'published' && loaded.listing.status !== 'paused') {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Samo objavljen ili arhiviran oglas može da se vrati u nacrt.')
  }

  if (loaded.listing.has_active_booking) {
    return apiError(
      409,
      ERROR_CODES.CONFLICT,
      'Oglas se ne može vratiti u nacrt dok traje aktivna rezervacija.'
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
      'Oglas se ne može vratiti u nacrt dok traje aktivna rezervacija.'
    )
  }

  const { data, error } = await auth.supabase
    .from('listings')
    .update({ status: 'draft' })
    .eq('id', id)
    .select('status')
    .maybeSingle()

  if (error || data?.status !== 'draft') {
    console.error('[listings] unpublish failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  return apiOk({ id, status: 'draft' })
}
