'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HeartIcon, ImageIcon, StarIcon } from 'lucide-react'

import ListingOwnerMenu from '@/components/listings/ListingOwnerMenu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthSession } from '@/context/AuthContext'
import { useToggleFavorite } from '@/hooks/favorites'
import { listingEditPath, toListingCardItem } from '@/lib/listings'
import { LISTING_STATUS_LABELS, type ListingUiStatus } from '@/lib/listings/listings.status'
import { formatDistance, formatPricePerDay } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { ListingStatus, OwnedListingSummary } from '@/types/listing'
import type { SearchResultListing } from '@/types/search'

interface ListingCardProps {
  listing: SearchResultListing | OwnedListingSummary
  /** First four cards on a page load eagerly; the rest wait (doc 02 §5.3). */
  priority?: boolean
  /** Set while the matching map pin is hovered (doc 03 §8). */
  highlighted?: boolean
  onHoverChange?: (listingId: string | null) => void
  onOwnerStatusChange?: (status: ListingStatus) => void
  onOwnerDeleted?: () => void
}

function cardHref(slug: string | null, id: string, isOwn: boolean, status: ListingStatus | null): string {
  if (isOwn && status && status !== 'published') return listingEditPath(id)
  if (slug) return `/listings/${slug}`
  return listingEditPath(id)
}

function ownerStatusLabel(status: ListingStatus | null): string | null {
  if (status === 'draft' || status === 'published' || status === 'paused') {
    return LISTING_STATUS_LABELS[status as ListingUiStatus]
  }
  return null
}

/**
 * The listing card used everywhere a list of items is shown (doc 10 §8.3).
 *
 * Own listings swap the heart for a dotted actions menu; everything else
 * about the card stays the same.
 */
export default function ListingCard({
  listing,
  priority = false,
  highlighted = false,
  onHoverChange,
  onOwnerStatusChange,
  onOwnerDeleted,
}: ListingCardProps) {
  const router = useRouter()
  const { user } = useAuthSession()
  const toggleFavorite = useToggleFavorite()
  const item = toListingCardItem(listing)

  const distance = formatDistance(item.distance_m)
  const hasRating = item.rating_count > 0
  const statusLabel = item.is_own ? ownerStatusLabel(item.status) : null
  const href = cardHref(item.slug, item.id, item.is_own, item.status)
  const location = [item.locationLabel, distance].filter(Boolean).join(' · ')
  const priceLabel =
    item.price_1_day_minor > 0 ? formatPricePerDay(item.price_1_day_minor) : '—'

  const handleFavorite = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      router.push('/auth/login?next=/search')
      return
    }

    toggleFavorite.mutate({ listingId: item.id, isFavorite: item.is_favorite })
  }

  return (
    <article
      data-testid="listing-card"
      data-listing-id={item.id}
      data-listing-status={item.status ?? undefined}
      className={cn(highlighted && 'rounded-2xl ring-2 ring-brand-500 ring-offset-2')}
      onMouseEnter={() => onHoverChange?.(item.id)}
      onMouseLeave={() => onHoverChange?.(null)}
    >
      <div className="relative">
        <Link
          href={href}
          className="group/card block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        >
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-zinc-100">
            {item.thumbnail_url ? (
              <Image
                src={item.thumbnail_url}
                alt={item.title}
                fill
                sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 16vw"
                priority={priority}
                loading={priority ? undefined : 'lazy'}
                className="object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-zinc-300">
                <ImageIcon className="size-8" strokeWidth={1.5} aria-hidden />
              </div>
            )}

            {statusLabel ? (
              <span className="absolute top-2.5 left-2.5 rounded-md bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {statusLabel}
              </span>
            ) : null}
          </div>
        </Link>

        {item.is_own && item.status ? (
          <ListingOwnerMenu
            listingId={item.id}
            status={item.status}
            onStatusChange={onOwnerStatusChange}
            onDeleted={onOwnerDeleted}
          />
        ) : (
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={item.is_favorite ? 'Ukloni iz omiljenih' : 'Dodaj u omiljene'}
            aria-pressed={item.is_favorite}
            className="absolute top-2.5 right-2.5 grid size-8 cursor-pointer place-items-center rounded-full border-none bg-transparent text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
          >
            <HeartIcon
              className={cn(
                'size-[22px] overflow-visible fill-zinc-500 [paint-order:stroke]',
                item.is_favorite && 'fill-brand-500',
              )}
              strokeWidth={2.25}
              aria-hidden
            />
          </button>
        )}
      </div>

      <Link
        href={href}
        className="group/card mt-2 block no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <div className="flex flex-col gap-0.5">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-card-foreground">
            {item.title}
          </h3>
          <p className="text-[13px] text-zinc-500">{location || '\u00a0'}</p>
          <p className="flex items-center gap-1.5 text-[13px] text-zinc-600">
            <span className="font-medium text-card-foreground">{priceLabel}</span>
            <span aria-hidden>·</span>
            {hasRating ? (
              <span className="inline-flex items-center gap-0.5">
                <StarIcon className="size-3 fill-zinc-600 text-zinc-600" aria-hidden />
                {item.rating_avg?.toFixed(1).replace('.', ',')}
              </span>
            ) : (
              <span>Nema ocena</span>
            )}
          </p>
        </div>
      </Link>
    </article>
  )
}

/** Same proportions as the real card, so results landing do not shift the page. */
export function ListingCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-4/3 w-full rounded-2xl" />
      <div className="mt-2 flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
