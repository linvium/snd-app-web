import { ApiError } from '@/lib/search/search.service'
import type { ApiErrorBody } from '@/types/search'
import type {
  GeocodeResult,
  Listing,
  ListingDraftSummary,
  ListingImage,
  PriceSuggestion,
  PublishListingResponse,
  SaveListingInput,
} from '@/types/listing'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Nismo mogli da sačuvamo izmene. Pokušaj ponovo.' }
    )
  }
  return (await response.json()) as T
}

export const listingsService = {
  listDrafts: async (signal?: AbortSignal): Promise<ListingDraftSummary[]> => {
    const response = await fetch('/api/v1/listings', {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: ListingDraftSummary[] }>(response)
    return payload.data
  },

  createDraft: async (): Promise<Listing> => {
    const response = await fetch('/api/v1/listings', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: Listing }>(response)
    return payload.data
  },

  getListing: async (id: string, signal?: AbortSignal): Promise<Listing> => {
    const response = await fetch(`/api/v1/listings/${id}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: Listing }>(response)
    return payload.data
  },

  saveListing: async (id: string, input: SaveListingInput): Promise<Listing> => {
    const response = await fetch(`/api/v1/listings/${id}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const payload = await parseJson<{ data: Listing }>(response)
    return payload.data
  },

  publishListing: async (id: string): Promise<PublishListingResponse> => {
    const response = await fetch(`/api/v1/listings/${id}/publish`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: PublishListingResponse }>(response)
    return payload.data
  },

  pauseListing: async (id: string): Promise<void> => {
    const response = await fetch(`/api/v1/listings/${id}/pause`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    await parseJson(response)
  },

  resumeListing: async (id: string): Promise<void> => {
    const response = await fetch(`/api/v1/listings/${id}/resume`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    await parseJson(response)
  },

  deleteListing: async (id: string): Promise<void> => {
    const response = await fetch(`/api/v1/listings/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
    await parseJson(response)
  },

  uploadImage: async (
    listingId: string,
    file: File
  ): Promise<Pick<ListingImage, 'id' | 'thumbnail_url' | 'sort_order'> & { is_portrait?: boolean }> => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`/api/v1/listings/${listingId}/images`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    })
    const payload = await parseJson<{
      data: Pick<ListingImage, 'id' | 'thumbnail_url' | 'sort_order'> & { is_portrait?: boolean }
    }>(response)
    return payload.data
  },

  deleteImage: async (listingId: string, imageId: string): Promise<void> => {
    const response = await fetch(`/api/v1/listings/${listingId}/images/${imageId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
    await parseJson(response)
  },

  reorderImages: async (listingId: string, order: string[]): Promise<void> => {
    const response = await fetch(`/api/v1/listings/${listingId}/images/order`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    })
    await parseJson(response)
  },

  priceSuggestions: async (
    categoryId: string,
    signal?: AbortSignal
  ): Promise<PriceSuggestion | null> => {
    const response = await fetch(
      `/api/v1/listings/price-suggestions?category_id=${encodeURIComponent(categoryId)}`,
      { signal, headers: { Accept: 'application/json' } }
    )
    if (response.status === 204) return null
    const payload = await parseJson<{ data: PriceSuggestion }>(response)
    return payload.data
  },
}

export const geoService = {
  geocode: async (query: string, signal?: AbortSignal): Promise<GeocodeResult[]> => {
    const response = await fetch(`/api/v1/geo/geocode?q=${encodeURIComponent(query)}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: GeocodeResult[] }>(response)
    return payload.data
  },
}
