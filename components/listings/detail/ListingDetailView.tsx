'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

import { ContactOwnerDialog } from '@/components/listings/ContactOwnerCard'
import { ListingOwnerRequests } from '@/components/listings/ListingOwnerRequests'
import BookingCard from '@/components/listings/detail/BookingCard'
import CancellationTerms from '@/components/listings/detail/CancellationTerms'
import GuaranteeCard from '@/components/listings/detail/GuaranteeCard'
import ListingDescription from '@/components/listings/detail/ListingDescription'
import ListingGallery from '@/components/listings/detail/ListingGallery'
import ListingHeader from '@/components/listings/detail/ListingHeader'
import MobileBookingBar from '@/components/listings/detail/MobileBookingBar'
import PickupLocation from '@/components/listings/detail/PickupLocation'
import ReviewsSection from '@/components/listings/detail/ReviewsSection'
import SimilarListings from '@/components/listings/detail/SimilarListings'
import { useAuthSession } from '@/context/AuthContext'
import { useRecordListingView } from '@/hooks/listings'
import { useListingConversations } from '@/hooks/messages'
import {
  listingContactActionsPending,
  resolveListingConversationId,
} from '@/lib/messages'
import type { ListingDetail, ListingReview, ReviewSummary } from '@/types/listing-detail'

interface ListingDetailViewProps {
  listing: ListingDetail
  summary: ReviewSummary
  reviews: ListingReview[]
  ownerOtherCount: number
  initialConversationId: string | null
}

/**
 * The item page (doc 04 §2).
 *
 * Two columns on desktop with the booking card sticky beside them, one column
 * on mobile in the order doc 04 §2.2 sets out. The sections answer the page's
 * three questions in order - what is it, who is lending it, what does it cost -
 * because a reader who cannot find one of those answers leaves (doc 04 §1).
 *
 * Selected dates live in the URL. That is what lets a guest be sent to sign in
 * and come back to the same dates (doc 04 §16), and it makes a half-filled
 * booking shareable.
 */
export default function ListingDetailView({
  listing,
  summary,
  reviews,
  ownerOtherCount,
  initialConversationId,
}: ListingDetailViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuthSession()
  const existing = useListingConversations(listing.id, Boolean(user) && !listing.is_own_listing)
  const fetchSettled = existing.isSuccess || existing.isError
  const existingConversationId = resolveListingConversationId({
    fetchedId: existing.data[0]?.id,
    fetchSettled,
    fetchFailed: existing.isError,
    initialId: initialConversationId,
  })
  const contactActionsPending = listingContactActionsPending({
    conversationId: existingConversationId,
    isSignedIn: Boolean(user),
    authLoading: loading,
    fetchSettled,
  })

  const [requestOpen, setRequestOpen] = useState(false)
  const [dates, setDates] = useState<{ from: string | null; to: string | null }>({
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })

  useRecordListingView(listing.id)

  const handleDatesChange = useCallback(
    (from: string | null, to: string | null) => {
      setDates({ from, to })

      // `replace`, not `push`: picking dates is refining one page, and each
      // tap on a calendar should not become a stop on the way back.
      const params = new URLSearchParams(searchParams.toString())
      if (from) params.set('from', from)
      else params.delete('from')
      if (to) params.set('to', to)
      else params.delete('to')

      const query = params.toString()
      router.replace(query ? `?${query}` : '?', { scroll: false })
    },
    [router, searchParams]
  )

  return (
    <>
      <article className="mx-auto max-w-[1180px] px-4 pt-4 pb-28 md:pb-10">
        {/* One grid holds the whole page so the gallery can be rendered once
            and still sit above the title on a phone (doc 04 §2.2) and below it
            on desktop (§2.1) - two copies would mean two <h1>s in the document,
            one of them hidden, which is a real problem for anything reading the
            page rather than looking at it.

            On desktop the gallery is a member of the left column rather than a
            full-bleed band above both: the photo is evidence about the item,
            not the point of the page, and at 1180px wide it was crowding out
            the price it is supposed to be supporting.

            Mobile order comes from `order-*`; desktop from the explicit
            row/column placement, which wins over it. */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="order-1 lg:col-start-1 lg:row-start-2">
            <ListingGallery images={listing.images} title={listing.title} />
          </div>

          {/* Spans both columns: Podeli and Sačuvaj are page-level actions, so
              they belong at the page's right edge. Confined to column one they
              landed mid-canvas, reading as if they belonged to the photo. */}
          <div className="order-2 lg:col-start-1 lg:col-end-3 lg:row-start-1">
            <ListingHeader listing={listing} />
          </div>

          {/* One card, not a phone copy and a desktop copy: on a phone it sits
              right under the photos and the title, where the reader is still
              deciding, and on desktop the same element moves into column two.
              It used to sit below the price table on a phone, most of a screen
              further down. The fixed bar is the shortcut back to it.

              The guarantee rides along rather than sitting at the foot of the
              left column. It is the answer to the question the request button
              raises - "what happens if this goes wrong" - so it belongs beside
              the button, and it fills a column that was otherwise empty.

              The wrapper spans the gallery and detail rows so the sticky group
              inside has room to travel. */}
          <div className="order-3 lg:col-start-2 lg:row-start-2 lg:row-end-4">
            <div className="flex flex-col gap-4 lg:sticky lg:top-24">
              <BookingCard
                listing={listing}
                from={dates.from}
                to={dates.to}
                onDatesChange={handleDatesChange}
                onStartRequest={() => setRequestOpen(true)}
                existingConversationId={existingConversationId}
                contactActionsPending={contactActionsPending}
              />

              <GuaranteeCard
                capMinor={listing.guarantee_cap_minor}
                itemValueMinor={listing.item_value_minor}
              />
            </div>
          </div>

          <div className="order-4 flex flex-col gap-6 lg:col-start-1 lg:row-start-3">
            {listing.is_own_listing ? <ListingOwnerRequests listingId={listing.id} /> : null}

            {/* One sheet rather than four floating boxes. `divide-y` draws the
                rules between rendered children only, so a section that returns
                null (an item with no description) leaves no orphan hairline. */}
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card [&>section]:p-5">
              <ListingDescription description={listing.description} />
              <CancellationTerms policy={listing.cancellation_policy} />
              <PickupLocation
                locations={listing.pickup_locations}
                distanceMeters={listing.distance_m}
                canSeeExact={listing.can_see_exact_location}
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <ReviewsSection
                listingId={listing.id}
                summary={summary}
                initialReviews={reviews}
                ownerOtherCount={ownerOtherCount}
                ownerName={listing.owner.display_name}
              />
            </div>
          </div>
        </div>

        <SimilarListings listingId={listing.id} />
      </article>

      <MobileBookingBar
        listing={listing}
        from={dates.from}
        to={dates.to}
        onDatesChange={handleDatesChange}
        onStartRequest={() => setRequestOpen(true)}
        existingConversationId={existingConversationId}
        contactActionsPending={contactActionsPending}
      />

      {listing.is_own_listing ||
      listing.status !== 'published' ||
      contactActionsPending ||
      existingConversationId ? null : (
        <ContactOwnerDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          listingId={listing.id}
          from={dates.from}
          to={dates.to}
          onDatesChange={handleDatesChange}
          unavailable={listing.unavailable_dates}
        />
      )}
    </>
  )
}
