import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { submitBookingReview } from '@/lib/bookings/bookings.server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Rezervacija nije pronađena.')
  }

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  let body: { rating?: unknown; comment?: string | null }
  try {
    body = (await request.json()) as { rating?: unknown; comment?: string | null }
  } catch {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const rating = Number(body.rating)
  const result = await submitBookingReview(auth.supabase, {
    bookingId: id,
    rating,
    comment: body.comment ?? null,
  })

  if ('response' in result) return result.response
  return apiOk(result, 201)
}
