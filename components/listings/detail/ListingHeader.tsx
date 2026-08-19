'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckIcon, HeartIcon, ShareIcon, StarIcon } from 'lucide-react'

import { useAuthSession } from '@/context/AuthContext'
import { useToggleFavorite } from '@/hooks/favorites'
import { formatRating, placeLabel, pluralizeRatings } from '@/lib/listings'
import { formatDistance } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { ListingDetail } from '@/types/listing-detail'

/**
 * Title block (doc 04 §4).
 *
 * The rating line answers "can I trust this" before the reader scrolls, so a
 * listing with no reviews says "Novo" rather than showing an empty star — an
 * unrated thing and a badly rated thing must not look alike.
 */
export default function ListingHeader({ listing }: { listing: ListingDetail }) {
  const router = useRouter()
  const { user } = useAuthSession()
  const toggleFavorite = useToggleFavorite()

  const [isFavorite, setIsFavorite] = useState(listing.is_favorite)
  const [copied, setCopied] = useState(false)

  const rating = formatRating(listing.rating_avg)
  const distance = formatDistance(listing.distance_m)
  const place = listing.pickup_locations[0]
  const where = place ? placeLabel(place.municipality, place.city) : null

  const handleFavorite = () => {
    if (!user) {
      // A guest gets the sign-in screen and comes back here (doc 04 §4).
      router.push(`/auth/login?next=/listings/${listing.slug}`)
      return
    }
    setIsFavorite((previous) => !previous)
    toggleFavorite.mutate({ listingId: listing.id, isFavorite })
  }

  const handleShare = async () => {
    const url = typeof window === 'undefined' ? '' : window.location.href

    // The native sheet where there is one, clipboard everywhere else (doc 04 §4).
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: listing.title, url })
        return
      } catch {
        // Dismissing the share sheet is a normal outcome, not a failure.
        return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied — nothing useful to say about it.
    }
  }

  return (
    <header className="flex flex-col gap-2">
      {listing.category ? (
        <nav aria-label="Putanja kategorije" className="text-[13px] text-muted-foreground">
          {/* Only the leaf survives on a phone — the full trail wraps to three
              lines and pushes the title below the fold (doc 04 §4). */}
          <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
            <li className="hidden md:block">
              <Link href="/" className="text-muted-foreground no-underline hover:underline">
                Početna
              </Link>
            </li>
            {listing.category.breadcrumb.map((crumb, index, all) => (
              <li
                key={crumb.slug}
                className={cn(
                  'flex items-center gap-1',
                  index < all.length - 1 && 'hidden md:flex'
                )}
              >
                <span className="hidden text-zinc-300 md:inline" aria-hidden>
                  ›
                </span>
                <Link
                  href={`/search?category=${crumb.slug}`}
                  className="text-muted-foreground no-underline hover:underline"
                >
                  {crumb.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <h1 className="m-0 text-[22px] leading-tight font-semibold text-card-foreground md:text-[28px]">
          {listing.title}
        </h1>

        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Podeli oglas"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-muted"
          >
            {copied ? (
              <CheckIcon className="size-[18px] text-success" aria-hidden />
            ) : (
              <ShareIcon className="size-[18px]" strokeWidth={1.8} aria-hidden />
            )}
            <span className="hidden sm:inline">{copied ? 'Link kopiran' : 'Podeli'}</span>
          </button>

          {listing.is_own_listing ? null : (
            <button
              type="button"
              onClick={handleFavorite}
              aria-label={isFavorite ? 'Ukloni iz omiljenih' : 'Dodaj u omiljene'}
              aria-pressed={isFavorite}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-muted"
            >
              <HeartIcon
                className={cn('size-[18px]', isFavorite && 'fill-brand-500 text-brand-500')}
                strokeWidth={1.8}
                aria-hidden
              />
              <span className="hidden sm:inline">Sačuvaj</span>
            </button>
          )}
        </div>
      </div>

      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {rating && listing.rating_count > 0 ? (
          <span className="flex items-center gap-1 font-medium text-card-foreground">
            <StarIcon className="size-4 fill-accent-orange-500 text-accent-orange-500" aria-hidden />
            {rating}
            <span className="font-normal text-muted-foreground">
              ({pluralizeRatings(listing.rating_count)})
            </span>
          </span>
        ) : (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
            Novo
          </span>
        )}

        {/* Municipality and city only. Never the street (doc 04 §4). */}
        {where ? (
          <>
            <span aria-hidden>·</span>
            <span>{where}</span>
          </>
        ) : null}

        {distance ? (
          <>
            <span aria-hidden>·</span>
            <span>{distance} od tebe</span>
          </>
        ) : null}
      </p>
    </header>
  )
}
