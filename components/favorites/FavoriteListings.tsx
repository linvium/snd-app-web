'use client'

import { HeartIcon } from 'lucide-react'

import ListingCard, { ListingCardSkeleton } from '@/components/listings/ListingCard'
import { useFavoriteListings } from '@/hooks/favorites'

export function FavoriteListings() {
  const favorites = useFavoriteListings()

  if (favorites.isPending || (favorites.isFetching && favorites.data === undefined)) {
    return (
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy="true"
        data-testid="favorites-skeleton"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (favorites.isError) {
    return (
      <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
        <p className="m-0 text-sm text-destructive">Nismo mogli da učitamo omiljene predmete.</p>
      </section>
    )
  }

  const listings = favorites.data ?? []
  if (listings.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
        <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
          <HeartIcon className="size-5" strokeWidth={1.8} aria-hidden />
        </span>
        <p className="mb-1 text-base font-semibold text-foreground" data-testid="favorites-empty">
          Još nemaš omiljenih predmeta.
        </p>
        <p className="m-0 text-sm text-muted-foreground">
          Sačuvaj oglas srcem na kartici da ga kasnije lako nađeš.
        </p>
      </section>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4" data-testid="favorites-list">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
