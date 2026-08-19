'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheckIcon, HeartIcon, ImageIcon, StarIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { useAuthSession } from '@/context/AuthContext'
import { useToggleFavorite } from '@/hooks/favorites'
import { formatDistance, formatPricePerDay } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { SearchResultListing } from '@/types/search'

interface ListingCardProps {
  listing: SearchResultListing
  /** First four cards on a page load eagerly; the rest wait (doc 02 §5.3). */
  priority?: boolean
  /** Set while the matching map pin is hovered (doc 03 §8). */
  highlighted?: boolean
  onHoverChange?: (listingId: string | null) => void
}

/**
 * The most-used component on the platform, identical everywhere (doc 10 §8.3).
 *
 * The whole card is one link and the heart is a button inside it, so a click
 * on the heart must not also follow the link.
 */
export default function ListingCard({
  listing,
  priority = false,
  highlighted = false,
  onHoverChange,
}: ListingCardProps) {
  const router = useRouter()
  const { user } = useAuthSession()
  const toggleFavorite = useToggleFavorite()

  const distance = formatDistance(listing.distance_m)
  const hasRating = listing.rating_count > 0

  const handleFavorite = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // A guest gets the sign-in screen rather than a silent no-op (doc 02 §5.3).
    if (!user) {
      router.push('/auth/login?next=/search')
      return
    }

    toggleFavorite.mutate({ listingId: listing.id, isFavorite: listing.is_favorite })
  }

  return (
    <Link
      href={`/listings/${listing.slug}`}
      data-testid="listing-card"
      data-listing-id={listing.id}
      onMouseEnter={() => onHoverChange?.(listing.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={cn(
        'group/card block overflow-hidden rounded-lg bg-card no-underline shadow-sm transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        highlighted && 'ring-2 ring-brand-500'
      )}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100">
        {listing.thumbnail_url ? (
          <Image
            src={listing.thumbnail_url}
            alt={listing.title}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 25vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-zinc-300">
            <ImageIcon className="size-10" strokeWidth={1.5} aria-hidden />
          </div>
        )}

        {listing.is_own ? (
          <span className="absolute top-2 left-2 rounded-md bg-zinc-900/85 px-2 py-1 text-[11px] font-semibold text-white">
            Tvoj oglas
          </span>
        ) : (
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={listing.is_favorite ? 'Ukloni iz omiljenih' : 'Dodaj u omiljene'}
            aria-pressed={listing.is_favorite}
            className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-full border-none bg-white text-zinc-600 shadow-sm transition-colors hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
          >
            <HeartIcon
              className={cn('size-[18px]', listing.is_favorite && 'fill-brand-500 text-brand-500')}
              strokeWidth={1.8}
              aria-hidden
            />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-card-foreground">
          {listing.title}
        </h3>

        <p className="text-[13px] text-zinc-500">
          {[listing.municipality, distance].filter(Boolean).join(' · ') || ' '}
        </p>

        <p className="flex items-center gap-1 text-[13px] text-zinc-600">
          {hasRating ? (
            <>
              <StarIcon
                className="size-3.5 fill-accent-orange-500 text-accent-orange-500"
                aria-hidden
              />
              <span>
                {listing.rating_avg?.toFixed(1).replace('.', ',')} ({listing.rating_count})
              </span>
            </>
          ) : (
            <span className="text-zinc-500">Novo</span>
          )}
          {listing.owner.is_verified ? (
            <BadgeCheckIcon
              className="size-3.5 text-brand-500"
              aria-label="Verifikovan vlasnik"
            />
          ) : null}
        </p>

        <p className="mt-0.5 text-base font-bold text-card-foreground">
          {formatPricePerDay(listing.price_1_day_minor)}
        </p>
      </div>
    </Link>
  )
}

/** Same dimensions as the real card, so results landing do not shift the page. */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-sm">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="mt-0.5 h-4 w-1/3" />
      </div>
    </div>
  )
}
