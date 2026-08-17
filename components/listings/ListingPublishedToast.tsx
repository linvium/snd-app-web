'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function ListingPublishedToast() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('published') === '1') {
      toast.success('Oglas je objavljen.', { id: 'listing-published' })
    }
    if (searchParams.get('saved') === '1') {
      toast.success('Izmene su sačuvane.', { id: 'listing-saved' })
    }
  }, [searchParams])

  return null
}
