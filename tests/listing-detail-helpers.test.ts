import { describe, expect, it } from 'vitest'

import {
  buildBreadcrumb,
  buildPriceTiers,
  captureListingQuoteSeed,
  guaranteeCapMinor,
  inheritedGuaranteeCap,
  listingQuoteFromDetail,
  listingQuoteSeedForDates,
  placeLabel,
  pluralizeRatings,
  pluralizeReviews,
  responseRateText,
  responseTimeText,
  toDetailImages,
  toListingQuote,
  bookingQuotePanel,
} from '@/lib/listings/listings.detail'
import type { CategoryNode } from '@/types/listing-detail'

const ENOUGH = { conversation_count: 12 }

describe('responseTimeText', () => {
  // doc 04 §5, the band table.
  it.each([
    [12, 'Odgovara za 12 min'],
    [59, 'Odgovara za 59 min'],
    [90, 'Odgovara za oko 2 sata'],
    [179, 'Odgovara za oko 3 sata'],
    [400, 'Odgovara istog dana'],
    [1440, 'Odgovara istog dana'],
    [2000, 'Odgovara u roku od par dana'],
  ])('renders %i minutes as %s', (minutes, expected) => {
    expect(responseTimeText({ ...ENOUGH, avg_response_minutes: minutes })).toBe(expected)
  })

  // doc 04 §16, "Vlasnik bez dovoljno razgovora".
  it('shows nothing below five conversations, however good the number looks', () => {
    expect(responseTimeText({ avg_response_minutes: 5, conversation_count: 2 })).toBeNull()
    expect(responseRateText({ response_rate: 100, conversation_count: 2 })).toBeNull()
  })

  it('shows nothing when the metric has never been computed', () => {
    expect(responseTimeText({ ...ENOUGH, avg_response_minutes: null })).toBeNull()
    expect(responseRateText({ ...ENOUGH, response_rate: null })).toBeNull()
  })

  it('appears exactly at the five-conversation threshold', () => {
    expect(responseTimeText({ avg_response_minutes: 30, conversation_count: 5 })).toBe(
      'Odgovara za 30 min'
    )
  })
})

describe('responseRateText', () => {
  it('rounds to a whole percent', () => {
    expect(responseRateText({ ...ENOUGH, response_rate: 97.6 })).toBe('Odgovara na 98% poruka')
  })
})

describe('buildPriceTiers', () => {
  // doc 04 §7.
  it('skips tiers that have no price', () => {
    const tiers = buildPriceTiers({
      price_1_day_minor: 80000,
      price_3_days_minor: null,
      price_7_days_minor: 420000,
    })
    expect(tiers.map((tier) => tier.days)).toEqual([1, 7])
  })

  it('rounds the per-day figure down, never up', () => {
    // 2.100 / 3 is exact; 2.101 / 3 must not advertise a rate below the truth.
    const [, threeDays] = buildPriceTiers({
      price_1_day_minor: 80000,
      price_3_days_minor: 210100,
      price_7_days_minor: null,
    })
    expect(threeDays.per_day_minor).toBe(70033)
  })

  it('marks the saving against the same days bought singly', () => {
    const [, threeDays, sevenDays] = buildPriceTiers({
      price_1_day_minor: 80000,
      price_3_days_minor: 210000,
      price_7_days_minor: 420000,
    })
    expect(threeDays.saving_percent).toBe(13)
    expect(sevenDays.saving_percent).toBe(25)
  })

  it('shows no badge when the package saves nothing', () => {
    const [oneDay, threeDays] = buildPriceTiers({
      price_1_day_minor: 80000,
      price_3_days_minor: 240000,
      price_7_days_minor: null,
    })
    expect(oneDay.saving_percent).toBeNull()
    expect(threeDays.saving_percent).toBeNull()
  })
})

describe('guaranteeCapMinor', () => {
  // doc 04 §10: capped at the item's own value when the item is worth less.
  it('takes the lower of the category cap and the item value', () => {
    expect(guaranteeCapMinor(20_000_000, 2_500_000)).toBe(2_500_000)
    expect(guaranteeCapMinor(20_000_000, 50_000_000)).toBe(20_000_000)
  })

  it('falls back to whichever number exists', () => {
    expect(guaranteeCapMinor(null, 2_500_000)).toBe(2_500_000)
    expect(guaranteeCapMinor(20_000_000, null)).toBe(20_000_000)
    expect(guaranteeCapMinor(null, null)).toBeNull()
  })
})

describe('buildBreadcrumb', () => {
  const nodes: CategoryNode[] = [
    { id: 'a', parent_id: null, name: 'Alati', slug: 'alati', level: 0, guarantee_cap_minor: 20_000_000 },
    { id: 'b', parent_id: 'a', name: 'Električni alat', slug: 'elektricni-alat', level: 1, guarantee_cap_minor: null },
    { id: 'c', parent_id: 'b', name: 'Bušilice', slug: 'busilice', level: 2, guarantee_cap_minor: null },
  ]
  const byId = new Map(nodes.map((node) => [node.id, node]))

  it('returns the trail root-first', () => {
    expect(buildBreadcrumb('c', byId).map((node) => node.slug)).toEqual([
      'alati',
      'elektricni-alat',
      'busilice',
    ])
  })

  it('returns nothing for a listing with no category', () => {
    expect(buildBreadcrumb(null, byId)).toEqual([])
  })

  it('inherits the cap from the nearest ancestor that sets one', () => {
    expect(inheritedGuaranteeCap(buildBreadcrumb('c', byId))).toBe(20_000_000)
  })

  it('terminates on a cycle instead of looping forever', () => {
    // A bad parent_id must not hang the page that renders the breadcrumb.
    const cyclic = new Map<string, CategoryNode>([
      ['x', { id: 'x', parent_id: 'y', name: 'X', slug: 'x', level: 1, guarantee_cap_minor: null }],
      ['y', { id: 'y', parent_id: 'x', name: 'Y', slug: 'y', level: 0, guarantee_cap_minor: null }],
    ])
    expect(buildBreadcrumb('x', cyclic).map((node) => node.slug)).toEqual(['y', 'x'])
  })
})

describe('Serbian plurals', () => {
  it('agrees for ratings', () => {
    expect(pluralizeRatings(1)).toBe('1 ocena')
    expect(pluralizeRatings(2)).toBe('2 ocene')
    expect(pluralizeRatings(5)).toBe('5 ocena')
    expect(pluralizeRatings(12)).toBe('12 ocena')
    expect(pluralizeRatings(21)).toBe('21 ocena')
  })

  it('agrees for reviews', () => {
    expect(pluralizeReviews(1)).toBe('1 recenzija')
    expect(pluralizeReviews(3)).toBe('3 recenzije')
    expect(pluralizeReviews(12)).toBe('12 recenzija')
  })
})

describe('toDetailImages', () => {
  it('maps storage urls without pixel size columns', () => {
    expect(
      toDetailImages([
        {
          id: 'img-1',
          thumbnail_url: 'https://cdn.example/t.webp',
          medium_url: 'https://cdn.example/m.webp',
          large_url: 'https://cdn.example/l.webp',
          sort_order: 0,
        },
      ])
    ).toEqual([
      {
        id: 'img-1',
        thumbnail_url: 'https://cdn.example/t.webp',
        medium_url: 'https://cdn.example/m.webp',
        large_url: 'https://cdn.example/l.webp',
        sort_order: 0,
      },
    ])
  })

  it('treats a failed query as no images, not a crash', () => {
    expect(toDetailImages(null)).toEqual([])
  })
})

describe('placeLabel', () => {
  it('prints municipality then city', () => {
    expect(placeLabel('Zvezdara', 'Beograd')).toBe('Zvezdara, Beograd')
  })

  it('does not repeat the city when both fields are the same', () => {
    expect(placeLabel('Beograd', 'Beograd')).toBe('Beograd')
  })

  it('shows Cyrillic place names in latinica', () => {
    expect(placeLabel('Звездара', 'Београд')).toBe('Zvezdara, Beograd')
    expect(placeLabel('Београд', 'Beograd')).toBe('Beograd')
  })
})

describe('bookingQuotePanel', () => {
  const idle = {
    hasDates: false,
    hasQuote: false,
    isPending: false,
    delayedPending: false,
    quoteUiReady: false,
  }

  it('keeps the package tiers until dates are picked', () => {
    expect(bookingQuotePanel(idle)).toBe('tiers')
  })

  it('does not flash a skeleton for a quote that returns inside 500 ms', () => {
    expect(
      bookingQuotePanel({
        ...idle,
        hasDates: true,
        isPending: true,
        delayedPending: false,
      })
    ).toBe('tiers')
  })

  it('shows a skeleton once the quote has been pending long enough', () => {
    expect(
      bookingQuotePanel({
        ...idle,
        hasDates: true,
        isPending: true,
        delayedPending: true,
      })
    ).toBe('skeleton')
  })

  it('skeletons immediately when dates change after a total was already shown', () => {
    expect(
      bookingQuotePanel({
        ...idle,
        hasDates: true,
        isPending: true,
        quoteUiReady: true,
      })
    ).toBe('skeleton')
  })

  it('shows the server quote once it arrives', () => {
    expect(
      bookingQuotePanel({
        ...idle,
        hasDates: true,
        hasQuote: true,
        quoteUiReady: true,
      })
    ).toBe('quote')
  })
})

describe('toListingQuote', () => {
  const prices = {
    price_1_day_minor: 10000,
    price_3_days_minor: null,
    price_7_days_minor: null,
  }

  it('prices an available window and flags it as free', () => {
    const quote = toListingQuote('2026-08-29', '2026-08-30', prices, [], '2026-08-24')
    expect(quote.days_count).toBe(2)
    expect(quote.rental_price_minor).toBe(20000)
    expect(quote.is_available).toBe(true)
    expect(quote.suggested_start).toBeNull()
  })

  it('still prices a blocked window and suggests the next free one', () => {
    const quote = toListingQuote(
      '2026-08-29',
      '2026-08-30',
      prices,
      ['2026-08-29'],
      '2026-08-24'
    )
    expect(quote.is_available).toBe(false)
    expect(quote.total_minor).toBeGreaterThan(0)
    expect(quote.suggested_start).toBe('2026-08-30')
  })
})

describe('listingQuoteFromDetail', () => {
  const listing = {
    status: 'published' as const,
    price_1_day_minor: 10000,
    price_3_days_minor: null,
    price_7_days_minor: null,
    unavailable_dates: [] as string[],
  }

  it('returns a quote when both dates are on a published listing', () => {
    const quote = listingQuoteFromDetail(listing, '2026-08-29', '2026-08-30', '2026-08-24')
    expect(quote?.days_count).toBe(2)
    expect(quote?.is_available).toBe(true)
  })

  it('returns null when dates are missing, past, or the listing is not live', () => {
    expect(listingQuoteFromDetail(listing, null, '2026-08-30', '2026-08-24')).toBeNull()
    expect(listingQuoteFromDetail(listing, '2026-08-20', '2026-08-30', '2026-08-24')).toBeNull()
    expect(
      listingQuoteFromDetail(
        { ...listing, status: 'paused' },
        '2026-08-29',
        '2026-08-30',
        '2026-08-24'
      )
    ).toBeNull()
  })
})

describe('listing quote seed', () => {
  const quote = toListingQuote(
    '2026-08-29',
    '2026-08-30',
    { price_1_day_minor: 10000, price_3_days_minor: null, price_7_days_minor: null },
    [],
    '2026-08-24'
  )

  it('applies the SSR quote only while the card still shows those dates', () => {
    const seed = captureListingQuoteSeed(null, quote, '2026-08-29', '2026-08-30')
    expect(listingQuoteSeedForDates(seed, '2026-08-29', '2026-08-30')).toEqual(quote)
    expect(listingQuoteSeedForDates(seed, '2026-08-24', '2026-08-24')).toBeUndefined()
  })

  it('does not recapture after the first range, so a later initialQuote cannot stick', () => {
    const first = captureListingQuoteSeed(null, quote, '2026-08-29', '2026-08-30')
    const other = { ...quote, days_count: 1, total_minor: 11000 }
    const next = captureListingQuoteSeed(first, other, '2026-08-24', '2026-08-24')
    expect(next).toEqual(first)
    expect(listingQuoteSeedForDates(next, '2026-08-24', '2026-08-24')).toBeUndefined()
  })
})
