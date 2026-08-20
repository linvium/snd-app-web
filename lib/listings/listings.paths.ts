export const LISTING_NEW_PATH = '/profile/listings/new'
export const PROFILE_LISTINGS_PATH = '/profile/listings'

export function listingEditPath(id: string): string {
  return `/profile/listings/${id}/edit`
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
