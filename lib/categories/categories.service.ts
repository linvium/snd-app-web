import { ApiError } from '@/lib/search/search.service'
import type { SndCategory, SndCategoryCatalog } from '@/types/category'
import type { ApiErrorBody } from '@/types/search'

interface CategoriesResponse {
  data: SndCategory[]
}

interface CatalogResponse {
  data: SndCategoryCatalog[]
}

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

export const categoriesService = {
  /**
   * Only populated categories come back (doc 03 §11). With coordinates the
   * counts are computed inside that radius, so someone in Niš is not offered a
   * category that only exists in Belgrade (doc 02 §6.3).
   */
  getTree: async (
    options: { lat?: number | null; lng?: number | null; radiusKm?: number | null } = {},
    signal?: AbortSignal
  ): Promise<SndCategory[]> => {
    const query = new URLSearchParams()
    if (options.lat != null && options.lng != null) {
      query.set('lat', String(options.lat))
      query.set('lng', String(options.lng))
      if (options.radiusKm != null) query.set('radius', String(options.radiusKm))
    }

    const suffix = query.toString()
    const response = await fetch(`/api/v1/categories${suffix ? `?${suffix}` : ''}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<CategoriesResponse>(response)
    return payload.data
  },

  getCatalog: async (signal?: AbortSignal): Promise<SndCategoryCatalog[]> => {
    const response = await fetch('/api/v1/categories/all', {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<CatalogResponse>(response)
    return payload.data
  },

  suggest: async (title: string, signal?: AbortSignal): Promise<SndCategoryCatalog[]> => {
    const response = await fetch(
      `/api/v1/categories/suggest?title=${encodeURIComponent(title)}`,
      { signal, headers: { Accept: 'application/json' } }
    )
    const payload = await parseJson<CatalogResponse>(response)
    return payload.data
  },
}
