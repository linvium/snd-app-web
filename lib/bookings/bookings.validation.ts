import { MESSAGE_MAX, MESSAGE_MIN } from '@/types/booking'
import { inclusiveDaysCount, isIsoDate, utcTodayIso } from '@/lib/bookings/bookings.helpers'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface CreateRequestFields {
  listingId?: string
  body?: string
  startDate?: string | null
  endDate?: string | null
}

export function validateCreateRequestInput(input: CreateRequestFields): Record<string, string> {
  const fields: Record<string, string> = {}
  const body = input.body?.trim() ?? ''

  if (!input.listingId || !UUID_RE.test(input.listingId)) {
    fields.listingId = 'Oglas nije pronađen.'
  }

  if (body.length < MESSAGE_MIN) {
    fields.body = 'Napiši poruku vlasniku.'
  } else if (body.length > MESSAGE_MAX) {
    fields.body = `Poruka može imati najviše ${MESSAGE_MAX} karaktera.`
  }

  const start = input.startDate ?? null
  const end = input.endDate ?? null

  if (start && !end) {
    fields.endDate = 'Izaberi i datum do.'
  } else if (!start && end) {
    fields.startDate = 'Izaberi i datum od.'
  } else if (start && end) {
    if (!isIsoDate(start) || !isIsoDate(end)) {
      fields.startDate = 'Datumi nisu ispravni.'
    } else if (end < start) {
      fields.endDate = 'Datum do mora biti posle datuma od.'
    } else if (start < utcTodayIso()) {
      fields.startDate = 'Datum ne može biti u prošlosti.'
    } else if (inclusiveDaysCount(start, end) == null) {
      fields.startDate = 'Datumi nisu ispravni.'
    }
  }

  return fields
}

export function validateMessageBody(body: string | undefined): string | null {
  const trimmed = body?.trim() ?? ''
  if (trimmed.length < MESSAGE_MIN) return 'Napiši poruku.'
  if (trimmed.length > MESSAGE_MAX) return `Poruka može imati najviše ${MESSAGE_MAX} karaktera.`
  return null
}

export function isBookingResponseAction(value: unknown): value is 'accept' | 'decline' | 'propose' {
  return value === 'accept' || value === 'decline' || value === 'propose'
}

export function validateProposedDates(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return 'Izaberi oba datuma.'
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return 'Datumi nisu ispravni.'
  if (endDate < startDate) return 'Datum do mora biti posle datuma od.'
  if (startDate < utcTodayIso()) return 'Datum ne može biti u prošlosti.'
  if (inclusiveDaysCount(startDate, endDate) == null) return 'Datumi nisu ispravni.'
  return null
}
