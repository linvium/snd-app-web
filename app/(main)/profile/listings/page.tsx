import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { MyListings } from '@/components/listings/MyListings'
import { listOwnListings } from '@/lib/listings/listings.server'
import { createClient } from '@/lib/supabase/server'

export default async function ProfileListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; highlight?: string }>
}) {
  const { highlight } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/profile/listings')
  }

  let listings
  try {
    listings = await listOwnListings(supabase, user.id)
  } catch (error) {
    console.error('[listings] list own listings failed', error)
    return <p className="text-sm text-muted-foreground">Nismo mogli da učitamo oglase. Pokušaj ponovo.</p>
  }

  return (
    <Suspense>
      <MyListings listings={listings} highlightId={highlight ?? null} />
    </Suspense>
  )
}
