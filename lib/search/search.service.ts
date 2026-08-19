import { HOME_LATEST_COUNT, homeLatestSearchParams } from '@/lib/home/home-listings.helpers'
import { buildSearchQuery } from '@/lib/search/search.params'
import type {
  ApiErrorBody,
  MapPinsResponse,
  SearchCenterSource,
  SearchParams,
  SearchResponse,
} from '@/types/search'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fields = body.fields
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Nešto je krenulo naopako.' }
    )
  }

  return (await response.json()) as T
}

/**
 * `centerSource` is passed through rather than derived server-side: only the
 * browser knows whether a coordinate came from the GPS permission, the saved
 * profile location, or a city pick, and the heading above the results turns on
 * exactly that (doc 03 §7.4).
 */
function searchQueryString(
  params: SearchParams,
  centerSource: SearchCenterSource | undefined,
  extra?: Record<string, string>
): string {
  const query = buildSearchQuery(params)
  if (centerSource) query.set('center_source', centerSource)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) query.set(key, value)
  }
  return query.toString()
}

export const searchService = {
  searchListings: (
    params: SearchParams,
    centerSource?: SearchCenterSource,
    signal?: AbortSignal
  ): Promise<SearchResponse> =>
    getJson<SearchResponse>(
      `/api/v1/listings/search?${searchQueryString(params, centerSource)}`,
      signal
    ),

  // The map ignores paging: it always draws the whole result set (doc 03 §9.4).
  searchPins: (
    params: SearchParams,
    centerSource?: SearchCenterSource,
    signal?: AbortSignal
  ): Promise<MapPinsResponse> =>
    getJson<MapPinsResponse>(
      `/api/v1/listings/search/pins?${searchQueryString(params, centerSource)}`,
      signal
    ),

  /** Populates the "Možda te zanima" strip shown under every empty result. */
  suggestedListings: (
    params: Pick<SearchParams, 'lat' | 'lng'>,
    signal?: AbortSignal
  ): Promise<SearchResponse> => {
    const query = new URLSearchParams({ limit: '4' })
    if (params.lat !== null && params.lng !== null) {
      query.set('lat', String(params.lat))
      query.set('lng', String(params.lng))
    }
    return getJson<SearchResponse>(`/api/v1/listings/recent?${query.toString()}`, signal)
  },

  homeLatestListings: (signal?: AbortSignal): Promise<SearchResponse> =>
    getJson<SearchResponse>(
      `/api/v1/listings/search?${searchQueryString(homeLatestSearchParams(), 'none', {
        limit: String(HOME_LATEST_COUNT),
      })}`,
      signal
    ),
}
