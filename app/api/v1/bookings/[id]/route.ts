import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { respondToRentalRequest } from '@/lib/bookings/bookings.server'
import { isBookingResponseAction } from '@/lib/bookings/bookings.validation'
import type { BookingResponseAction } from '@/types/booking'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Zahtev nije pronađen.')
  }

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  let body: { action?: unknown; startDate?: string | null; endDate?: string | null }
  try {
    body = (await request.json()) as {
      action?: unknown
      startDate?: string | null
      endDate?: string | null
    }
  } catch {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  if (!isBookingResponseAction(body.action)) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Akcija nije ispravna.')
  }

  const action: BookingResponseAction = body.action
  const result = await respondToRentalRequest(auth.supabase, {
    bookingId: id,
    action,
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
  })
  if ('response' in result) return result.response
  return apiOk(result)
}
