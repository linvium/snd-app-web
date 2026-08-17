'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { XIcon } from 'lucide-react'

import ListingCard from '@/components/listings/ListingCard'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPricePerDay, type Coordinates } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { MapPin, SearchResultListing } from '@/types/search'

// Leaflet touches `window` on import, so the map only exists in the browser.
const SearchMap = dynamic(() => import('@/components/search/SearchMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
})

interface SearchMapPanelProps {
  pins: MapPin[]
  truncated: boolean
  listings: SearchResultListing[]
  center: Coordinates | null
  userCoords: Coordinates | null
  highlightedId: string | null
  onHoverChange: (listingId: string | null) => void
  onSearchThisArea: (center: Coordinates, radiusKm: number) => void
}

interface Selection {
  pin: MapPin
  point: { x: number; y: number }
}

/**
 * Wraps the map with the two ways a selected pin is presented: a bubble above
 * the pin on desktop, and a swipeable strip along the bottom on mobile
 * (doc 03 §9.3).
 */
export default function SearchMapPanel({
  pins,
  truncated,
  listings,
  center,
  userCoords,
  highlightedId,
  onHoverChange,
  onSearchThisArea,
}: SearchMapPanelProps) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // A new result set invalidates whatever was selected on the old one.
  useEffect(() => {
    setSelection(null)
  }, [pins])

  // Selecting a pin brings its card to the front of the mobile strip.
  useEffect(() => {
    if (!selection || !stripRef.current) return
    const card = stripRef.current.querySelector<HTMLElement>(
      `[data-pin-id="${selection.pin.id}"]`
    )
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selection])

  const selectedListing = selection
    ? (listings.find((listing) => listing.id === selection.pin.id) ?? null)
    : null

  return (
    <div className="relative h-full w-full overflow-hidden">
      <SearchMap
        pins={pins}
        truncated={truncated}
        center={center}
        userCoords={userCoords}
        highlightedId={highlightedId ?? selection?.pin.id ?? null}
        onPinHover={onHoverChange}
        onPinSelect={(pin, point) => setSelection({ pin, point })}
        onSearchThisArea={onSearchThisArea}
      />

      {/* Desktop: a bubble anchored above the pin that opened it. */}
      {selection ? (
        <div
          className="pointer-events-none absolute inset-0 z-[500] hidden md:block"
          aria-live="polite"
        >
          <div
            className="pointer-events-auto absolute w-[240px] -translate-x-1/2 -translate-y-full pb-3"
            style={{
              left: `${Math.min(Math.max(selection.point.x, 130), 10000)}px`,
              top: `${selection.point.y}px`,
            }}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setSelection(null)}
                aria-label="Zatvori"
                className="absolute -top-2 -right-2 z-10 grid size-7 cursor-pointer place-items-center rounded-full border border-border bg-card text-zinc-600 shadow-sm hover:bg-muted"
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
              {selectedListing ? (
                <ListingCard listing={selectedListing} priority />
              ) : (
                <CompactPinCard pin={selection.pin} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile: a strip that swipes horizontally through the whole result set. */}
      {selection ? (
        <div
          ref={stripRef}
          className="absolute right-0 bottom-0 left-0 z-[500] flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        >
          {pins.map((pin) => {
            const listing = listings.find((item) => item.id === pin.id) ?? null
            return (
              <div
                key={pin.id}
                data-pin-id={pin.id}
                className={cn(
                  'w-[75vw] max-w-[280px] shrink-0 snap-center',
                  pin.id === selection.pin.id && 'ring-2 ring-brand-500 rounded-lg'
                )}
              >
                {listing ? <ListingCard listing={listing} /> : <CompactPinCard pin={pin} />}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Pins cover the whole result set while the list shows one page, so a pin from
 * page four has no full card to render. Title, price and a link are enough to
 * get the user where they were going.
 */
function CompactPinCard({ pin }: { pin: MapPin }) {
  return (
    <Link
      href={`/listings/${pin.slug}`}
      className="block rounded-lg bg-card p-3 no-underline shadow-md"
    >
      <p className="line-clamp-2 text-sm font-semibold text-card-foreground">{pin.title}</p>
      <p className="mt-1 text-[13px] text-zinc-500">{pin.city}</p>
      <p className="mt-1 text-base font-bold text-card-foreground">
        {formatPricePerDay(pin.price_1_day_minor)}
      </p>
    </Link>
  )
}
