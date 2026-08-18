'use client'

import { EmailUnverifiedGate } from '@/components/listings/publish/EmailUnverifiedGate'
import { PublishListingForm } from '@/components/listings/publish/PublishListingForm'
import { PageLoading } from '@/components/ui/page-loading'
import { useCurrentUser } from '@/hooks/user'

export function PublishListingPage({ listingId }: { listingId?: string }) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) {
    return <PageLoading>Učitavanje…</PageLoading>
  }

  if (!user?.email_verified_at) {
    return (
      <div className="px-4 py-10">
        <EmailUnverifiedGate />
      </div>
    )
  }

  return <PublishListingForm listingId={listingId} />
}
