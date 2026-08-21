import type { SupabaseClient } from '@supabase/supabase-js'

import { apiError, ERROR_CODES } from '@/lib/api/response'
import { validateCreateRequestInput, validateProposedDates, validateReviewInput } from '@/lib/bookings/bookings.validation'
import type {
  Booking,
  BookingResponseAction,
  BookingStatus,
  ConfirmPaymentResponse,
  CreateBookingRequestInput,
  CreateBookingRequestResponse,
  PaymentLinkSummary,
  RespondToBookingInput,
  StartCheckoutResponse,
  RespondToBookingResponse,
  SubmitBookingReviewInput,
  SubmitBookingReviewResponse,
} from '@/types/booking'

const BOOKING_COLUMNS =
  'id, reference, listing_id, renter_id, owner_id, pickup_location_id, start_date, end_date, days_count, status, rental_price_minor, service_fee_minor, total_minor, owner_payout_minor, cancellation_policy, item_value_minor, requested_at, created_at'

type RpcError = { message?: string; code?: string }

/**
 * Nudge the outbox after a lifecycle change.
 *
 * The mail is already queued by the transaction, so this only decides whether
 * it goes out now or on the next scheduled drain - which is why the failure is
 * logged and swallowed rather than failing the request the user made.
 */
function dispatchQueuedEmails(supabase: SupabaseClient): void {
  void supabase.functions
    .invoke('send-email', { body: {} })
    .catch((error: unknown) => console.error('[bookings] email dispatch failed', error))
}

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

  dispatchQueuedEmails(supabase)

  return {
    booking: booking as Booking,
    conversationId: payload.conversation_id,
  }
}

function mapRespondRpcError(error: RpcError, action: BookingResponseAction) {
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
    return {
      response: apiError(
        409,
        ERROR_CODES.CONFLICT,
        action === 'accept' || action === 'decline' || action === 'propose'
          ? 'Na ovaj zahtev je već odgovoreno.'
          : 'Rezervacija je već u drugom stanju.'
      ),
    }
  }
  if (message.includes('VALIDATION_FAILED')) {
    return {
      response: apiError(
        422,
        ERROR_CODES.VALIDATION_FAILED,
        // Accepting is the only action the database rejects for a missing term,
        // and the generic "action is invalid" would leave the owner guessing.
        action === 'accept'
          ? 'Dogovorite datume pre prihvatanja - predloži termin.'
          : 'Akcija nije ispravna.'
      ),
    }
  }
  console.error('[bookings] respond rpc failed', error)
  return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
}

const STAGE_RPC: Record<'mark_picked_up' | 'mark_returned', string> = {
  mark_picked_up: 'snd_mark_booking_picked_up',
  mark_returned: 'snd_mark_booking_returned',
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

  const isStageMove = action === 'mark_picked_up' || action === 'mark_returned'

  const { data, error } = isStageMove
    ? await supabase.rpc(STAGE_RPC[action], { p_booking_id: input.bookingId })
    : await supabase.rpc('snd_respond_to_rental_request', {
        p_booking_id: input.bookingId,
        p_action: action,
        p_start_date: action === 'propose' ? input.startDate : null,
        p_end_date: action === 'propose' ? input.endDate : null,
      })

  if (error) return mapRespondRpcError(error, action)

  const payload = data as {
    booking_id: string
    status: string
    conversation_id: string
    payment_token?: string | null
  }

  dispatchQueuedEmails(supabase)

  return {
    bookingId: payload.booking_id,
    status: payload.status as BookingStatus,
    conversationId: payload.conversation_id,
    paymentToken: payload.payment_token ?? null,
  }
}

export async function submitBookingReview(
  supabase: SupabaseClient,
  input: SubmitBookingReviewInput
): Promise<SubmitBookingReviewResponse | { response: ReturnType<typeof apiError> }> {
  const fields = validateReviewInput(input)
  if (Object.keys(fields).length > 0) {
    return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Popravi polja.', fields) }
  }

  const { data, error } = await supabase.rpc('snd_submit_booking_review', {
    p_booking_id: input.bookingId,
    p_rating: input.rating,
    p_comment: input.comment?.trim() || null,
  })

  if (error) {
    const message = error.message ?? ''
    if (message.includes('UNAUTHENTICATED')) {
      return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
    }
    if (message.includes('FORBIDDEN')) {
      return { response: apiError(403, ERROR_CODES.FORBIDDEN, 'Ne možeš da oceniš ovu rezervaciju.') }
    }
    if (message.includes('NOT_FOUND')) {
      return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Rezervacija nije pronađena.') }
    }
    if (message.includes('CONFLICT')) {
      return {
        response: apiError(
          409,
          ERROR_CODES.CONFLICT,
          'Ocena je već ostavljena ili rezervacija još nije završena.'
        ),
      }
    }
    if (message.includes('VALIDATION_FAILED')) {
      return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Proveri ocenu i komentar.') }
    }
    console.error('[bookings] review rpc failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  const payload = data as {
    booking_id: string
    review_id: string
    status: string
    published: boolean
    conversation_id: string | null
  }

  return {
    bookingId: payload.booking_id,
    reviewId: payload.review_id,
    status: payload.status as BookingStatus,
    published: payload.published,
    conversationId: payload.conversation_id,
  }
}

/**
 * The pay page's data, by token.
 *
 * No session is required: the renter may open the link from the email on a
 * device they never signed in on, and the token is the credential.
 */
export async function getPaymentLinkSummary(
  supabase: SupabaseClient,
  token: string
): Promise<PaymentLinkSummary | null> {
  const { data, error } = await supabase.rpc('snd_payment_link_summary', { p_token: token })

  if (error) {
    console.error('[bookings] payment link lookup failed', error)
    return null
  }

  return (data as PaymentLinkSummary | null) ?? null
}

/**
 * Opens a provider checkout for a link and returns where to send the renter.
 *
 * The provider's secret keys live on the edge function alongside the webhook
 * secret, the same arrangement the KYC integration uses, so nothing about the
 * payment provider is deployed with the web app.
 */
export async function startPaymentCheckout(
  supabase: SupabaseClient,
  token: string
): Promise<StartCheckoutResponse | { response: ReturnType<typeof apiError> }> {
  const { data, error } = await supabase.functions.invoke('payment-checkout', {
    body: { token },
  })

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    if (status === 401) {
      return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
    }
    if (status === 403) {
      return { response: apiError(403, ERROR_CODES.FORBIDDEN, 'Ovaj link nije tvoj.') }
    }
    if (status === 404) {
      return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Link za plaćanje ne postoji.') }
    }
    if (status === 409) {
      return { response: apiError(409, ERROR_CODES.CONFLICT, 'Ova rezervacija je već plaćena.') }
    }
    if (status === 410) {
      return {
        response: apiError(
          409,
          ERROR_CODES.CONFLICT,
          'Link za plaćanje je istekao. Dogovori novi termin sa vlasnikom.'
        ),
      }
    }
    if (status === 503) {
      return {
        response: apiError(503, ERROR_CODES.INTERNAL, 'Plaćanje trenutno nije dostupno. Javi se podršci.'),
      }
    }
    console.error('[bookings] checkout failed', error)
    return {
      response: apiError(502, ERROR_CODES.INTERNAL, 'Plaćanje nije moglo da se otvori. Pokušaj ponovo.'),
    }
  }

  const payload = (data as { data?: StartCheckoutResponse })?.data
  if (!payload?.url) {
    return {
      response: apiError(502, ERROR_CODES.INTERNAL, 'Plaćanje nije moglo da se otvori. Pokušaj ponovo.'),
    }
  }

  return payload
}

export async function confirmPayment(
  supabase: SupabaseClient,
  token: string
): Promise<ConfirmPaymentResponse | { response: ReturnType<typeof apiError> }> {
  const { data, error } = await supabase.functions.invoke('payment-confirm', {
    body: { token },
  })

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    if (status === 401) {
      return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
    }
    if (status === 403) {
      return { response: apiError(403, ERROR_CODES.FORBIDDEN, 'Ovaj link nije tvoj.') }
    }
    if (status === 503) {
      return {
        response: apiError(503, ERROR_CODES.INTERNAL, 'Plaćanje trenutno nije dostupno. Javi se podršci.'),
      }
    }
    if (status === 404) {
      return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Link za plaćanje ne postoji.') }
    }
    if (status === 410) {
      return { response: apiError(409, ERROR_CODES.CONFLICT, 'Link za plaćanje je istekao.') }
    }
    if (status === 409) {
      return { response: apiError(409, ERROR_CODES.CONFLICT, 'Ova rezervacija je već plaćena ili otkazana.') }
    }
    console.error('[bookings] payment confirm failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Plaćanje nije potvrđeno. Pokušaj ponovo.') }
  }

  const payload = (data as { data?: { booking_id: string; status: string; already_paid: boolean } })
    ?.data

  if (!payload) {
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Plaćanje nije potvrđeno. Pokušaj ponovo.') }
  }

  return {
    bookingId: payload.booking_id,
    status: payload.status as BookingStatus,
    alreadyPaid: payload.already_paid,
  }
}
