import { describe, expect, it } from 'vitest'

import {
  buildSearchQuery,
  clearFilters,
  countActiveFilters,
  EMPTY_SEARCH_PARAMS,
  parseSearchParams,
  searchUrl,
  withFilters,
} from '@/lib/search/search.params'
import { DEFAULT_RADIUS_KM } from '@/types/search'

const parse = (query: string) => parseSearchParams(new URLSearchParams(query))

describe('parseSearchParams', () => {
  it('reads the full URL from doc 03 §2', () => {
    const params = parse(
      'q=busilica&city=Beograd&lat=44.81&lng=20.46&from=2026-08-20&to=2026-08-22' +
        '&category=alati&price_min=500&price_max=2000&radius=10&sort=distance&page=1'
    )

    expect(params).toEqual({
      q: 'busilica',
      city: 'Beograd',
      lat: 44.81,
      lng: 20.46,
      from: '2026-08-20',
      to: '2026-08-22',
      category: 'alati',
      priceMin: 500,
      priceMax: 2000,
      radiusKm: 10,
      sort: 'distance',
      page: 1,
      mapOpen: false,
    })
  })

  it('falls back to the documented defaults when nothing is given', () => {
    expect(parse('')).toEqual(EMPTY_SEARCH_PARAMS)
    expect(parse('').radiusKm).toBe(DEFAULT_RADIUS_KM)
    expect(parse('').sort).toBe('distance')
    expect(parse('').page).toBe(1)
  })

  it('ignores a coordinate without its pair — one alone cannot centre a search', () => {
    expect(parse('lat=44.81').lat).toBeNull()
    expect(parse('lng=20.46').lng).toBeNull()
    expect(parse('lat=44.81&lng=20.46').lat).toBe(44.81)
  })

  it('rejects coordinates outside the globe', () => {
    expect(parse('lat=91&lng=20').lat).toBeNull()
    expect(parse('lat=44&lng=181').lng).toBeNull()
  })

  it('drops a date range that runs backwards instead of returning nothing', () => {
    const params = parse('from=2026-08-22&to=2026-08-20')
    expect(params.from).toBeNull()
    expect(params.to).toBeNull()
  })

  it('rejects dates that match the shape but are not real days', () => {
    expect(parse('from=2026-02-31').from).toBeNull()
    expect(parse('from=20-08-2026').from).toBeNull()
    expect(parse('from=2026-08-20').from).toBe('2026-08-20')
  })

  it('swaps an inverted price range rather than showing nothing', () => {
    const params = parse('price_min=2000&price_max=500')
    expect(params.priceMin).toBe(500)
    expect(params.priceMax).toBe(2000)
  })

  it('falls back to defaults on malformed values so a shared link still works', () => {
    const params = parse('sort=nonsense&page=abc&radius=-5')
    expect(params.sort).toBe('distance')
    expect(params.page).toBe(1)
    expect(params.radiusKm).toBe(DEFAULT_RADIUS_KM)
  })

  it('treats radius 0 as "Cela Srbija" rather than a missing value', () => {
    expect(parse('radius=0').radiusKm).toBe(0)
  })

  it('reads the mobile map flag', () => {
    expect(parse('map=true').mapOpen).toBe(true)
    expect(parse('map=1').mapOpen).toBe(true)
    expect(parse('map=false').mapOpen).toBe(false)
    expect(parse('').mapOpen).toBe(false)
  })
})

describe('buildSearchQuery', () => {
  it('round-trips a full search', () => {
    const original = parse(
      'q=sator&city=Novi%20Sad&lat=45.26&lng=19.83&from=2026-09-01&to=2026-09-05' +
        '&category=satori&price_min=100&price_max=900&radius=5&sort=price_asc&page=3'
    )
    expect(parseSearchParams(buildSearchQuery(original))).toEqual(original)
  })

  it('omits defaults so equivalent searches share one cache key', () => {
    const query = buildSearchQuery(parse('q=busilica')).toString()
    expect(query).toBe('q=busilica')
    expect(query).not.toContain('radius')
    expect(query).not.toContain('sort')
    expect(query).not.toContain('page')
  })

  it('never emits half a coordinate pair', () => {
    const params = { ...EMPTY_SEARCH_PARAMS, lat: 44.81, lng: null }
    expect(buildSearchQuery(params).has('lat')).toBe(false)
  })

  it('builds a bare path when there is nothing to say', () => {
    expect(searchUrl(EMPTY_SEARCH_PARAMS)).toBe('/search')
    expect(searchUrl({ ...EMPTY_SEARCH_PARAMS, q: 'dron' })).toBe('/search?q=dron')
  })
})

describe('countActiveFilters', () => {
  it('counts only what the filter bar controls', () => {
    // A query, a city and dates are search inputs, not filters.
    expect(countActiveFilters(parse('q=busilica&city=Beograd&from=2026-08-20&to=2026-08-22'))).toBe(0)
    expect(countActiveFilters(parse('category=alati'))).toBe(1)
    expect(countActiveFilters(parse('price_max=2000'))).toBe(1)
    expect(countActiveFilters(parse('price_min=500&price_max=2000'))).toBe(1)
    expect(countActiveFilters(parse('radius=10'))).toBe(1)
    expect(countActiveFilters(parse('category=alati&price_max=2000&radius=5'))).toBe(3)
  })

  it('does not count the default radius as a filter', () => {
    expect(countActiveFilters(parse(`radius=${DEFAULT_RADIUS_KM}`))).toBe(0)
  })
})

describe('clearFilters', () => {
  it('clears filters but keeps the search itself', () => {
    const cleared = clearFilters(parse('q=busilica&city=Beograd&category=alati&price_max=2000&radius=5&page=4'))

    expect(cleared.category).toBeNull()
    expect(cleared.priceMax).toBeNull()
    expect(cleared.radiusKm).toBe(DEFAULT_RADIUS_KM)
    expect(cleared.q).toBe('busilica')
    expect(cleared.city).toBe('Beograd')
    expect(cleared.page).toBe(1)
  })
})

describe('withFilters', () => {
  it('returns to page one whenever the result set changes', () => {
    const onPageFour = parse('q=busilica&page=4')
    expect(withFilters(onPageFour, { category: 'alati' }).page).toBe(1)
    expect(withFilters(onPageFour, { priceMax: 500 }).page).toBe(1)
  })

  it('leaves paging alone when only the page changes', () => {
    expect(withFilters(parse('q=busilica'), { page: 2 }).page).toBe(2)
  })

  it('does not reset paging when the mobile map is toggled', () => {
    expect(withFilters(parse('q=busilica&page=3'), { mapOpen: true }).page).toBe(3)
  })
})
