'use client'

import ListingCard, { ListingCardSkeleton } from '@/components/listings/ListingCard'
import { useSimilarListings } from '@/hooks/listings'

/**
 * "Slični predmeti" (doc 04 §12).
 *
 * Loaded after the page rather than with it: nobody scrolls this far before the
 * page has painted, and the tiered fallback behind it costs up to four searches
 * that must not sit in front of the first render.
 *
 * The section removes itself when there is nothing to show — an empty strip
 * reads as a dead platform (doc 04 §12).
 */
export default function SimilarListings({ listingId }: { listingId: string }) {
  const { data, isPending, isError } = useSimilarListings(listingId)

  if (isError) return null

  const listings = data?.data ?? []
  if (!isPending && listings.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mt-0 mb-4 text-lg font-semibold text-card-foreground">Slični predmeti</h2>

      {/* Horizontal scroll on a phone, a four-up grid from tablet (doc 04 §12). */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4">
        {isPending
          ? Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="w-[70vw] flex-none snap-start sm:w-[45vw] md:w-auto">
                <ListingCardSkeleton />
              </div>
            ))
          : listings.map((listing) => (
              <div
                key={listing.id}
                className="w-[70vw] flex-none snap-start sm:w-[45vw] md:w-auto"
              >
                <ListingCard listing={listing} />
              </div>
            ))}
      </div>
    </section>
  )
}
