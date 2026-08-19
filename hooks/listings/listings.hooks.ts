'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

export function useListing(
  id: string | null,
  options: { enabled?: boolean; initialData?: Listing } = {}
) {
  const { enabled = true, initialData } = options
  return useQuery({
    queryKey: listingKeys.detail(id ?? ''),
    queryFn: ({ signal }) => listingsService.getListing(id!, signal),
    enabled: Boolean(id) && enabled,
    initialData,
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

export function useSaveListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveListingInput }) =>
      listingsService.saveListing(id, input),
    onSuccess: (listing) => {
      queryClient.setQueryData(listingKeys.detail(listing.id), listing)
    },
  })
}

export function usePublishListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => listingsService.publishListing(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: listingKeys.drafts() })
    },
  })
}

export function usePauseListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => listingsService.pauseListing(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) })
    },
  })
}

export function useResumeListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => listingsService.resumeListing(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) })
    },
  })
}

export function useUnpublishListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => listingsService.unpublishListing(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: listingKeys.drafts() })
    },
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => listingsService.deleteListing(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: listingKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: listingKeys.drafts() })
    },
  })
}

export function useUploadListingImage(ensureListingId: () => Promise<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const listingId = await ensureListingId()
      return listingsService.uploadImage(listingId, file)
    },
    onSuccess: async () => {
      const listingId = await ensureListingId()
      queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) })
    },
  })
}

export function useDeleteListingImage(listingId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: string) => {
      if (!listingId) throw new Error('Listing is not ready.')
      return listingsService.deleteImage(listingId, imageId)
    },
    onSuccess: () => {
      if (listingId) {
        queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) })
      }
    },
  })
}

export function useReorderListingImages(listingId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) => {
      if (!listingId) throw new Error('Listing is not ready.')
      return listingsService.reorderImages(listingId, order)
    },
    onMutate: async (order) => {
      if (!listingId) return { previous: undefined }
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
      if (listingId && context?.previous) {
        queryClient.setQueryData(listingKeys.detail(listingId), context.previous)
      }
    },
    onSettled: () => {
      if (listingId) {
        queryClient.invalidateQueries({ queryKey: listingKeys.detail(listingId) })
      }
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
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}
