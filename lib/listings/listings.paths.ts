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
