'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { favoriteKeys, favoritesService } from '@/lib/favorites'
import { searchKeys } from '@/lib/search'
import type { SearchResponse, SearchResultListing } from '@/types/search'

export function useFavoriteListings(enabled = true) {
  return useQuery({
    queryKey: favoriteKeys.list(),
    queryFn: ({ signal }) => favoritesService.list(signal),
    enabled,
  })
}

/**
 * The heart flips immediately and the page does not reload (doc 02 §5.3).
 * Every cached search page is patched in place, because the same listing can
 * be on screen in the results and in the "Možda te zanima" strip at once.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listingId, isFavorite }: { listingId: string; isFavorite: boolean }) =>
      isFavorite ? favoritesService.remove(listingId) : favoritesService.add(listingId),

    onMutate: async ({ listingId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: searchKeys.all })
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all })

      const searchSnapshot = queryClient.getQueriesData<SearchResponse>({ queryKey: searchKeys.all })
      const favoritesSnapshot = queryClient.getQueryData<SearchResultListing[]>(favoriteKeys.list())

      queryClient.setQueriesData<SearchResponse>({ queryKey: searchKeys.all }, (previous) => {
        if (!previous?.data) return previous
        return {
          ...previous,
          data: previous.data.map((listing) =>
            listing.id === listingId ? { ...listing, is_favorite: !isFavorite } : listing
          ),
        }
      })

      if (isFavorite) {
        queryClient.setQueryData<SearchResultListing[]>(favoriteKeys.list(), (previous) =>
          (previous ?? []).filter((listing) => listing.id !== listingId)
        )
      }

      return { searchSnapshot, favoritesSnapshot }
    },

    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.searchSnapshot ?? []) {
        queryClient.setQueryData(key, value)
      }
      if (context?.favoritesSnapshot) {
        queryClient.setQueryData(favoriteKeys.list(), context.favoritesSnapshot)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list() })
    },
  })
}
