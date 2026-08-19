'use client'

import { EmailUnverifiedGate } from '@/components/listings/publish/EmailUnverifiedGate'
import { PublishListingForm } from '@/components/listings/publish/PublishListingForm'
import { PageLoading } from '@/components/ui/page-loading'
import { useCurrentUser } from '@/hooks/user'
import type { Listing } from '@/types/listing'

export function PublishListingPage({
  listingId,
  initialListing,
}: {
  listingId?: string
  initialListing?: Listing
}) {
  const { data: user, isLoading } = useCurrentUser()
  const isEdit = Boolean(listingId)

  if (!isEdit && isLoading) {
    return <PageLoading>Učitavanje…</PageLoading>
  }

  if (!isLoading && !user?.email_verified_at) {
    return (
      <div className="px-4 py-10">
        <EmailUnverifiedGate />
      </div>
    )
  }

  return <PublishListingForm listingId={listingId} initialListing={initialListing} />
}
