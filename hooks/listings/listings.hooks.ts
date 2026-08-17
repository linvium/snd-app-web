'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { geoKeys, geoService, listingKeys, listingsService } from '@/lib/listings'
import type { Listing, SaveListingInput } from '@/types/listing'

export function useListingDrafts(enabled = true) {
  return useQuery({
    queryKey: listingKeys.drafts(),
    queryFn: ({ signal }) => listingsService.listDrafts(signal),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useListing(id: string | null, enabled = true) {
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    queryFn: ({ signal }) => listingsService.getListing(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useCreateDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => listingsService.createDraft(),
    onSuccess: (listing) => {
      queryClient.setQueryData(listingKeys.detail(listing.id), listing)
      queryClient.invalidateQueries({ queryKey: listingKeys.drafts() })
    },
  })
}

export function useSaveListing(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveListingInput) => listingsService.saveListing(id, input),
    onSuccess: (listing) => {
      queryClient.setQueryData(listingKeys.detail(id), listing)
    },
  })
}

export function usePublishListing(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => listingsService.publishListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: listingKeys.drafts() })
    },
  })
}

export function usePauseListing(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => listingsService.pauseListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) })
    },
  })
}

export function useResumeListing(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => listingsService.resumeListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) })
    },
  })
}

export function useDeleteListing(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => listingsService.deleteListing(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: listingKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: listingKeys.drafts() })
    },
  })
}

export function useUploadListingImage(listingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => listingsService.uploadImage(listingId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) })
    },
  })
}

export function useDeleteListingImage(listingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: string) => listingsService.deleteImage(listingId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) })
    },
  })
}

export function useReorderListingImages(listingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) => listingsService.reorderImages(listingId, order),
    onMutate: async (order) => {
      await queryClient.cancelQueries({ queryKey: listingKeys.detail(listingId) })
      const previous = queryClient.getQueryData<Listing>(listingKeys.detail(listingId))
      if (previous) {
        const byId = new Map(previous.images.map((image) => [image.id, image]))
        queryClient.setQueryData<Listing>(listingKeys.detail(listingId), {
          ...previous,
          images: order.flatMap((id) => {
            const image = byId.get(id)
            return image ? [image] : []
          }),
        })
      }
      return { previous }
    },
    onError: (_error, _order, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listingKeys.detail(listingId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) })
    },
  })
}

export function usePriceSuggestions(categoryId: string | null) {
  return useQuery({
    queryKey: listingKeys.priceSuggestions(categoryId ?? ''),
    queryFn: ({ signal }) => listingsService.priceSuggestions(categoryId!, signal),
    enabled: Boolean(categoryId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useGeocode(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: geoKeys.geocode(trimmed),
    queryFn: ({ signal }) => geoService.geocode(trimmed, signal),
    enabled: trimmed.length >= 3,
    staleTime: 60 * 1000,
  })
}
