import { maskContactDetails } from '@/lib/listings/listings.description'
import type { ListingDetail } from '@/types/listing-detail'

/** Search-engine surface for the item page (doc 04 §15). */

const META_DESCRIPTION_LENGTH = 155

export function listingCanonicalUrl(slug: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://snd.rs').replace(/\/$/, '')
  return `${base}/listings/${slug}`
}

/** "<naslov> – iznajmi u <grad> | SND" (doc 04 §15). */
export function listingPageTitle(title: string, city: string | null): string {
  return city ? `${title} – iznajmi u ${city} | SND` : `${title} | SND`
}

/**
 * The masked description feeds the meta tag too — a phone number hidden on the
 * page but printed in the search result would defeat the point (doc 04 §6).
 */
export function listingMetaDescription(description: string): string {
  const { text } = maskContactDetails(description)
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= META_DESCRIPTION_LENGTH) return flat

  const window = flat.slice(0, META_DESCRIPTION_LENGTH)
  const lastSpace = window.lastIndexOf(' ')
  return `${(lastSpace > META_DESCRIPTION_LENGTH * 0.6 ? window.slice(0, lastSpace) : window).trimEnd()}…`
}

/**
 * `Product` with `AggregateRating` and `Offer` (doc 04 §15).
 *
 * `aggregateRating` is omitted entirely when there are no ratings: emitting one
 * with a count of zero is invalid structured data and gets the whole block
 * ignored rather than just that field.
 */
export function listingJsonLd(listing: ListingDetail): Record<string, unknown> {
  const city = listing.pickup_locations[0]?.city ?? null

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listingMetaDescription(listing.description),
    image: listing.images.map((image) => image.large_url),
    ...(listing.category ? { category: listing.category.full_path } : {}),
    ...(listing.rating_count > 0 && listing.rating_avg != null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: listing.rating_avg,
            reviewCount: listing.rating_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: (listing.price_1_day_minor / 100).toFixed(2),
      priceCurrency: 'RSD',
      availability:
        listing.status === 'published'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: listingCanonicalUrl(listing.slug),
      ...(city ? { areaServed: city } : {}),
    },
    ...(listing.owner
      ? { brand: { '@type': 'Person', name: listing.owner.display_name } }
      : {}),
  }
}
