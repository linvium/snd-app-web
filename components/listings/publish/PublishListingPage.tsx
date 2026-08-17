'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { EmailUnverifiedGate } from '@/components/listings/publish/EmailUnverifiedGate'
import { DraftResumeBanner } from '@/components/listings/publish/DraftResumeBanner'
import { PublishListingForm } from '@/components/listings/publish/PublishListingForm'
import { PageLoading } from '@/components/ui/page-loading'
import { useCurrentUser } from '@/hooks/user'
import { useCreateDraft, useListingDrafts } from '@/hooks/listings'

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

  if (!listingId) {
    return <NewListingEntry />
  }

  return <PublishListingForm listingId={listingId} />
}

function NewListingEntry() {
  const router = useRouter()
  const drafts = useListingDrafts()
  const create = useCreateDraft()
  const startedRef = useRef(false)

  useEffect(() => {
    if (!drafts.isSuccess) return
    if (drafts.data.length > 0) return
    if (startedRef.current) return
    startedRef.current = true
    create.mutate(undefined, {
      onSuccess: (listing) => {
        router.replace(`/listings/new/${listing.id}`)
      },
    })
  }, [create, drafts.data, drafts.isSuccess, router])

  if (drafts.isLoading || create.isPending || (drafts.isSuccess && drafts.data.length === 0)) {
    return <PageLoading>Pripremam oglas…</PageLoading>
  }

  const draft = drafts.data?.[0]
  if (!draft) return null

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10">
      <DraftResumeBanner
        draft={draft}
        starting={create.isPending}
        onContinue={() => router.replace(`/listings/new/${draft.id}`)}
        onStartNew={() => {
          create.mutate(undefined, {
            onSuccess: (listing) => router.replace(`/listings/new/${listing.id}`),
          })
        }}
      />
    </div>
  )
}
