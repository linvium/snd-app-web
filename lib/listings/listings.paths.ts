import { SEARCH_PARAM_KEYS, toIsoDate } from '@/lib/search/search.params'

export const LISTING_NEW_PATH = '/profile/listings/new'
export const PROFILE_LISTINGS_PATH = '/profile/listings'

export interface ListingDateRange {
  from: string | null
  to: string | null
}

export function listingEditPath(id: string): string {
  return `/profile/listings/${id}/edit`
}

/**
 * Public item URL. Dates are appended only when both ends of the window are
 * set, matching search availability filtering and the quote API.
 */
export function listingPublicPath(slug: string, dates?: ListingDateRange | null): string {
  const path = `/listings/${slug}`
  if (!dates?.from || !dates?.to) return path

  const params = new URLSearchParams()
  params.set(SEARCH_PARAM_KEYS.from, dates.from)
  params.set(SEARCH_PARAM_KEYS.to, dates.to)
  return `${path}?${params.toString()}`
}

/**
 * Pickup / return dates from a listing URL. Garbage and inverted ranges stay
 * empty so they never reach the quote API.
 */
export function parseListingDates(
  source: { get(name: string): string | null } | Record<string, string | string[] | undefined>
): ListingDateRange {
  const read = (key: string): string | null => {
    if ('get' in source && typeof source.get === 'function') return source.get(key)
    const value = (source as Record<string, string | string[] | undefined>)[key]
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
  }

  let from = toIsoDate(read(SEARCH_PARAM_KEYS.from))
  let to = toIsoDate(read(SEARCH_PARAM_KEYS.to))
  if (from && to && to < from) {
    from = null
    to = null
  }
  return { from, to }
}

export function isListingPublishPath(pathname: string): boolean {
  return (
    pathname === LISTING_NEW_PATH ||
    /^\/profile\/listings\/[^/]+\/edit$/.test(pathname) ||
    pathname.startsWith('/listings/new')
  )
}

/**
 * The public item page, `/listings/<slug>`. The publish flow lives under
 * `/listings/new`, which looks the same to a regex and is not this.
 */
export function isListingDetailPath(pathname: string): boolean {
  return /^\/listings\/[^/]+$/.test(pathname) && !isListingPublishPath(pathname)
}
