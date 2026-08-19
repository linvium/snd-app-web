import { describe, expect, it } from 'vitest'

import { toListingCardItem } from '@/lib/listings/listings.card'
import type { OwnedListingSummary } from '@/types/listing'
import type { SearchResultListing } from '@/types/search'

const searchListing: SearchResultListing = {
  id: 'listing-1',
  slug: 'busilica',
  title: 'Bušilica',
  thumbnail_url: null,
  price_1_day_minor: 80000,
  rating_avg: 4.8,
  rating_count: 12,
  distance_m: 1200,
  municipality: 'Beograd',
  approx_latitude: 44.8,
  approx_longitude: 20.4,
  is_favorite: true,
  is_own: false,
  owner: { id: 'owner-1', display_name: 'Ana', is_verified: true },
}

const ownedListing: OwnedListingSummary = {
  id: 'listing-2',
  slug: null,
  title: 'Šator',
  thumbnail_url: null,
  price_1_day_minor: 0,
  status: 'draft',
  city: 'Niš',
}

describe('toListingCardItem', () => {
  it('maps a search result, including favorites and location', () => {
    const item = toListingCardItem(searchListing)
    expect(item.is_own).toBe(false)
    expect(item.is_favorite).toBe(true)
    expect(item.locationLabel).toBe('Beograd')
    expect(item.status).toBeNull()
    expect(item.ownerVerified).toBe(true)
  })

  it('treats an owned search hit as published so the owner menu can act', () => {
    const item = toListingCardItem({ ...searchListing, is_own: true, is_favorite: false })
    expect(item.is_own).toBe(true)
    expect(item.status).toBe('published')
    expect(item.is_favorite).toBe(false)
  })

  it('maps an owned summary onto the same card shape', () => {
    const item = toListingCardItem(ownedListing)
    expect(item.is_own).toBe(true)
    expect(item.status).toBe('draft')
    expect(item.locationLabel).toBe('Niš')
    expect(item.slug).toBeNull()
    expect(item.is_favorite).toBe(false)
  })
})
