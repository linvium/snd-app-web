import { describe, expect, it } from 'vitest'

import {
  addDaysIso,
  datesInRange,
  isRangeAvailable,
  suggestNearestRange,
} from '@/lib/availability'

describe('datesInRange', () => {
  it('includes both ends', () => {
    expect(datesInRange('2026-08-20', '2026-08-22')).toEqual([
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
    ])
  })

  it('returns nothing for a backwards range', () => {
    expect(datesInRange('2026-08-22', '2026-08-20')).toEqual([])
  })

  it('crosses a month boundary', () => {
    expect(datesInRange('2026-08-31', '2026-09-01')).toEqual(['2026-08-31', '2026-09-01'])
  })

  it('crosses a leap day', () => {
    expect(datesInRange('2028-02-28', '2028-03-01')).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ])
  })
})

describe('isRangeAvailable', () => {
  // doc 04 §16, "Nedostupni datumi".
  it('rejects a range containing a blocked day in the middle', () => {
    expect(isRangeAvailable('2026-08-20', '2026-08-22', ['2026-08-21'])).toBe(false)
  })

  it('rejects a range blocked only on its first or last day', () => {
    expect(isRangeAvailable('2026-08-20', '2026-08-22', ['2026-08-20'])).toBe(false)
    expect(isRangeAvailable('2026-08-20', '2026-08-22', ['2026-08-22'])).toBe(false)
  })

  it('accepts a range that merely sits next to a blocked day', () => {
    // The day after the return is somebody else's pickup day, not a conflict.
    expect(isRangeAvailable('2026-08-20', '2026-08-22', ['2026-08-23'])).toBe(true)
  })

  it('accepts a range when nothing is blocked', () => {
    expect(isRangeAvailable('2026-08-20', '2026-08-22', [])).toBe(true)
  })
})

describe('suggestNearestRange', () => {
  const today = '2026-08-01'

  it('slides forward to the first window of the same length', () => {
    // Three days wanted, 21.08 taken: 22–24 is the first that fits.
    const suggestion = suggestNearestRange('2026-08-20', '2026-08-22', ['2026-08-21'], { today })
    expect(suggestion).toEqual({ start: '2026-08-22', end: '2026-08-24' })
  })

  it('keeps the requested length rather than offering a shorter stay', () => {
    const suggestion = suggestNearestRange('2026-08-20', '2026-08-26', ['2026-08-22'], { today })
    expect(suggestion).not.toBeNull()
    expect(datesInRange(suggestion!.start, suggestion!.end)).toHaveLength(7)
  })

  it('searches forward from the request, not from today', () => {
    // 02.08 is free and much sooner, but the person asked about late August.
    const suggestion = suggestNearestRange('2026-08-20', '2026-08-20', ['2026-08-20'], { today })
    expect(suggestion).toEqual({ start: '2026-08-21', end: '2026-08-21' })
  })

  it('never suggests a date in the past', () => {
    const suggestion = suggestNearestRange('2026-07-01', '2026-07-02', ['2026-07-01'], { today })
    expect(suggestion!.start >= today).toBe(true)
  })

  it('gives up rather than looking past the bookable horizon', () => {
    // Every day blocked for the next two months, with a one-month horizon.
    const blocked = Array.from({ length: 70 }, (_, index) => addDaysIso(today, index))
    expect(
      suggestNearestRange('2026-08-01', '2026-08-02', blocked, { today, monthsAhead: 1 })
    ).toBeNull()
  })
})
