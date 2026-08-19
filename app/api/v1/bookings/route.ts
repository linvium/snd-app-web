import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { createRentalRequest } from '@/lib/bookings/bookings.server'
import type { CreateBookingRequestInput } from '@/types/booking'

export async function POST(request: NextRequest) {
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  let body: CreateBookingRequestInput
  try {
    body = (await request.json()) as CreateBookingRequestInput
  } catch {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const result = await createRentalRequest(auth.supabase, {
    listingId: body.listingId,
    body: body.body ?? '',
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
  })

  if ('response' in result) return result.response
  return apiOk(result, 201)
}
