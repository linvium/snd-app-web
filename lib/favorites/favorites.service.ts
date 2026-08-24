import { createClient } from '@/lib/supabase/client'
import { ApiError } from '@/lib/search/search.service'
import type { ApiErrorBody, SearchResultListing } from '@/types/search'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Nešto je krenulo naopako.' }
    )
  }
  return (await response.json()) as T
}

export const favoritesService = {
  list: async (signal?: AbortSignal): Promise<SearchResultListing[]> => {
    const response = await fetch('/api/v1/favorites', {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: SearchResultListing[] }>(response)
    return payload.data
  },

  add: async (listingId: string): Promise<void> => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    const { error } = await supabase
      .from('favorites')
      .upsert({ user_id: user.id, listing_id: listingId })
    if (error) throw error
  },

  remove: async (listingId: string): Promise<void> => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    if (error) throw error
  },
}
