'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ImageIcon } from 'lucide-react'

import { ListingPublishedToast } from '@/components/listings/ListingPublishedToast'
import { Button } from '@/components/ui/button'
import { formatPricePerDay } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { OwnedListingSummary } from '@/types/listing'

function listingHref(listing: OwnedListingSummary): string {
  if (listing.status === 'published' && listing.slug) {
    return `/listings/${listing.slug}`
  }
  return `/listings/new/${listing.id}`
}

function OwnerListingCard({
  listing,
  highlighted,
}: {
  listing: OwnedListingSummary
  highlighted: boolean
}) {
  return (
    <article
      data-listing-id={listing.id}
      className={cn(
        'overflow-hidden rounded-lg bg-card shadow-sm transition-shadow',
        highlighted && 'ring-2 ring-brand-500'
      )}
    >
      <Link
        href={listingHref(listing)}
        className="group/card block no-underline transition-transform duration-150 hover:-translate-y-0.5"
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100">
          {listing.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.thumbnail_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-zinc-300">
              <ImageIcon className="size-7" strokeWidth={1.5} aria-hidden />
            </div>
          )}
          {listing.status === 'paused' ? (
            <span className="absolute top-1.5 left-1.5 rounded bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Pauziran
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-0.5 p-2 pb-1.5">
          <h2 className="m-0 line-clamp-1 text-[13px] leading-snug font-semibold text-card-foreground">
            {listing.title}
          </h2>
          <p className="m-0 text-[11px] text-zinc-500">{listing.city || '\u00a0'}</p>
          <p className="mt-0.5 mb-0 text-[13px] font-bold text-card-foreground">
            {formatPricePerDay(listing.price_1_day_minor)}
          </p>
        </div>
      </Link>
      <div className="px-2 pb-2">
        <Button size="sm" variant="secondary" fullWidth className="h-8 text-xs" asChild>
          <Link href={`/listings/new/${listing.id}`} data-testid="listing-edit-link">
            Izmeni
          </Link>
        </Button>
      </div>
    </article>
  )
}

export function MyListings({
  listings,
  highlightId,
}: {
  listings: OwnedListingSummary[]
  highlightId: string | null
}) {
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
          <Link href="/listings/new">Objavi predmet</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">Još nemaš objavljenih oglasa.</p>
          <p className="mb-5 text-sm text-muted-foreground">
            Objavi predmet da bi se ovde pojavila kartica oglasa.
          </p>
          <Button asChild>
            <Link href="/listings/new">Objavi predmet</Link>
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {listings.map((listing) => (
            <OwnerListingCard
              key={listing.id}
              listing={listing}
              highlighted={listing.id === highlightId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
