'use client'

import { useQuery } from '@tanstack/react-query'

import { takeHomeListings } from '@/lib/home/home-listings.helpers'
import { searchKeys, searchService } from '@/lib/search'

export function useHomeListings() {
  const query = useQuery({
    queryKey: searchKeys.homeLatest(),
    queryFn: ({ signal }) => searchService.homeLatestListings(signal),
    staleTime: 5 * 60 * 1000,
  })

  return {
    listings: takeHomeListings(query.data?.data ?? []),
    isPending: query.isPending,
    isError: query.isError,
  }
}
