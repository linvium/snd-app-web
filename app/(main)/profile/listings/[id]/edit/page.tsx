import { notFound, redirect } from 'next/navigation'

import { PublishListingPage } from '@/components/listings/publish/PublishListingPage'
import { loadOwnedListing } from '@/lib/listings/listings.server'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Izmeni oglas',
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/profile/listings/${id}/edit`)
  }

  const loaded = await loadOwnedListing(supabase, id, user.id)
  if ('response' in loaded) notFound()

  return <PublishListingPage listingId={id} initialListing={loaded.listing} />
}
