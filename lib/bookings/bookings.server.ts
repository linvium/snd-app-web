import type { SupabaseClient } from '@supabase/supabase-js'

import { apiError, ERROR_CODES } from '@/lib/api/response'
import { validateCreateRequestInput, validateProposedDates } from '@/lib/bookings/bookings.validation'
import type {
  Booking,
  BookingResponseAction,
  BookingStatus,
  CreateBookingRequestInput,
  CreateBookingRequestResponse,
  RespondToBookingInput,
  RespondToBookingResponse,
} from '@/types/booking'

const BOOKING_COLUMNS =
  'id, reference, listing_id, renter_id, owner_id, pickup_location_id, start_date, end_date, days_count, status, rental_price_minor, service_fee_minor, total_minor, owner_payout_minor, cancellation_policy, item_value_minor, requested_at, created_at'

type RpcError = { message?: string; code?: string }

function mapRpcError(error: RpcError) {
  const message = error.message ?? ''
  if (message.includes('UNAUTHENTICATED')) {
    return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
  }
  if (message.includes('FORBIDDEN')) {
    return { response: apiError(403, ERROR_CODES.FORBIDDEN, 'Ne možeš da pošalješ zahtev za sopstveni oglas.') }
  }
  if (message.includes('NOT_FOUND')) {
    return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.') }
  }
  if (message.includes('VALIDATION_FAILED')) {
    return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Proveri poruku i datume.') }
  }
  console.error('[bookings] rpc failed', error)
  return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
}

export async function createRentalRequest(
  supabase: SupabaseClient,
  input: CreateBookingRequestInput
): Promise<CreateBookingRequestResponse | { response: ReturnType<typeof apiError> }> {
  const fields = validateCreateRequestInput(input)
  if (Object.keys(fields).length > 0) {
    return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Popravi polja.', fields) }
  }

  const { data, error } = await supabase.rpc('snd_create_rental_request', {
    p_listing_id: input.listingId,
    p_body: input.body.trim(),
    p_start_date: input.startDate || null,
    p_end_date: input.endDate || null,
  })

  if (error) return mapRpcError(error)

  const payload = data as { booking_id: string; conversation_id: string }
  const { data: booking, error: loadError } = await supabase
    .from('bookings')
    .select(BOOKING_COLUMNS)
    .eq('id', payload.booking_id)
    .maybeSingle()

  if (loadError || !booking) {
    console.error('[bookings] load after create failed', loadError)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  return {
    booking: booking as Booking,
    conversationId: payload.conversation_id,
  }
}

function mapRespondRpcError(error: RpcError) {
  const message = error.message ?? ''
  if (message.includes('UNAUTHENTICATED')) {
    return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
  }
  if (message.includes('FORBIDDEN')) {
    return { response: apiError(403, ERROR_CODES.FORBIDDEN, 'Samo vlasnik može da odgovori na zahtev.') }
  }
  if (message.includes('NOT_FOUND')) {
    return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Zahtev nije pronađen.') }
  }
  if (message.includes('CONFLICT')) {
    return { response: apiError(409, ERROR_CODES.CONFLICT, 'Na ovaj zahtev je već odgovoreno.') }
  }
  if (message.includes('VALIDATION_FAILED')) {
    return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Akcija nije ispravna.') }
  }
  console.error('[bookings] respond rpc failed', error)
  return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
}

export async function respondToRentalRequest(
  supabase: SupabaseClient,
  input: RespondToBookingInput
): Promise<RespondToBookingResponse | { response: ReturnType<typeof apiError> }> {
  const action: BookingResponseAction = input.action
  if (action === 'propose') {
    const dateError = validateProposedDates(input.startDate ?? null, input.endDate ?? null)
    if (dateError) {
      return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, dateError) }
    }
  }

  const { data, error } = await supabase.rpc('snd_respond_to_rental_request', {
    p_booking_id: input.bookingId,
    p_action: action,
    p_start_date: action === 'propose' ? input.startDate : null,
    p_end_date: action === 'propose' ? input.endDate : null,
  })

  if (error) return mapRespondRpcError(error)

  const payload = data as { booking_id: string; status: string; conversation_id: string }
  return {
    bookingId: payload.booking_id,
    status: payload.status as BookingStatus,
    conversationId: payload.conversation_id,
  }
}
