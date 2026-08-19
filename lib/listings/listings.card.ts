import type { OwnedListingSummary, ListingStatus } from '@/types/listing'
import type { SearchResultListing } from '@/types/search'

/**
 * The one shape the listing card understands, whether it came from search
 * or from the owner's own list.
 */
export interface ListingCardItem {
  id: string
  slug: string | null
  title: string
  thumbnail_url: string | null
  price_1_day_minor: number
  locationLabel: string | null
  distance_m: number | null
  rating_avg: number | null
  rating_count: number
  is_favorite: boolean
  is_own: boolean
  ownerVerified: boolean
  status: ListingStatus | null
}

function isSearchListing(
  listing: SearchResultListing | OwnedListingSummary
): listing is SearchResultListing {
  return 'is_own' in listing
}

export function toListingCardItem(
  listing: SearchResultListing | OwnedListingSummary
): ListingCardItem {
  if (isSearchListing(listing)) {
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      thumbnail_url: listing.thumbnail_url,
      price_1_day_minor: listing.price_1_day_minor,
      locationLabel: listing.municipality,
      distance_m: listing.distance_m,
      rating_avg: listing.rating_avg,
      rating_count: listing.rating_count,
      is_favorite: listing.is_favorite,
      is_own: listing.is_own,
      ownerVerified: listing.owner.is_verified,
      status: listing.is_own ? 'published' : null,
    }
  }

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    thumbnail_url: listing.thumbnail_url,
    price_1_day_minor: listing.price_1_day_minor,
    locationLabel: listing.city,
    distance_m: null,
    rating_avg: null,
    rating_count: 0,
    is_favorite: false,
    is_own: true,
    ownerVerified: false,
    status: listing.status,
  }
}
