'use client'

import ListingCard, { ListingCardSkeleton } from '@/components/listings/ListingCard'
import { useHomeListings } from '@/hooks/home'
import { HOME_LATEST_COUNT } from '@/lib/home/home-listings.helpers'

export default function HomeListings() {
  const { listings, isPending, isError } = useHomeListings()

  if (isError || (!isPending && listings.length === 0)) return null

  return (
    <section data-testid="home-listings-latest" className="px-4 py-8 md:px-6">
      <h2 className="mt-0 mb-4 text-lg font-semibold text-card-foreground">Najnovije</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isPending
          ? Array.from({ length: HOME_LATEST_COUNT }, (_, index) => (
              <ListingCardSkeleton key={index} />
            ))
          : listings.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} priority={index < 6} />
            ))}
      </div>
    </section>
  )
}
