import { describe, expect, it } from 'vitest'

import { utcTodayIso } from '@/lib/bookings/bookings.helpers'
import { validateCreateRequestInput, validateMessageBody } from '@/lib/bookings/bookings.validation'
import { MESSAGE_MAX, MESSAGE_TYPES } from '@/types'

const listingId = '11111111-1111-4111-8111-111111111111'

function tomorrowIso(): string {
  const date = new Date(`${utcTodayIso()}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function dayAfterTomorrowIso(): string {
  const date = new Date(`${utcTodayIso()}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 2)
  return date.toISOString().slice(0, 10)
}

describe('validateCreateRequestInput', () => {
  it('accepts a message without dates', () => {
    expect(
      validateCreateRequestInput({ listingId, body: 'Zdravo, da li je slobodno?' })
    ).toEqual({})
  })

  it('accepts a valid date pair', () => {
    expect(
      validateCreateRequestInput({
        listingId,
        body: 'Zdravo',
        startDate: tomorrowIso(),
        endDate: dayAfterTomorrowIso(),
      })
    ).toEqual({})
  })

  it('rejects an empty message', () => {
    expect(validateCreateRequestInput({ listingId, body: '   ' }).body).toBe('Napiši poruku vlasniku.')
  })

  it('rejects a message over 2000 characters', () => {
    expect(validateCreateRequestInput({ listingId, body: 'a'.repeat(MESSAGE_MAX + 1) }).body).toContain(
      '2000'
    )
  })

  it('rejects a start date without an end date', () => {
    expect(
      validateCreateRequestInput({ listingId, body: 'Zdravo', startDate: tomorrowIso(), endDate: null })
        .endDate
    ).toBe('Izaberi i datum do.')
  })

  it('rejects an inverted range', () => {
    expect(
      validateCreateRequestInput({
        listingId,
        body: 'Zdravo',
        startDate: dayAfterTomorrowIso(),
        endDate: tomorrowIso(),
      }).endDate
    ).toBe('Datum do mora biti posle datuma od.')
  })

  it('rejects a date in the past', () => {
    expect(
      validateCreateRequestInput({
        listingId,
        body: 'Zdravo',
        startDate: '2020-01-01',
        endDate: '2020-01-03',
      }).startDate
    ).toBe('Datum ne može biti u prošlosti.')
  })
})

describe('validateMessageBody', () => {
  it('rejects a blank reply', () => {
    expect(validateMessageBody('  ')).toBe('Napiši poruku.')
  })

  it('accepts a normal reply', () => {
    expect(validateMessageBody('Može u petak.')).toBeNull()
  })
})

describe('MESSAGE_TYPES', () => {
  it('includes the spec system request type', () => {
    expect(MESSAGE_TYPES).toContain('system_booking_requested')
  })
})
