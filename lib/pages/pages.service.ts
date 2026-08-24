import { ApiError } from '@/lib/search/search.service'
import type { ApiErrorBody } from '@/types/search'
import type { SndPageDocument, SndPageSummary } from '@/types/page'

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

export const pagesService = {
  /** The body the support sheet renders, headings already anchored. */
  getPage: async (slug: string, signal?: AbortSignal): Promise<SndPageDocument> => {
    const response = await fetch(`/api/v1/pages/${encodeURIComponent(slug)}`, { signal })
    const body = await parseJson<{ data: SndPageDocument }>(response)
    return body.data
  },

  /** The other pages in the same category, shown at the foot of the sheet. */
  getCategory: async (category: string, signal?: AbortSignal): Promise<SndPageSummary[]> => {
    const response = await fetch(`/api/v1/pages?category=${encodeURIComponent(category)}`, {
      signal,
    })
    const body = await parseJson<{ data: SndPageSummary[] }>(response)
    return body.data
  },
}
