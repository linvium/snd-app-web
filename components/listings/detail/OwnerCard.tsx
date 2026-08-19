'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheckIcon, ClockIcon, MessageSquareIcon, StarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  formatMonthYear,
  formatRating,
  pluralizeRatings,
  responseRateText,
  responseTimeText,
} from '@/lib/listings'
import { colorFromUserId } from '@/lib/profiles'
import type { OwnerSummary } from '@/types/listing-detail'

/**
 * The trust card (doc 04 §5).
 *
 * Every metric here is conditional, and the conditions are the point: a badge
 * whose verification has lapsed, or a response rate drawn from two
 * conversations, is worse than no badge at all — it lends confidence the data
 * does not support. So each line is either backed by enough evidence or it is
 * not rendered.
 */
export default function OwnerCard({
  owner,
}: {
  owner: OwnerSummary
}) {
  const rating = formatRating(owner.rating_avg)
  const memberSince = formatMonthYear(owner.member_since)
  const responseTime = responseTimeText(owner)
  const responseRate = responseRateText(owner)

  const initials = owner.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-start gap-3">
        {owner.avatar_url ? (
          <Image
            src={owner.avatar_url}
            alt=""
            width={52}
            height={52}
            className="size-13 flex-none rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-13 flex-none place-items-center rounded-full text-lg font-semibold text-white"
            style={{ backgroundColor: colorFromUserId(owner.id) }}
          >
            {initials || '?'}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base font-semibold text-card-foreground">
              {owner.display_name}
            </span>
            {/* Shown only while the verification is current (doc 04 §5). */}
            {owner.is_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                <BadgeCheckIcon className="size-3.5" aria-hidden />
                Verifikovan
              </span>
            ) : null}
          </p>

          {memberSince ? (
            <p className="mt-0.5 mb-0 text-[13px] text-muted-foreground">Član od {memberSince}</p>
          ) : null}

          <div className="mt-2 flex flex-col gap-1 text-[13px] text-zinc-700">
            {rating && owner.rating_count > 0 ? (
              <p className="m-0 flex items-center gap-1.5">
                <StarIcon
                  className="size-4 fill-accent-orange-500 text-accent-orange-500"
                  aria-hidden
                />
                <span className="font-medium">{rating}</span>
                <span className="text-muted-foreground">
                  ({pluralizeRatings(owner.rating_count)})
                </span>
              </p>
            ) : null}

            {responseTime ? (
              <p className="m-0 flex items-center gap-1.5">
                <ClockIcon className="size-4 text-zinc-400" strokeWidth={1.8} aria-hidden />
                {responseTime}
              </p>
            ) : null}

            {responseRate ? (
              <p className="m-0 flex items-center gap-1.5">
                <MessageSquareIcon className="size-4 text-zinc-400" strokeWidth={1.8} aria-hidden />
                {responseRate}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/users/${owner.id}`}>Pogledaj profil</Link>
        </Button>
      </div>
    </section>
  )
}
