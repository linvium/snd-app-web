import { describe, expect, it } from 'vitest'

import {
  estimateRentalPriceMinor,
  inclusiveDaysCount,
  isIsoDate,
  previewMessage,
} from '@/lib/bookings/bookings.helpers'

describe('inclusiveDaysCount', () => {
  it('counts inclusive days: 20–22 → 3', () => {
    expect(inclusiveDaysCount('2026-08-20', '2026-08-22')).toBe(3)
  })

  it('counts a single day as 1', () => {
    expect(inclusiveDaysCount('2026-08-20', '2026-08-20')).toBe(1)
  })

  it('returns null when either date is missing', () => {
    expect(inclusiveDaysCount(null, '2026-08-22')).toBeNull()
    expect(inclusiveDaysCount('2026-08-20', null)).toBeNull()
    expect(inclusiveDaysCount(null, null)).toBeNull()
  })

  it('returns null when the range is inverted', () => {
    expect(inclusiveDaysCount('2026-08-22', '2026-08-20')).toBeNull()
  })
})

describe('estimateRentalPriceMinor', () => {
  it('multiplies days by the 1-day rate for an internal snapshot', () => {
    expect(estimateRentalPriceMinor(3, 80000)).toBe(240000)
  })

  it('returns 0 when dates are missing', () => {
    expect(estimateRentalPriceMinor(null, 80000)).toBe(0)
  })

  it('is not a UI "ukupno" helper — it only returns a number', () => {
    const snapshot = estimateRentalPriceMinor(7, 80000)
    expect(typeof snapshot).toBe('number')
    expect(String(snapshot)).not.toMatch(/ukupno|RSD/i)
  })
})

describe('isIsoDate', () => {
  it('accepts a real calendar date', () => {
    expect(isIsoDate('2026-08-20')).toBe(true)
  })

  it('rejects impossible dates', () => {
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('20.08.2026')).toBe(false)
  })
})

describe('previewMessage', () => {
  it('trims and caps at 160 characters', () => {
    expect(previewMessage('  zdravo  ')).toBe('zdravo')
    expect(previewMessage('a'.repeat(200)).length).toBe(160)
  })
})
