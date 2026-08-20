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
import OwnerCard from '@/components/listings/detail/OwnerCard'
import PickupLocation from '@/components/listings/detail/PickupLocation'
import PriceTable from '@/components/listings/detail/PriceTable'
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
        {/* Doc 04 §2.2 puts the gallery above the title on a phone and §2.1
            puts it below on desktop. Reordered with flex rather than rendered
            twice - two copies would mean two <h1>s in the document, one of
            them hidden, which is a real problem for anything reading the page
            rather than looking at it. */}
        <div className="flex flex-col gap-4">
          <div className="order-1 md:order-2">
            <ListingGallery images={listing.images} title={listing.title} />
          </div>
          <div className="order-2 md:order-1">
            <ListingHeader listing={listing} />
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
          <div className="flex flex-col gap-8">
            <OwnerCard owner={listing.owner} />
            {listing.is_own_listing ? <ListingOwnerRequests listingId={listing.id} /> : null}
            <ListingDescription description={listing.description} />
            <PriceTable listing={listing} />

            {/* On a phone the booking card sits inline here, between prices and
                terms, matching the order in doc 04 §2.2. The fixed bar below
                is the shortcut, not the only route to it. */}
            <div className="lg:hidden">
              <BookingCard
                listing={listing}
                from={dates.from}
                to={dates.to}
                onDatesChange={handleDatesChange}
                onStartRequest={() => setRequestOpen(true)}
                existingConversationId={existingConversationId}
                contactActionsPending={contactActionsPending}
                variant="plain"
              />
            </div>

            <CancellationTerms policy={listing.cancellation_policy} />
            <PickupLocation
              locations={listing.pickup_locations}
              distanceMeters={listing.distance_m}
              canSeeExact={listing.can_see_exact_location}
            />
            <GuaranteeCard capMinor={listing.guarantee_cap_minor} />
            <ReviewsSection
              listingId={listing.id}
              summary={summary}
              initialReviews={reviews}
              ownerOtherCount={ownerOtherCount}
              ownerName={listing.owner.display_name}
            />
          </div>

          <div className="hidden lg:block">
            <BookingCard
              listing={listing}
              from={dates.from}
              to={dates.to}
              onDatesChange={handleDatesChange}
              onStartRequest={() => setRequestOpen(true)}
              existingConversationId={existingConversationId}
              contactActionsPending={contactActionsPending}
            />
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
