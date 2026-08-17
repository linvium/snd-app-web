'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { favoritesService } from '@/lib/favorites'
import { searchKeys } from '@/lib/search'
import type { SearchResponse } from '@/types/search'

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

      const snapshot = queryClient.getQueriesData<SearchResponse>({ queryKey: searchKeys.all })

      queryClient.setQueriesData<SearchResponse>({ queryKey: searchKeys.all }, (previous) => {
        if (!previous?.data) return previous
        return {
          ...previous,
          data: previous.data.map((listing) =>
            listing.id === listingId ? { ...listing, is_favorite: !isFavorite } : listing
          ),
        }
      })

      return { snapshot }
    },

    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, value)
      }
    },
  })
}
