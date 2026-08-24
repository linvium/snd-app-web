import { Suspense } from 'react'
import type { Metadata } from 'next'

import SearchResults from '@/components/search/SearchResults'
import { ListingCardSkeleton } from '@/components/listings/ListingCard'

export const metadata: Metadata = {
  title: 'Pretraga | SND',
  description: 'Pronađi šta ti treba u svom kraju - za datume koji ti odgovaraju.',
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchResults />
    </Suspense>
  )
}

function SearchPageSkeleton() {
  return (
    <div className="px-4 py-5 md:px-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
