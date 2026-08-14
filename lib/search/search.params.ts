import {
  DEFAULT_RADIUS_KM,
  SEARCH_SORTS,
  type SearchParams,
  type SearchSort,
} from '@/types/search'

/**
 * The whole state of a search lives in the URL and nowhere else (doc 03 §2).
 *
 * The spec writes these parameters in Serbian (`grad`, `od`, `kategorija`…),
 * but public URLs on this project are English — see
 * docs/superpowers/specs/2026-08-12-english-routes-identifiers-design.md.
 * Only user-facing copy is Serbian. The spec's parameter *semantics* are kept
 * exactly; only the spelling is translated.
 */
export const SEARCH_PARAM_KEYS = {
  q: 'q',
  city: 'city',
  lat: 'lat',
  lng: 'lng',
  from: 'from',
  to: 'to',
  category: 'category',
  priceMin: 'price_min',
  priceMax: 'price_max',
  radiusKm: 'radius',
  sort: 'sort',
  page: 'page',
  mapOpen: 'map',
} as const

export const EMPTY_SEARCH_PARAMS: SearchParams = {
  q: null,
  city: null,
  lat: null,
  lng: null,
  from: null,
  to: null,
  category: null,
  priceMin: null,
  priceMax: null,
  radiusKm: DEFAULT_RADIUS_KM,
  sort: 'distance',
  page: 1,
  mapOpen: false,
}

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>

function read(source: ParamSource, key: string): string | null {
  if (source instanceof URLSearchParams) return source.get(key)
  const value = source[key]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function toFiniteNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function toPositiveInt(raw: string | null): number | null {
  const value = toFiniteNumber(raw)
  if (value === null) return null
  const rounded = Math.trunc(value)
  return rounded >= 0 ? rounded : null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function toIsoDate(raw: string | null): string | null {
  if (!raw || !ISO_DATE.test(raw)) return null
  // Reject things like 2026-02-31 that match the shape but are not real days.
  const parsed = new Date(`${raw}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10) === raw ? raw : null
}

function toLatitude(raw: string | null): number | null {
  const value = toFiniteNumber(raw)
  return value !== null && value >= -90 && value <= 90 ? value : null
}

function toLongitude(raw: string | null): number | null {
  const value = toFiniteNumber(raw)
  return value !== null && value >= -180 && value <= 180 ? value : null
}

function toSort(raw: string | null): SearchSort | null {
  return SEARCH_SORTS.includes(raw as SearchSort) ? (raw as SearchSort) : null
}

/**
 * Anything malformed falls back to its default rather than raising. A shared
 * link with one bad parameter should still show results.
 */
export function parseSearchParams(source: ParamSource): SearchParams {
  const lat = toLatitude(read(source, SEARCH_PARAM_KEYS.lat))
  const lng = toLongitude(read(source, SEARCH_PARAM_KEYS.lng))
  // A half-pair is no pair — one coordinate alone cannot centre a search.
  const hasCoords = lat !== null && lng !== null

  let from = toIsoDate(read(source, SEARCH_PARAM_KEYS.from))
  let to = toIsoDate(read(source, SEARCH_PARAM_KEYS.to))
  // An inverted range would silently return nothing; drop it instead.
  if (from && to && to < from) {
    from = null
    to = null
  }

  let priceMin = toPositiveInt(read(source, SEARCH_PARAM_KEYS.priceMin))
  let priceMax = toPositiveInt(read(source, SEARCH_PARAM_KEYS.priceMax))
  if (priceMin !== null && priceMax !== null && priceMax < priceMin) {
    ;[priceMin, priceMax] = [priceMax, priceMin]
  }

  const rawQuery = read(source, SEARCH_PARAM_KEYS.q)?.trim() ?? ''
  const rawCity = read(source, SEARCH_PARAM_KEYS.city)?.trim() ?? ''
  const rawCategory = read(source, SEARCH_PARAM_KEYS.category)?.trim() ?? ''
  const radius = toPositiveInt(read(source, SEARCH_PARAM_KEYS.radiusKm))
  const page = toPositiveInt(read(source, SEARCH_PARAM_KEYS.page))
  const mapOpen = read(source, SEARCH_PARAM_KEYS.mapOpen)

  return {
    q: rawQuery || null,
    city: rawCity || null,
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    from,
    to,
    category: rawCategory || null,
    priceMin,
    priceMax,
    radiusKm: radius ?? DEFAULT_RADIUS_KM,
    sort: toSort(read(source, SEARCH_PARAM_KEYS.sort)) ?? 'distance',
    page: page && page > 0 ? page : 1,
    mapOpen: mapOpen === 'true' || mapOpen === '1',
  }
}

/**
 * Defaults are omitted so the common URL stays short and two equivalent
 * searches produce the same string — which is also what makes the response
 * cache key stable (doc 03 §12).
 */
export function buildSearchQuery(params: SearchParams): URLSearchParams {
  const search = new URLSearchParams()
  const set = (key: string, value: string | number | null) => {
    if (value === null || value === '') return
    search.set(key, String(value))
  }

  set(SEARCH_PARAM_KEYS.q, params.q)
  set(SEARCH_PARAM_KEYS.city, params.city)
  if (params.lat !== null && params.lng !== null) {
    set(SEARCH_PARAM_KEYS.lat, params.lat)
    set(SEARCH_PARAM_KEYS.lng, params.lng)
  }
  set(SEARCH_PARAM_KEYS.from, params.from)
  set(SEARCH_PARAM_KEYS.to, params.to)
  set(SEARCH_PARAM_KEYS.category, params.category)
  set(SEARCH_PARAM_KEYS.priceMin, params.priceMin)
  set(SEARCH_PARAM_KEYS.priceMax, params.priceMax)
  if (params.radiusKm !== DEFAULT_RADIUS_KM) set(SEARCH_PARAM_KEYS.radiusKm, params.radiusKm)
  if (params.sort !== 'distance') set(SEARCH_PARAM_KEYS.sort, params.sort)
  if (params.page > 1) set(SEARCH_PARAM_KEYS.page, params.page)
  if (params.mapOpen) set(SEARCH_PARAM_KEYS.mapOpen, 'true')

  return search
}

export function searchUrl(params: SearchParams, pathname = '/search'): string {
  const query = buildSearchQuery(params).toString()
  return query ? `${pathname}?${query}` : pathname
}

/** Filters shown in the filter bar. Query, city, dates and sort are not filters. */
export function countActiveFilters(params: SearchParams): number {
  let count = 0
  if (params.category) count += 1
  if (params.priceMin !== null || params.priceMax !== null) count += 1
  if (params.radiusKm !== DEFAULT_RADIUS_KM) count += 1
  return count
}

export function clearFilters(params: SearchParams): SearchParams {
  return {
    ...params,
    category: null,
    priceMin: null,
    priceMax: null,
    radiusKm: DEFAULT_RADIUS_KM,
    page: 1,
  }
}

/**
 * Any change to what is being searched sends the user back to page one —
 * staying on page 7 of a different result set shows an empty screen.
 */
export function withFilters(
  params: SearchParams,
  changes: Partial<SearchParams>
): SearchParams {
  const resetsPaging = Object.keys(changes).some((key) => key !== 'page' && key !== 'mapOpen')
  return { ...params, ...changes, page: resetsPaging ? 1 : (changes.page ?? params.page) }
}
