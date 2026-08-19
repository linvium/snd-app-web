'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function ListingPublishedToast() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const published = searchParams.get('published') === '1'
    const saved = searchParams.get('saved') === '1'
    const draft = searchParams.get('draft') === '1'
    if (!published && !saved && !draft) return

    if (published) toast.success('Oglas je objavljen.', { id: 'listing-published' })
    if (saved) toast.success('Izmene su sačuvane.', { id: 'listing-saved' })
    if (draft) toast.success('Nacrt je sačuvan.', { id: 'listing-draft' })

    const next = new URLSearchParams(searchParams.toString())
    next.delete('published')
    next.delete('saved')
    next.delete('draft')
    const query = next.toString()
    router.replace(query ? `/profile/listings?${query}` : '/profile/listings', { scroll: false })
  }, [router, searchParams])

  return null
}
