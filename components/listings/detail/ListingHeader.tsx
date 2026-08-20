'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BadgeCheckIcon,
  CheckIcon,
  ChevronLeftIcon,
  HeartIcon,
  ShareIcon,
  StarIcon,
} from 'lucide-react'

import { useAuthSession } from '@/context/AuthContext'
import { useToggleFavorite } from '@/hooks/favorites'
import { formatRating, placeLabel, pluralizeRatings, responseTimeText } from '@/lib/listings'
import { colorFromUserId } from '@/lib/profiles'
import { formatDistance } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { ListingDetail } from '@/types/listing-detail'

/**
 * Title block (doc 04 §4, §5).
 *
 * The rating line answers "can I trust this" before the reader scrolls, so a
 * listing with no reviews says "Nema ocena" rather than showing an empty star —
 * an unrated thing and a badly rated thing must not look alike, and a label
 * that sounds like a feature ("Novo") reads as a boast rather than an absence.
 *
 * Who is lending it is one line here rather than a card of its own: on an item
 * page the owner is context for the thing, not the subject of the page, and a
 * panel gave them more weight than the price they were competing with.
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

  const owner = listing.owner
  const ownerResponse = responseTimeText(owner)
  const ownerInitials = owner.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

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
      <button
        type="button"
        data-testid="mobile-back"
        aria-label="Nazad"
        onClick={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
            return
          }
          router.push('/')
        }}
        className="-ml-2 mb-1 grid size-10 place-items-center rounded-md text-foreground hover:bg-muted md:hidden"
      >
        <ChevronLeftIcon className="size-[22px]" strokeWidth={2} aria-hidden />
      </button>
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
              data-testid="listing-favorite"
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
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Nema ocena
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

      {/* Who is lending it (doc 04 §5) — a line under the title, not a panel. */}
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {owner.avatar_url ? (
          <Image
            src={owner.avatar_url}
            alt=""
            width={24}
            height={24}
            className="size-6 flex-none rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-6 flex-none place-items-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: colorFromUserId(owner.id) }}
          >
            {ownerInitials || '?'}
          </span>
        )}

        <span>
          Iznajmljuje{' '}
          <Link
            href={`/users/${owner.id}`}
            className="font-medium text-card-foreground no-underline hover:underline"
          >
            {owner.display_name}
          </Link>
        </span>

        {/* Shown only while the verification is current (doc 04 §5). */}
        {owner.is_verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
            <BadgeCheckIcon className="size-3.5" aria-hidden />
            Verifikovan
          </span>
        ) : null}

        {/* Hidden below five conversations — a rate drawn from two is worse
            than none at all (doc 04 §5). */}
        {ownerResponse ? (
          <>
            <span aria-hidden>·</span>
            <span>{ownerResponse.toLowerCase()}</span>
          </>
        ) : null}
      </p>
    </header>
  )
}
