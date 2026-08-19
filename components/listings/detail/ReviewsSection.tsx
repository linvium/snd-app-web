'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { StarIcon } from 'lucide-react'

import ReportReviewDialog from '@/components/listings/detail/ReportReviewDialog'
import { Button } from '@/components/ui/button'
import { useListingReviews } from '@/hooks/reviews'
import { formatMonthYear, formatRating, pluralizeReviews } from '@/lib/listings'
import { colorFromUserId } from '@/lib/profiles'
import { cn } from '@/lib/utils'
import type { ListingReview, ReviewSummary } from '@/types/listing-detail'

const RATINGS = [5, 4, 3, 2, 1] as const

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Ocena ${rating} od 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon
          key={value}
          className={cn(
            'size-3.5',
            value <= rating ? 'fill-accent-orange-500 text-accent-orange-500' : 'text-zinc-300'
          )}
          aria-hidden
        />
      ))}
    </span>
  )
}

function ReviewRow({
  review,
  showListing,
  onReport,
}: {
  review: ListingReview
  showListing: boolean
  onReport: (reviewId: string) => void
}) {
  const initials = review.author.display_name.charAt(0).toUpperCase()

  return (
    <li className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        {review.author.avatar_url ? (
          <Image
            src={review.author.avatar_url}
            alt=""
            width={36}
            height={36}
            className="size-9 flex-none rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-9 flex-none place-items-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: colorFromUserId(review.author.id) }}
          >
            {initials || '?'}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-card-foreground">
              {review.author.display_name}
            </span>
            <Stars rating={review.rating} />
            <span className="text-[13px] text-muted-foreground">
              {formatMonthYear(review.created_at)}
            </span>
          </div>

          {/* On the owner's other items, the title says which thing this was
              about — without it the review reads as being about this one. */}
          {showListing && review.listing.slug && review.listing.title ? (
            <p className="mt-1 mb-0 text-[13px]">
              <Link
                href={`/listings/${review.listing.slug}`}
                className="text-brand-700 no-underline hover:underline"
              >
                {review.listing.title}
              </Link>
            </p>
          ) : null}

          {review.comment ? (
            <p className="mt-1.5 mb-0 text-sm leading-6 whitespace-pre-wrap text-foreground">
              {review.comment}
            </p>
          ) : null}

          {review.reply ? (
            <div className="mt-3 border-l-2 border-border pl-3">
              <p className="m-0 text-[13px] font-semibold text-card-foreground">
                Odgovor vlasnika
              </p>
              <p className="mt-1 mb-0 text-sm leading-6 whitespace-pre-wrap text-foreground">
                {review.reply}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => onReport(review.id)}
            className="mt-2 cursor-pointer border-none bg-transparent p-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Prijavi
          </button>
        </div>
      </div>
    </li>
  )
}

interface ReviewsSectionProps {
  listingId: string
  summary: ReviewSummary
  initialReviews: ListingReview[]
  ownerOtherCount: number
  ownerName: string
}

/**
 * Reviews (doc 04 §11).
 *
 * The histogram sits above the list because an average alone hides its own
 * shape: 4,0 from a dozen fours and 4,0 from half fives and half threes are
 * different things to rent from, and the bars are what tell them apart.
 *
 * Reviews of the owner's *other* items are kept in their own labelled group
 * rather than mixed in — doc 04 §11 counts them as relevant, but a review of a
 * different drill must not read as a review of this one.
 */
export default function ReviewsSection({
  listingId,
  summary,
  initialReviews,
  ownerOtherCount,
  ownerName,
}: ReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const [showOwnerOther, setShowOwnerOther] = useState(false)
  const [reportingId, setReportingId] = useState<string | null>(null)

  const allReviews = useListingReviews(listingId, 'listing', { enabled: showAll })
  const otherReviews = useListingReviews(listingId, 'owner_other', { enabled: showOwnerOther })

  const rating = formatRating(summary.rating_avg)
  const maxBar = Math.max(1, ...RATINGS.map((value) => summary.histogram[value]))
  const shown = showAll && allReviews.data?.data ? allReviews.data.data : initialReviews

  return (
    <section>
      <h2 className="mt-0 mb-4 text-lg font-semibold text-card-foreground">Recenzije</h2>

      {summary.rating_count === 0 ? (
        <p className="m-0 rounded-xl border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          Još nema recenzija za ovaj predmet. Budi prvi.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <p className="m-0 flex items-baseline gap-2">
              <StarIcon
                className="size-5 self-center fill-accent-orange-500 text-accent-orange-500"
                aria-hidden
              />
              <span className="text-2xl font-semibold text-card-foreground">{rating}</span>
              <span className="text-sm text-muted-foreground">
                {pluralizeReviews(summary.rating_count)}
              </span>
            </p>

            <ul className="m-0 w-full max-w-xs list-none space-y-1 p-0">
              {RATINGS.map((value) => {
                const count = summary.histogram[value]
                return (
                  <li key={value} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-6 tabular-nums">{value} ★</span>
                    <span
                      className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                      role="presentation"
                    >
                      <span
                        className="block h-full rounded-full bg-accent-orange-500"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right tabular-nums">{count}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <ul className="mt-5 mb-0 list-none p-0">
            {shown.map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                showListing={false}
                onReport={setReportingId}
              />
            ))}
          </ul>

          {!showAll && summary.rating_count > initialReviews.length ? (
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setShowAll(true)}
              disabled={allReviews.isFetching}
            >
              {allReviews.isFetching
                ? 'Učitavam…'
                : `Prikaži sve recenzije (${summary.rating_count})`}
            </Button>
          ) : null}
        </>
      )}

      {ownerOtherCount > 0 ? (
        <div className="mt-8">
          <h3 className="mt-0 mb-3 text-base font-semibold text-card-foreground">
            Recenzije za druge predmete korisnika {ownerName}
          </h3>

          {showOwnerOther ? (
            otherReviews.isPending ? (
              <p className="m-0 text-sm text-muted-foreground">Učitavam…</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {(otherReviews.data?.data ?? []).map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    showListing
                    onReport={setReportingId}
                  />
                ))}
              </ul>
            )
          ) : (
            <Button variant="secondary" onClick={() => setShowOwnerOther(true)}>
              Prikaži ({ownerOtherCount})
            </Button>
          )}
        </div>
      ) : null}

      <ReportReviewDialog
        reviewId={reportingId}
        open={reportingId !== null}
        onOpenChange={(open) => {
          if (!open) setReportingId(null)
        }}
      />
    </section>
  )
}
