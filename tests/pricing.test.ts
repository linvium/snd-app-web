import { describe, expect, it } from 'vitest'

import {
  calculateRentalPrice,
  daysBetweenInclusive,
  quoteForRange,
  roundHalfUp,
} from '@/lib/pricing'

const STANDARD = { price_1_day_minor: 1000, price_3_days_minor: 2400, price_7_days_minor: 4800 }

describe('calculateRentalPrice', () => {
  // The nine rows doc 00 §6.1 marks as obavezni test slučajevi.
  it.each([
    [1, STANDARD, 1000, 'one day'],
    [3, STANDARD, 2400, 'the 3-day package'],
    [4, STANDARD, 3400, '3-day package + 1 day'],
    [7, STANDARD, 4800, 'the 7-day package'],
    [8, STANDARD, 5800, '7-day package + 1 day'],
    [10, STANDARD, 7200, '7-day package + 3-day package'],
    [2, STANDARD, 2000, 'two single days beat the 3-day package'],
    [
      2,
      { price_1_day_minor: 1000, price_3_days_minor: 1800, price_7_days_minor: 4800 },
      1800,
      'the 3-day package beats two single days',
    ],
    [
      5,
      { price_1_day_minor: 1000, price_3_days_minor: null, price_7_days_minor: null },
      5000,
      'daily price only',
    ],
  ])('covers %i days at %#: expects %i', (days, prices, expected, _why) => {
    expect(calculateRentalPrice(days, prices).rental_price_minor).toBe(expected)
  })

  it('itemises which packages made up the total', () => {
    expect(calculateRentalPrice(10, STANDARD).price_breakdown).toEqual([
      { package: '7_days', count: 1, amount_minor: 4800 },
      { package: '3_days', count: 1, amount_minor: 2400 },
    ])
  })

  it('reports the overshooting package as what was actually charged', () => {
    // Two days billed as the cheaper three-day package: the line has to say
    // "3 dana", because that is the package the money bought.
    const result = calculateRentalPrice(2, {
      price_1_day_minor: 1000,
      price_3_days_minor: 1800,
      price_7_days_minor: null,
    })
    expect(result.price_breakdown).toEqual([{ package: '3_days', count: 1, amount_minor: 1800 }])
  })

  it('never charges more than the same days bought one at a time', () => {
    const prices = { price_1_day_minor: 800, price_3_days_minor: 2100, price_7_days_minor: 4200 }
    for (let days = 1; days <= 40; days += 1) {
      const total = calculateRentalPrice(days, prices).rental_price_minor
      expect(total).toBeLessThanOrEqual(days * prices.price_1_day_minor)
    }
  })

  it('is monotonic: an extra day never lowers the price', () => {
    const prices = { price_1_day_minor: 1000, price_3_days_minor: 1800, price_7_days_minor: 3000 }
    let previous = 0
    for (let days = 1; days <= 30; days += 1) {
      const total = calculateRentalPrice(days, prices).rental_price_minor
      expect(total).toBeGreaterThanOrEqual(previous)
      previous = total
    }
  })

  it('falls back to a synthetic 7-day price built from the cheaper tiers', () => {
    // p7 missing, so it may not cost more than 3+3+1 nor more than 7 singles.
    const result = calculateRentalPrice(7, {
      price_1_day_minor: 1000,
      price_3_days_minor: 1800,
      price_7_days_minor: null,
    })
    expect(result.rental_price_minor).toBe(4600)
  })
})

describe('daysBetweenInclusive', () => {
  // doc 00 §3.10: both ends count.
  it('counts both the pickup and the return day', () => {
    expect(daysBetweenInclusive('2026-08-20', '2026-08-22')).toBe(3)
    expect(daysBetweenInclusive('2026-08-20', '2026-08-20')).toBe(1)
  })

  it('counts across a month boundary', () => {
    expect(daysBetweenInclusive('2026-08-30', '2026-09-02')).toBe(4)
  })

  it('counts across a DST change, because the dates are read as UTC', () => {
    // Europe/Belgrade moves the clock on 25.10.2026; a local-time subtraction
    // would return 2,96 days here and round to the wrong day count.
    expect(daysBetweenInclusive('2026-10-24', '2026-10-26')).toBe(3)
  })
})

describe('roundHalfUp', () => {
  it('sends an exact half upward (doc 00 §6.2)', () => {
    expect(roundHalfUp(0.5)).toBe(1)
    expect(roundHalfUp(1.5)).toBe(2)
    expect(roundHalfUp(2.4)).toBe(2)
  })
})

describe('quoteForRange', () => {
  // doc 04 §16, "Obračun cene za 3 dana".
  it('matches the worked example on the item page', () => {
    const quote = quoteForRange('2026-08-20', '2026-08-22', {
      price_1_day_minor: 80000,
      price_3_days_minor: 210000,
      price_7_days_minor: 420000,
    })

    expect(quote.days_count).toBe(3)
    expect(quote.rental_price_minor).toBe(210000)
    expect(quote.service_fee_minor).toBe(21000)
    expect(quote.total_minor).toBe(231000)
  })

  it('deducts the owner commission from the payout rather than the total', () => {
    const quote = quoteForRange('2026-08-20', '2026-08-22', {
      price_1_day_minor: 80000,
      price_3_days_minor: 210000,
      price_7_days_minor: 420000,
    })

    expect(quote.owner_payout_minor).toBe(210000 - 10500)
    // The renter's total is untouched by what the owner is charged.
    expect(quote.total_minor).toBe(quote.rental_price_minor + quote.service_fee_minor)
  })
})
