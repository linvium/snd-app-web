import { NextRequest } from 'next/server'

import { isRangeAvailable, suggestNearestRange, todayIso } from '@/lib/availability'
import { apiError, ERROR_CODES } from '@/lib/api/response'
import { AVAILABILITY_MONTHS_AHEAD, quoteForRange } from '@/lib/pricing'
import { createClient } from '@/lib/supabase/server'
import { addDaysIso } from '@/lib/availability'
import type { ListingQuote } from '@/types/listing-detail'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * POST /api/v1/listings/<id>/quote — doc 04 §13.2.
 *
 * The whole reason this is a request and not a function call in the browser:
 * the price shown has to be the price charged, and a number computed client-side
 * is a number the client can change. The booking card renders whatever comes
 * back and computes nothing of its own.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  let body: { start_date?: unknown; end_date?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return apiError(400, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const startDate = typeof body.start_date === 'string' ? body.start_date : ''
  const endDate = typeof body.end_date === 'string' ? body.end_date : ''

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Izaberi datume preuzimanja i vraćanja.', {
      start_date: 'Izaberi datum preuzimanja.',
      end_date: 'Izaberi datum vraćanja.',
    })
  }

  if (endDate < startDate) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Datum vraćanja mora biti posle preuzimanja.', {
      end_date: 'Datum vraćanja mora biti posle datuma preuzimanja.',
    })
  }

  const today = todayIso()
  if (startDate < today) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Datum preuzimanja je u prošlosti.', {
      start_date: 'Izaberi datum od danas pa nadalje.',
    })
  }

  const supabase = await createClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, status, price_1_day_minor, price_3_days_minor, price_7_days_minor')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[quote] listing load failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  if (!listing || listing.price_1_day_minor == null) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  if (listing.status !== 'published') {
    return apiError(409, ERROR_CODES.CONFLICT, 'Ovaj oglas trenutno nije aktivan.')
  }

  const horizon = addDaysIso(today, Math.round(AVAILABILITY_MONTHS_AHEAD * 30.5))
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('listing_id', id)
    .gte('date', today)
    .lte('date', horizon)

  const unavailable = new Set((blocked ?? []).map((row) => row.date as string))
  const available = isRangeAvailable(startDate, endDate, unavailable)
  const suggestion = available
    ? null
    : suggestNearestRange(startDate, endDate, unavailable, { today })

  const quote = quoteForRange(startDate, endDate, {
    price_1_day_minor: Number(listing.price_1_day_minor),
    price_3_days_minor: (listing.price_3_days_minor as number | null) ?? null,
    price_7_days_minor: (listing.price_7_days_minor as number | null) ?? null,
  })

  // Priced even when unavailable: the card still shows what those days would
  // have cost alongside the nearest free window, so the alternative can be
  // judged against a number rather than against nothing.
  const payload: ListingQuote = {
    days_count: quote.days_count,
    rental_price_minor: quote.rental_price_minor,
    service_fee_minor: quote.service_fee_minor,
    total_minor: quote.total_minor,
    price_breakdown: quote.price_breakdown,
    is_available: available,
    suggested_start: suggestion?.start ?? null,
    suggested_end: suggestion?.end ?? null,
  }

  return Response.json(payload)
}
