import { findCity, SERBIA_CENTER, type SerbianCity } from '@/lib/geo/serbia-cities'
import type { SearchCenterSource, SearchParams, SearchSort } from '@/types/search'

export interface Coordinates {
  lat: number
  lng: number
}

export interface SearchCenter extends Coordinates {
  source: SearchCenterSource
}

const EARTH_RADIUS_M = 6371000

/** Terms surfaced in the header and mobile search when the query field is empty. */
export const POPULAR_SEARCH_TERMS = [
  'bušilica',
  'šator',
  'prikolica',
  'dron',
  'kosačica',
  'projektor',
] as const

export function filterPopularSearchTerms(
  term: string,
  terms: readonly string[] = POPULAR_SEARCH_TERMS
): string[] {
  const needle = term.trim().toLowerCase()
  if (!needle) return [...terms]
  return terms.filter((value) => value.toLowerCase().includes(needle))
}

export type SearchBarSegment = 'q' | 'city' | 'dates'

/**
 * Airbnb hides a divider as soon as either neighbouring field is hovered, and
 * hides every divider while a field is active.
 */
export function searchBarDividerHidden(
  open: SearchBarSegment | null,
  hovered: SearchBarSegment | null,
  divider: 'after-q' | 'after-city'
): boolean {
  if (open) return true
  if (!hovered) return false
  if (divider === 'after-q') return hovered === 'q' || hovered === 'city'
  return hovered === 'city' || hovered === 'dates'
}

/** Same formula as the database side, so client and server agree on distances. */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/**
 * Distance as the card shows it (doc 03 §7.3).
 *
 * The precision drops as the number grows, because "24 km" is the honest
 * reading of a blurred coordinate while "24,3 km" pretends to know more than
 * the approx location does.
 */
export function formatDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return null
  }

  if (meters < 1000) {
    const rounded = Math.round(meters / 50) * 50
    // Rounding 990 m up lands on 1000, which belongs in the next band.
    if (rounded >= 1000) return '1,0 km'
    return `${rounded} m`
  }

  const km = meters / 1000
  if (km < 10) {
    return `${km.toFixed(1).replace('.', ',')} km`
  }

  return `${Math.round(km)} km`
}

/** 80000 → "800 RSD" (doc 00 §2.2: stored in para, shown in dinars). */
export function formatPriceMinor(minor: number): string {
  const rsd = minor / 100
  const formatted = rsd.toLocaleString('sr-RS', {
    minimumFractionDigits: rsd % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} RSD`
}

export function formatPricePerDay(minor: number): string {
  return `${formatPriceMinor(minor)} / dan`
}

/**
 * Where to centre the search (doc 03 §7.4).
 *
 * The point of the whole page is "this is 1.2 km from you", so the user's own
 * position wins whenever it is plausibly inside the city they picked. When it
 * is not — they chose Niš while sitting in Belgrade — centring on them would
 * show results nowhere near the city they asked about, so the city centre wins
 * instead.
 */
export function resolveSearchCenter(input: {
  cityName: string | null
  userCoords: Coordinates | null
  profileCoords: Coordinates | null
}): SearchCenter | null {
  const city: SerbianCity | null = findCity(input.cityName)

  if (input.userCoords) {
    if (!city) {
      return { ...input.userCoords, source: 'user_gps' }
    }
    const distance = haversineMeters(input.userCoords, { lat: city.lat, lng: city.lng })
    if (distance <= city.radiusKm * 1000) {
      return { ...input.userCoords, source: 'user_gps' }
    }
    return { lat: city.lat, lng: city.lng, source: 'city_center' }
  }

  if (input.profileCoords) {
    if (!city) {
      return { ...input.profileCoords, source: 'user_profile' }
    }
    const distance = haversineMeters(input.profileCoords, { lat: city.lat, lng: city.lng })
    if (distance <= city.radiusKm * 1000) {
      return { ...input.profileCoords, source: 'user_profile' }
    }
    return { lat: city.lat, lng: city.lng, source: 'city_center' }
  }

  if (city) {
    return { lat: city.lat, lng: city.lng, source: 'city_center' }
  }

  return null
}

/**
 * The heading is the page's whole argument: it either says "near you" or it
 * does not, and it must not claim the former when it only knows a city
 * (doc 03 §7.4).
 */
export function resultsHeading(
  total: number,
  source: SearchCenterSource,
  cityName: string | null
): string {
  const items = pluralizeItems(total)

  if (source === 'none' || !cityName) {
    return source === 'user_gps' || source === 'user_profile'
      ? `${items} u tvojoj okolini`
      : items
  }

  if (source === 'user_gps' || source === 'user_profile') {
    return `${items} - najbliže tebi u ${locativeCity(cityName)}`
  }

  return `${items} u ${locativeCity(cityName)}`
}

/** "147 predmeta", "1 predmet", "2 predmeta" — Serbian plural agreement. */
export function pluralizeItems(count: number): string {
  const lastTwo = count % 100
  const last = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) return `${count} predmeta`
  if (last === 1) return `${count} predmet`
  if (last >= 2 && last <= 4) return `${count} predmeta`
  return `${count} predmeta`
}

/**
 * Rough locative for the heading ("u Beogradu", "u Novom Sadu"). Only the
 * cities we ship are handled; anything else is left in the nominative, which
 * reads slightly off but never wrong enough to confuse.
 */
const CITY_LOCATIVE: Record<string, string> = {
  Beograd: 'Beogradu',
  'Novi Sad': 'Novom Sadu',
  Niš: 'Nišu',
  Kragujevac: 'Kragujevcu',
  Subotica: 'Subotici',
  Zrenjanin: 'Zrenjaninu',
  Pančevo: 'Pančevu',
  Čačak: 'Čačku',
  'Novi Pazar': 'Novom Pazaru',
  Kraljevo: 'Kraljevu',
  Smederevo: 'Smederevu',
  Leskovac: 'Leskovcu',
  Užice: 'Užicu',
  Valjevo: 'Valjevu',
  Kruševac: 'Kruševcu',
  Vranje: 'Vranju',
  Šabac: 'Šapcu',
  Sombor: 'Somboru',
  Požarevac: 'Požarevcu',
  Pirot: 'Pirotu',
  Zaječar: 'Zaječaru',
  Kikinda: 'Kikindi',
  'Sremska Mitrovica': 'Sremskoj Mitrovici',
  Jagodina: 'Jagodini',
  Vršac: 'Vršcu',
  Bor: 'Boru',
  Prokuplje: 'Prokuplju',
  Loznica: 'Loznici',
  Ćuprija: 'Ćupriji',
  Aleksinac: 'Aleksincu',
  Vrbas: 'Vrbasu',
  'Bačka Palanka': 'Bačkoj Palanci',
  Inđija: 'Inđiji',
  Ruma: 'Rumi',
  'Gornji Milanovac': 'Gornjem Milanovcu',
  Paraćin: 'Paraćinu',
  Senta: 'Senti',
}

export function locativeCity(name: string): string {
  return CITY_LOCATIVE[name] ?? name
}

/**
 * Default sort (doc 03 §6.3). Relevance is not a `sort` value the user can
 * pick — with a query, `distance` already means "relevance, then distance",
 * which the database ordering implements.
 */
export function defaultSortFor(hasLocation: boolean): SearchSort {
  return hasLocation ? 'distance' : 'newest'
}

/** Half the diagonal of the visible map, which is the radius that covers it. */
export function boundsToRadiusKm(bounds: {
  north: number
  south: number
  east: number
  west: number
}): number {
  const center = {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  }
  const corner = { lat: bounds.north, lng: bounds.east }
  const radiusKm = haversineMeters(center, corner) / 1000
  return Math.max(1, Math.round(radiusKm))
}

export function boundsCenter(bounds: {
  north: number
  south: number
  east: number
  west: number
}): Coordinates {
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  }
}

export function fallbackCenter(): Coordinates {
  return { ...SERBIA_CENTER }
}

/** "20–22. avg" for the compact header bar (doc 03 §4). */
const MONTHS_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
  'jul', 'avg', 'sep', 'okt', 'nov', 'dec',
]

export function formatDateRange(from: string | null, to: string | null): string | null {
  if (!from) return null

  const start = new Date(`${from}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return null

  const startDay = start.getUTCDate()
  const startMonth = MONTHS_SHORT[start.getUTCMonth()]

  if (!to) return `${startDay}. ${startMonth}`

  const end = new Date(`${to}T00:00:00Z`)
  if (Number.isNaN(end.getTime())) return `${startDay}. ${startMonth}`

  const endDay = end.getUTCDate()
  const endMonth = MONTHS_SHORT[end.getUTCMonth()]

  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${startDay}–${endDay}. ${endMonth}`
  }

  return `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`
}

/** "10.08.2026." — the interface date format from doc 00 §2.1. */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getUTCFullYear()}.`
}

/** Label a filter chip carries once it has a value (doc 03 §6.2). */
export function priceFilterLabel(params: Pick<SearchParams, 'priceMin' | 'priceMax'>): string {
  const { priceMin, priceMax } = params
  const format = (value: number) => value.toLocaleString('sr-RS')

  if (priceMin !== null && priceMax !== null) return `${format(priceMin)}–${format(priceMax)} RSD`
  if (priceMax !== null) return `Do ${format(priceMax)} RSD`
  if (priceMin !== null) return `Od ${format(priceMin)} RSD`
  return 'Cena'
}

export function radiusFilterLabel(radiusKm: number): string {
  return radiusKm <= 0 ? 'Cela Srbija' : `${radiusKm} km`
}
