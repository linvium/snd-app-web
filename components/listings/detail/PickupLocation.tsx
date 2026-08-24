'use client'

import dynamic from 'next/dynamic'
import { InfoIcon, MapPinIcon, NavigationIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { placeLabel } from '@/lib/listings'
import { formatDistance } from '@/lib/search'
import type { PickupLocation as PickupLocationData } from '@/types/listing-detail'

// Leaflet touches `window` on import, so the map only exists in the browser.
// Everything around it still server-renders, which is what the page is indexed
// on (doc 04 §15).
const PickupMap = dynamic(() => import('@/components/listings/detail/PickupMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-xl md:h-72" />,
})

/**
 * Where the item is collected (doc 04 §9).
 *
 * The note under the map is not decoration: before payment the page shows a
 * municipality and a circle, and the reader needs to know that is deliberate
 * and temporary rather than a listing missing its address.
 */
export default function PickupLocation({
  locations,
  distanceMeters,
  canSeeExact,
}: {
  locations: PickupLocationData[]
  distanceMeters: number | null
  canSeeExact: boolean
}) {
  const primary = locations[0]
  if (!primary) return null

  const exact = canSeeExact
    ? locations.find((location) => location.latitude != null && location.longitude != null)
    : undefined

  const distance = formatDistance(distanceMeters)
  const place = placeLabel(primary.municipality, primary.city)

  return (
    <section>
      <div className="mt-0 mb-3 flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-9 flex-none place-items-center rounded-lg bg-muted text-zinc-500"
        >
          <MapPinIcon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="m-0 text-base font-semibold text-card-foreground">Gde se preuzima</h2>
          <p className="m-0 text-[13px] text-muted-foreground">
            {[place, distance ? `${distance} od tebe` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <PickupMap locations={locations} canSeeExact={canSeeExact} label={place} />

      {locations.length > 1 ? (
        <p className="mt-2 mb-0 text-[13px] text-muted-foreground">
          Vlasnik može predati predmet na {locations.length} lokacije.
        </p>
      ) : null}

      {exact ? (
        <div className="mt-3 rounded-lg border border-border bg-muted px-3 py-2.5">
          <p className="m-0 text-sm font-medium text-card-foreground">
            {exact.street}
            {exact.postal_code ? `, ${exact.postal_code}` : ''} {exact.city}
          </p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${exact.latitude},${exact.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 no-underline hover:underline"
          >
            <NavigationIcon className="size-4" strokeWidth={1.8} aria-hidden />
            Otvori u navigaciji
          </a>
        </div>
      ) : (
        <p className="mt-3 mb-0 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 flex-none" strokeWidth={1.8} aria-hidden />
          Tačnu adresu dobijaš kada rezervacija bude plaćena i potvrđena.
        </p>
      )}
    </section>
  )
}
