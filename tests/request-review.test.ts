import { describe, expect, it } from 'vitest'

import { OWNER_COMMISSION_RATE } from '@/lib/pricing/pricing.config'
import { roundHalfUp } from '@/lib/pricing/pricing.helpers'
import {
  bookingDurationLabel,
  compactBookingRange,
  ownerReviewMoney,
  pendingRequestBannerDetail,
  proposedDatesMessage,
  requestExpiryCaption,
  requestExpiryLabel,
} from '@/lib/messages/request-review.helpers'

describe('compactBookingRange', () => {
  it('joins two days in the same month with a hyphen', () => {
    expect(compactBookingRange('2026-08-22', '2026-08-23')).toBe('22-23. avg')
  })

  it('keeps both months when they differ', () => {
    expect(compactBookingRange('2026-08-31', '2026-09-02')).toBe('31. avg - 2. sep')
  })

  it('returns null without a start date', () => {
    expect(compactBookingRange(null, '2026-08-23')).toBeNull()
  })
})

describe('requestExpiryLabel', () => {
  const requestedAt = '2026-08-20T10:00:00.000Z'

  it('counts remaining hours inside the first day', () => {
    expect(requestExpiryLabel(requestedAt, new Date('2026-08-20T13:00:00.000Z'))).toBe(
      'ističe za 21 h'
    )
  })

  it('says the window has closed', () => {
    expect(requestExpiryLabel(requestedAt, new Date('2026-08-21T11:00:00.000Z'))).toBe('Istekao')
  })
})

describe('requestExpiryCaption', () => {
  it('capitalizes the remaining-time label for the ticket footer', () => {
    expect(requestExpiryCaption('2026-08-20T10:00:00.000Z', new Date('2026-08-20T13:00:00.000Z'))).toBe(
      'Ističe za 21 h'
    )
  })
})

describe('pendingRequestBannerDetail', () => {
  it('joins the date range and the expiry', () => {
    expect(
      pendingRequestBannerDetail(
        {
          start_date: '2026-08-22',
          end_date: '2026-08-23',
          requested_at: '2026-08-20T10:00:00.000Z',
        },
        new Date('2026-08-20T13:00:00.000Z')
      )
    ).toBe('22-23. avg · ističe za 21 h')
  })
})

describe('bookingDurationLabel', () => {
  it('uses the Serbian plural', () => {
    expect(bookingDurationLabel(1)).toBe('1 dan')
    expect(bookingDurationLabel(2)).toBe('2 dana')
    expect(bookingDurationLabel(21)).toBe('21 dan')
  })
})

describe('ownerReviewMoney', () => {
  it('does not invent a payout when the snapshot is empty', () => {
    expect(
      ownerReviewMoney(
        { days_count: null, rental_price_minor: 0 },
        { price_1_day_minor: 80000, item_value_minor: 400000 }
      )
    ).toBeNull()
  })

  it('deducts the owner commission from the rental snapshot', () => {
    const rentalMinor = 240000
    const money = ownerReviewMoney(
      { days_count: 2, rental_price_minor: rentalMinor },
      { price_1_day_minor: 120000, item_value_minor: 400000 }
    )
    const feeMinor = roundHalfUp(rentalMinor * OWNER_COMMISSION_RATE)
    expect(money?.rentalMinor).toBe(rentalMinor)
    expect(money?.depositMinor).toBe(400000)
    expect(money?.feeMinor).toBe(feeMinor)
    expect(money?.payoutMinor).toBe(rentalMinor - feeMinor)
    expect(money?.feePercent).toBe(Math.round(OWNER_COMMISSION_RATE * 100))
  })

  it('omits a deposit when the listing has no item value', () => {
    const money = ownerReviewMoney(
      { days_count: 2, rental_price_minor: 240000 },
      { price_1_day_minor: 120000, item_value_minor: null }
    )
    expect(money?.depositMinor).toBeNull()
  })
})

describe('proposedDatesMessage', () => {
  it('writes a chat line with both dates', () => {
    expect(proposedDatesMessage('2026-08-28', '2026-08-30')).toBe(
      'Predlažem druge datume: 28.08.2026. - 30.08.2026.'
    )
  })
})
