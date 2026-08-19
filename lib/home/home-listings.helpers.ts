import { EMPTY_SEARCH_PARAMS } from '@/lib/search/search.params'
import type { SearchParams, SearchResultListing } from '@/types/search'

export const HOME_LATEST_COUNT = 20

export function homeLatestSearchParams(): SearchParams {
  return {
    ...EMPTY_SEARCH_PARAMS,
    sort: 'newest',
  }
}

export function takeHomeListings(listings: SearchResultListing[]): SearchResultListing[] {
  return listings.filter((listing) => !listing.is_own).slice(0, HOME_LATEST_COUNT)
}
