import Link from 'next/link'
import type { ReactNode } from 'react'

import { ListingGallery } from '@/components/listings/ListingGallery'
import { Button } from '@/components/ui/button'
import { CANCELLATION_COPY } from '@/lib/listings'
import { formatPriceMinor, formatPricePerDay } from '@/lib/search'
import type { CancellationPolicy } from '@/types/listing'

export interface ListingDetailData {
  id: string
  title: string
  description: string
  categoryPath: string | null
  price1DayMinor: number
  price3DaysMinor: number | null
  price7DaysMinor: number | null
  itemValueMinor: number | null
  cancellationPolicy: CancellationPolicy
  locations: { label: string; city: string; street: string }[]
  images: { id: string; thumbnail_url: string; large_url: string }[]
  isOwner: boolean
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h2 className="mt-0 mb-3 text-base font-semibold text-card-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function ListingDetail({ listing }: { listing: ListingDetailData }) {
  const cancellation = CANCELLATION_COPY[listing.cancellationPolicy]

  return (
    <article className="mx-auto flex max-w-[800px] flex-col gap-5 px-4 py-8">
      <ListingGallery images={listing.images} />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {listing.categoryPath ? (
              <p className="m-0 text-[13px] text-muted-foreground">{listing.categoryPath}</p>
            ) : null}
            <h1 className="mt-1 mb-0 text-2xl font-semibold text-card-foreground">{listing.title}</h1>
          </div>
          {listing.isOwner ? (
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/listings/new/${listing.id}`}>Izmeni oglas</Link>
            </Button>
          ) : null}
        </div>

        <p className="mt-3 mb-0 text-lg font-medium text-brand-700">
          {formatPricePerDay(listing.price1DayMinor)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <DetailSection title="Opis">
          <p className="m-0 whitespace-pre-wrap text-base leading-6 text-foreground">{listing.description}</p>
        </DetailSection>

        <DetailSection title="Cena">
          <dl className="m-0 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">1 dan</dt>
              <dd className="m-0 font-medium">{formatPriceMinor(listing.price1DayMinor)}</dd>
            </div>
            {listing.price3DaysMinor != null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">3 dana</dt>
                <dd className="m-0 font-medium">{formatPriceMinor(listing.price3DaysMinor)}</dd>
              </div>
            ) : null}
            {listing.price7DaysMinor != null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">7 dana</dt>
                <dd className="m-0 font-medium">{formatPriceMinor(listing.price7DaysMinor)}</dd>
              </div>
            ) : null}
          </dl>
        </DetailSection>

        {listing.locations.length > 0 ? (
          <DetailSection title="Mesta predaje">
            <ul className="m-0 list-none space-y-2 p-0 text-sm">
              {listing.locations.map((location) => (
                <li key={`${location.label}-${location.street}`}>
                  <p className="m-0 font-medium text-card-foreground">{location.label}</p>
                  <p className="m-0 text-muted-foreground">
                    {location.street}, {location.city}
                  </p>
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : null}

        <DetailSection title="Uslovi otkazivanja">
          <p className="mt-0 mb-2 font-medium text-card-foreground">{cancellation.label}</p>
          <ul className="mb-0 list-disc space-y-1 pl-5 text-[13px] leading-5 text-muted-foreground">
            {cancellation.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DetailSection>

        {listing.itemValueMinor != null ? (
          <DetailSection title="Vrednost predmeta">
            <p className="m-0 text-sm font-medium">{formatPriceMinor(listing.itemValueMinor)}</p>
          </DetailSection>
        ) : null}
      </div>
    </article>
  )
}
