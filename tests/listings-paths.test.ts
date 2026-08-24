import { describe, expect, it } from 'vitest'

import {
  listingEditPath,
  listingPublicPath,
  parseListingDates,
} from '@/lib/listings/listings.paths'

describe('listingPublicPath', () => {
  it('returns the bare slug when no dates are given', () => {
    expect(listingPublicPath('busilica')).toBe('/listings/busilica')
    expect(listingPublicPath('busilica', null)).toBe('/listings/busilica')
    expect(listingPublicPath('busilica', { from: null, to: null })).toBe('/listings/busilica')
  })

  it('omits the query when only one date is set', () => {
    expect(listingPublicPath('busilica', { from: '2026-08-22', to: null })).toBe(
      '/listings/busilica'
    )
    expect(listingPublicPath('busilica', { from: null, to: '2026-08-24' })).toBe(
      '/listings/busilica'
    )
  })

  it('appends from and to when both dates are set', () => {
    expect(listingPublicPath('busilica', { from: '2026-08-22', to: '2026-08-24' })).toBe(
      '/listings/busilica?from=2026-08-22&to=2026-08-24'
    )
  })
})

describe('listingEditPath', () => {
  it('stays on the owner edit URL without dates', () => {
    expect(listingEditPath('11111111-1111-4111-8111-111111111111')).toBe(
      '/profile/listings/11111111-1111-4111-8111-111111111111/edit'
    )
  })
})

describe('parseListingDates', () => {
  const parse = (query: string) => parseListingDates(new URLSearchParams(query))

  it('reads a valid range', () => {
    expect(parse('from=2026-08-22&to=2026-08-24')).toEqual({
      from: '2026-08-22',
      to: '2026-08-24',
    })
  })

  it('drops garbage and inverted ranges', () => {
    expect(parse('from=foo&to=bar')).toEqual({ from: null, to: null })
    expect(parse('from=2026-02-31&to=2026-08-24')).toEqual({ from: null, to: '2026-08-24' })
    expect(parse('from=2026-08-24&to=2026-08-22')).toEqual({ from: null, to: null })
  })

  it('keeps a lone valid date', () => {
    expect(parse('from=2026-08-22')).toEqual({ from: '2026-08-22', to: null })
  })

  it('reads Next.js searchParams records', () => {
    expect(parseListingDates({ from: '2026-08-29', to: '2026-08-30' })).toEqual({
      from: '2026-08-29',
      to: '2026-08-30',
    })
  })
})
