'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import ListingCard from '@/components/listings/ListingCard'
import { ListingPublishedToast } from '@/components/listings/ListingPublishedToast'
import { Button } from '@/components/ui/button'
import { LISTING_NEW_PATH } from '@/lib/listings'
import type { ListingStatus, OwnedListingSummary } from '@/types/listing'

export function MyListings({
  listings: initialListings,
  highlightId,
}: {
  listings: OwnedListingSummary[]
  highlightId: string | null
}) {
  const [listings, setListings] = useState(initialListings)

  useEffect(() => {
    if (!highlightId) return
    document
      .querySelector(`[data-listing-id="${highlightId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId])

  return (
    <div className="flex flex-col gap-4">
      <ListingPublishedToast />
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <h1 className="m-0 text-[22px] font-normal text-foreground">Moji oglasi</h1>
        <Button size="sm" asChild>
          <Link href={LISTING_NEW_PATH}>Objavi stvar</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">Još nemaš oglasa.</p>
          <p className="mb-5 text-sm text-muted-foreground">
            Objavi stvar ili sačuvaj nacrt da bi se ovde pojavila kartica.
          </p>
          <Button asChild>
            <Link href={LISTING_NEW_PATH}>Objavi stvar</Link>
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              highlighted={listing.id === highlightId}
              onOwnerStatusChange={(status: ListingStatus) => {
                setListings((current) =>
                  current.map((item) => (item.id === listing.id ? { ...item, status } : item))
                )
              }}
              onOwnerDeleted={() => {
                setListings((current) => current.filter((item) => item.id !== listing.id))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
