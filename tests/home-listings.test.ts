import { describe, expect, it } from 'vitest'

import {
  HOME_LATEST_COUNT,
  homeLatestSearchParams,
  takeHomeListings,
} from '@/lib/home/home-listings.helpers'
import type { SearchResultListing } from '@/types/search'

function listing(
  id: string,
  overrides: Partial<SearchResultListing> = {}
): SearchResultListing {
  return {
    id,
    slug: id,
    title: id,
    thumbnail_url: null,
    price_1_day_minor: 10000,
    rating_avg: null,
    rating_count: 0,
    distance_m: null,
    municipality: 'Beograd',
    approx_latitude: 44.8,
    approx_longitude: 20.4,
    is_favorite: false,
    is_own: false,
    owner: { id: 'owner', display_name: 'Ana', is_verified: false },
    ...overrides,
  }
}

describe('homeLatestSearchParams', () => {
  it('asks for newest listings nationwide, with no search centre', () => {
    const params = homeLatestSearchParams()

    expect(params.lat).toBeNull()
    expect(params.lng).toBeNull()
    expect(params.sort).toBe('newest')
    expect(params.q).toBeNull()
    expect(params.category).toBeNull()
  })
})

describe('takeHomeListings', () => {
  it('keeps at most twenty newest listings and drops the viewer’s own', () => {
    const listings = [
      listing('mine', { is_own: true }),
      ...Array.from({ length: 22 }, (_, index) => listing(`item-${index}`)),
    ]

    const taken = takeHomeListings(listings)

    expect(taken).toHaveLength(HOME_LATEST_COUNT)
    expect(taken.map((item) => item.id)).toEqual(
      Array.from({ length: HOME_LATEST_COUNT }, (_, index) => `item-${index}`)
    )
    expect(HOME_LATEST_COUNT).toBe(20)
  })
})
