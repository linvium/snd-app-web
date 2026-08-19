export const LISTING_STATUSES = ['draft', 'published', 'paused', 'rejected', 'deleted'] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const CANCELLATION_POLICIES = ['flexible', 'medium', 'strict'] as const
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number]

export const ACTIVE_BOOKING_STATUSES = ['accepted', 'paid', 'in_progress'] as const

export const TITLE_MIN = 3
export const TITLE_MAX = 120
export const DESCRIPTION_MIN = 20
export const DESCRIPTION_MAX = 4000
export const PRICE_1_DAY_MIN_RSD = 1
export const PRICE_1_DAY_MAX_RSD = 100_000
export const ITEM_VALUE_MIN_RSD = 1_000
export const ITEM_VALUE_MAX_RSD = 5_000_000
export const MAX_LISTING_IMAGES = 8
export const MIN_LISTING_IMAGES = 1
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MIN_IMAGE_WIDTH = 600
export const MIN_IMAGE_HEIGHT = 450

export const RSD_TO_PARA = 100

export interface ListingImage {
  id: string
  listing_id: string
  url: string
  thumbnail_url: string
  medium_url: string
  large_url: string
  sort_order: number
  created_at: string
}

export interface Listing {
  id: string
  owner_id: string
  category_id: string | null
  title: string | null
  slug: string | null
  description: string | null
  price_1_day_minor: number | null
  price_3_days_minor: number | null
  price_7_days_minor: number | null
  item_value_minor: number | null
  cancellation_policy: CancellationPolicy
  status: ListingStatus
  published_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  images: ListingImage[]
  location_ids: string[]
  has_active_booking: boolean
}

export interface ListingDraftSummary {
  id: string
  title: string | null
  updated_at: string
}

export interface OwnedListingSummary {
  id: string
  slug: string | null
  title: string
  thumbnail_url: string | null
  price_1_day_minor: number
  status: ListingStatus
  city: string | null
}

export interface SaveListingInput {
  title?: string | null
  description?: string | null
  category_id?: string | null
  price_1_day_minor?: number | null
  price_3_days_minor?: number | null
  price_7_days_minor?: number | null
  item_value_minor?: number | null
  cancellation_policy?: CancellationPolicy
  location_ids?: string[]
}

export interface PublishListingResponse {
  id: string
  slug: string
  status: ListingStatus
}

export interface PriceSuggestion {
  category_id: string
  category_name: string
  price_1_day_minor: number
  price_3_days_minor: number
  price_7_days_minor: number
  sample_size: number
  source: 'median' | 'category'
}

export interface GeocodeResult {
  label: string
  street: string
  city: string
  postal_code: string | null
  latitude: number
  longitude: number
}

export type StepKey =
  | 'describe'
  | 'photos'
  | 'category'
  | 'price'
  | 'locations'
  | 'cancellation'
  | 'value'
