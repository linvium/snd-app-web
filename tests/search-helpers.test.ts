import { describe, expect, it } from 'vitest'

import {
  boundsToRadiusKm,
  defaultSortFor,
  formatDateRange,
  filterPopularSearchTerms,
  searchBarDividerHidden,
  nextSearchBarSegment,
  formatDistance,
  formatPriceMinor,
  formatPricePerDay,
  haversineMeters,
  pluralizeItems,
  priceFilterLabel,
  radiusFilterLabel,
  resolveSearchCenter,
  resultsHeading,
} from '@/lib/search/search.helpers'
import { findCity, normalizeForCompare, searchCities } from '@/lib/geo/serbia-cities'

const BELGRADE = { lat: 44.8125, lng: 20.4612 }
const NOVI_SAD = { lat: 45.2671, lng: 19.8335 }

describe('formatDistance', () => {
  // doc 03 §7.3
  it('rounds anything under a kilometre to the nearest 50 m', () => {
    expect(formatDistance(850)).toBe('850 m')
    expect(formatDistance(837)).toBe('850 m')
    expect(formatDistance(820)).toBe('800 m')
    expect(formatDistance(0)).toBe('0 m')
  })

  it('shows one decimal between 1 and 10 km', () => {
    expect(formatDistance(2340)).toBe('2,3 km')
    expect(formatDistance(1000)).toBe('1,0 km')
    expect(formatDistance(9990)).toBe('10,0 km')
  })

  it('drops the decimal past 10 km, where an approximate pin cannot support it', () => {
    expect(formatDistance(24000)).toBe('24 km')
    expect(formatDistance(24400)).toBe('24 km')
    expect(formatDistance(10000)).toBe('10 km')
  })

  it('rounds 990 m into the kilometre band rather than printing "1000 m"', () => {
    expect(formatDistance(990)).toBe('1,0 km')
  })

  it('returns null when there is no distance to show', () => {
    expect(formatDistance(null)).toBeNull()
    expect(formatDistance(undefined)).toBeNull()
    expect(formatDistance(Number.NaN)).toBeNull()
    expect(formatDistance(-5)).toBeNull()
  })
})

describe('price formatting', () => {
  // doc 00 §2.2 — stored in para, shown in dinars.
  it('converts para to dinars', () => {
    expect(formatPriceMinor(80000)).toBe('800 RSD')
    expect(formatPricePerDay(80000)).toBe('800 RSD / dan')
  })

  it('hides decimals when they are zero', () => {
    expect(formatPriceMinor(110000)).not.toContain(',00')
  })

  it('labels the price chip by which bound is set', () => {
    expect(priceFilterLabel({ priceMin: null, priceMax: null })).toBe('Cena')
    expect(priceFilterLabel({ priceMin: null, priceMax: 2000 })).toContain('Do')
    expect(priceFilterLabel({ priceMin: 500, priceMax: null })).toContain('Od')
    expect(priceFilterLabel({ priceMin: 500, priceMax: 2000 })).toContain('–')
  })
})

describe('haversineMeters', () => {
  it('matches the known Belgrade–Novi Sad distance', () => {
    const km = haversineMeters(BELGRADE, NOVI_SAD) / 1000
    expect(km).toBeGreaterThan(70)
    expect(km).toBeLessThan(80)
  })

  it('is zero for a point against itself', () => {
    expect(haversineMeters(BELGRADE, BELGRADE)).toBeCloseTo(0)
  })
})

describe('resolveSearchCenter', () => {
  // doc 03 §7.4
  it('centres on the user when they are inside the city they picked', () => {
    const inZvezdara = { lat: 44.8005, lng: 20.49 }
    expect(resolveSearchCenter({ cityName: 'Beograd', userCoords: inZvezdara, profileCoords: null }))
      .toEqual({ ...inZvezdara, source: 'user_gps' })
  })

  it('centres on the city when the user is somewhere else entirely', () => {
    const center = resolveSearchCenter({
      cityName: 'Niš',
      userCoords: BELGRADE,
      profileCoords: null,
    })
    expect(center?.source).toBe('city_center')
    expect(center?.lat).toBeCloseTo(43.3209, 3)
  })

  it('falls back to the saved profile location when there is no GPS', () => {
    const home = { lat: 44.82, lng: 20.45 }
    expect(resolveSearchCenter({ cityName: 'Beograd', userCoords: null, profileCoords: home }))
      .toEqual({ ...home, source: 'user_profile' })
  })

  it('prefers the city over a profile location in a different city', () => {
    const center = resolveSearchCenter({
      cityName: 'Novi Sad',
      userCoords: null,
      profileCoords: BELGRADE,
    })
    expect(center?.source).toBe('city_center')
  })

  it('uses the city centre when nothing about the user is known', () => {
    const center = resolveSearchCenter({ cityName: 'Beograd', userCoords: null, profileCoords: null })
    expect(center).toEqual({ ...BELGRADE, source: 'city_center' })
  })

  it('returns nothing when there is neither a user nor a city', () => {
    expect(resolveSearchCenter({ cityName: null, userCoords: null, profileCoords: null })).toBeNull()
  })

  it('honours GPS even with no city picked', () => {
    expect(
      resolveSearchCenter({ cityName: null, userCoords: BELGRADE, profileCoords: null })?.source
    ).toBe('user_gps')
  })
})

describe('resultsHeading', () => {
  // doc 03 §7.4 — the heading must not claim "near you" from a city centre.
  it('says "najbliže tebi" only when the centre came from the user', () => {
    expect(resultsHeading(147, 'user_gps', 'Beograd')).toContain('najbliže tebi')
    expect(resultsHeading(147, 'user_profile', 'Beograd')).toContain('najbliže tebi')
  })

  it('says only the city when the centre is the city centre', () => {
    const heading = resultsHeading(147, 'city_center', 'Beograd')
    expect(heading).toBe('147 predmeta u Beogradu')
    expect(heading).not.toContain('tebi')
  })

  it('uses the locative form of the city name', () => {
    expect(resultsHeading(3, 'city_center', 'Novi Sad')).toContain('u Novom Sadu')
    expect(resultsHeading(3, 'city_center', 'Niš')).toContain('u Nišu')
  })

  it('names no place when there is no centre', () => {
    expect(resultsHeading(12, 'none', null)).toBe('12 predmeta')
  })
})

describe('pluralizeItems', () => {
  it('agrees with Serbian plural rules', () => {
    expect(pluralizeItems(1)).toBe('1 predmet')
    expect(pluralizeItems(2)).toBe('2 predmeta')
    expect(pluralizeItems(4)).toBe('4 predmeta')
    expect(pluralizeItems(5)).toBe('5 predmeta')
    expect(pluralizeItems(21)).toBe('21 predmet')
    expect(pluralizeItems(11)).toBe('11 predmeta')
    expect(pluralizeItems(147)).toBe('147 predmeta')
    expect(pluralizeItems(0)).toBe('0 predmeta')
  })
})

describe('defaultSortFor', () => {
  // doc 03 §6.3
  it('sorts by distance when a location is known and by newest when it is not', () => {
    expect(defaultSortFor(true)).toBe('distance')
    expect(defaultSortFor(false)).toBe('newest')
  })
})

describe('formatDateRange', () => {
  it('collapses a same-month range', () => {
    expect(formatDateRange('2026-08-20', '2026-08-22')).toBe('20–22. avg')
  })

  it('spells out both months when the range crosses one', () => {
    expect(formatDateRange('2026-08-30', '2026-09-02')).toBe('30. avg – 2. sep')
  })

  it('handles a start with no end yet', () => {
    expect(formatDateRange('2026-08-20', null)).toBe('20. avg')
  })

  it('shows a single day when start and end are the same', () => {
    expect(formatDateRange('2026-08-19', '2026-08-19')).toBe('19. avg')
  })

  it('returns null when there are no dates', () => {
    expect(formatDateRange(null, null)).toBeNull()
  })
})

describe('boundsToRadiusKm', () => {
  it('covers the visible map with a radius to its corner', () => {
    const radius = boundsToRadiusKm({ north: 44.9, south: 44.7, east: 20.6, west: 20.3 })
    expect(radius).toBeGreaterThan(10)
    expect(radius).toBeLessThan(20)
  })

  it('never returns zero, which would match nothing', () => {
    expect(boundsToRadiusKm({ north: 44.8, south: 44.8, east: 20.4, west: 20.4 })).toBe(1)
  })
})

describe('radiusFilterLabel', () => {
  it('calls radius 0 the whole country', () => {
    expect(radiusFilterLabel(0)).toBe('Cela Srbija')
    expect(radiusFilterLabel(25)).toBe('25 km')
  })
})

describe('city lookup', () => {
  // Diacritics behave the same here as in the database search.
  it('finds cities without diacritics', () => {
    expect(findCity('cacak')?.name).toBe('Čačak')
    expect(findCity('NIS')?.name).toBe('Niš')
    expect(findCity('Beograd')?.name).toBe('Beograd')
  })

  it('strips đ, which carries no combining mark', () => {
    expect(normalizeForCompare('Đakovica')).toBe('dakovica')
  })

  it('returns nothing for an unknown place', () => {
    expect(findCity('Atlantis')).toBeNull()
    expect(findCity(null)).toBeNull()
  })

  it('matches partial input in the city picker', () => {
    expect(searchCities('novi').map((city) => city.name)).toContain('Novi Sad')
    expect(searchCities('').length).toBeGreaterThan(30)
  })
})

describe('filterPopularSearchTerms', () => {
  it('returns all popular terms when the query is empty', () => {
    expect(filterPopularSearchTerms('')).toEqual([
      'bušilica',
      'šator',
      'prikolica',
      'dron',
      'kosačica',
      'projektor',
    ])
  })

  it('filters popular terms by partial match', () => {
    expect(filterPopularSearchTerms('bu')).toEqual(['bušilica'])
    expect(filterPopularSearchTerms('kosa')).toEqual(['kosačica'])
  })
})

describe('searchBarDividerHidden', () => {
  it('hides every divider while a field is active', () => {
    expect(searchBarDividerHidden('q', null, 'after-q')).toBe(true)
    expect(searchBarDividerHidden('dates', 'city', 'after-city')).toBe(true)
  })

  it('hides only the dividers next to the hovered field', () => {
    expect(searchBarDividerHidden(null, 'q', 'after-q')).toBe(true)
    expect(searchBarDividerHidden(null, 'q', 'after-city')).toBe(false)
    expect(searchBarDividerHidden(null, 'city', 'after-q')).toBe(true)
    expect(searchBarDividerHidden(null, 'city', 'after-city')).toBe(true)
    expect(searchBarDividerHidden(null, 'dates', 'after-q')).toBe(false)
    expect(searchBarDividerHidden(null, 'dates', 'after-city')).toBe(true)
  })
})

describe('nextSearchBarSegment', () => {
  it('advances query → city → dates, then to search', () => {
    expect(nextSearchBarSegment('q')).toBe('city')
    expect(nextSearchBarSegment('city')).toBe('dates')
    expect(nextSearchBarSegment('dates')).toBe('search')
  })
})
