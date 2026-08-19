export const SEARCH_SORTS = ['distance', 'price_asc', 'price_desc', 'newest', 'rating'] as const
export type SearchSort = (typeof SEARCH_SORTS)[number]

export const SEARCH_SORT_LABELS: Record<SearchSort, string> = {
  distance: 'Blizina',
  price_asc: 'Cena rastuće',
  price_desc: 'Cena opadajuće',
  newest: 'Najnovije',
  rating: 'Najbolje ocenjeno',
}

/** Where the centre of the search came from — decides the heading above the results. */
export type SearchCenterSource = 'user_gps' | 'user_profile' | 'city_center' | 'none'

export const DEFAULT_RADIUS_KM = 25
export const SEARCH_PAGE_SIZE = 10
export const MAX_MAP_PINS = 500

/** Radius options from doc 03 §6.1. `0` is "Cela Srbija" — no radius restriction. */
export const RADIUS_OPTIONS = [1, 5, 10, 25, 50, 0] as const

/**
 * The complete state of a search. Every field maps to one URL parameter and
 * nothing lives outside the URL (doc 03 §2).
 */
export interface SearchParams {
  q: string | null
  city: string | null
  lat: number | null
  lng: number | null
  from: string | null
  to: string | null
  category: string | null
  priceMin: number | null
  priceMax: number | null
  radiusKm: number
  sort: SearchSort
  page: number
  mapOpen: boolean
}

export interface SearchResultListing {
  id: string
  slug: string
  title: string
  thumbnail_url: string | null
  price_1_day_minor: number
  rating_avg: number | null
  rating_count: number
  distance_m: number | null
  municipality: string | null
  approx_latitude: number
  approx_longitude: number
  is_favorite: boolean
  is_own: boolean
  owner: {
    id: string
    display_name: string
    is_verified: boolean
  }
}

export interface SearchMeta {
  page: number
  limit: number
  total: number
  total_pages: number
  search_center: {
    lat: number | null
    lng: number | null
    source: SearchCenterSource
  }
  applied_filters: Record<string, string | number>
  /** Set when the exact search found nothing and a similar title exists. */
  did_you_mean?: string | null
}

export interface SearchResponse {
  data: SearchResultListing[]
  meta: SearchMeta
}

export interface MapPin {
  id: string
  slug: string
  title: string
  price_1_day_minor: number
  approx_latitude: number
  approx_longitude: number
  city: string | null
}

export interface MapPinsResponse {
  data: MapPin[]
  meta: {
    total: number
    /** True when the result set exceeds MAX_MAP_PINS and only clusters can be shown. */
    truncated: boolean
  }
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}
