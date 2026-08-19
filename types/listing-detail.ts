import type { PriceBreakdownEntry } from '@/lib/pricing'
import type { CancellationPolicy, ListingStatus } from '@/types/listing'

/** Doc 04 §14 — the item page payload. */

export interface CategoryNode {
  id: string
  parent_id: string | null
  name: string
  slug: string
  level: number
  guarantee_cap_minor: number | null
}

export interface BreadcrumbItem {
  name: string
  slug: string
}

export interface DetailImage {
  id: string
  thumbnail_url: string
  medium_url: string
  large_url: string
  width: number
  height: number
  sort_order: number
}

/**
 * A pickup point as the page may show it.
 *
 * `street`, `postal_code`, `latitude` and `longitude` are optional in the type
 * because they are genuinely absent for most callers — the public view does not
 * select them (doc 04 §9). Anything reading them has to handle their absence,
 * which is the intent.
 */
export interface PickupLocation {
  id: string
  label: string
  municipality: string
  city: string
  approx_latitude: number
  approx_longitude: number
  street?: string
  postal_code?: string | null
  latitude?: number
  longitude?: number
}

export interface OwnerSummary {
  id: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
  member_since: string
  rating_avg: number | null
  rating_count: number
  avg_response_minutes: number | null
  response_rate: number | null
  /** Conversations in the last 90 days; gates the two metrics above (doc 04 §5). */
  conversation_count: number
}

export interface ListingPriceTier {
  days: number
  label: string
  amount_minor: number
  per_day_minor: number
  saving_percent: number | null
}

export interface ListingDetail {
  id: string
  slug: string
  title: string
  description: string
  status: ListingStatus
  category: {
    id: string
    name: string
    full_path: string
    breadcrumb: BreadcrumbItem[]
  } | null
  images: DetailImage[]
  price_1_day_minor: number
  price_3_days_minor: number | null
  price_7_days_minor: number | null
  item_value_minor: number | null
  cancellation_policy: CancellationPolicy
  guarantee_cap_minor: number | null
  rating_avg: number | null
  rating_count: number
  is_favorite: boolean
  is_own_listing: boolean
  /** True once the caller has a paid or running booking here (doc 04 §9). */
  can_see_exact_location: boolean
  distance_m: number | null
  pickup_locations: PickupLocation[]
  owner: OwnerSummary
  unavailable_dates: string[]
  published_at: string | null
  created_at: string
}

export interface ListingQuote {
  days_count: number
  rental_price_minor: number
  service_fee_minor: number
  total_minor: number
  price_breakdown: PriceBreakdownEntry[]
  is_available: boolean
  /** Nearest free window of the same length, when the pick collides (doc 04 §13.1). */
  suggested_start: string | null
  suggested_end: string | null
}

export interface ListingReview {
  id: string
  rating: number
  comment: string | null
  reply: string | null
  reply_at: string | null
  created_at: string
  author: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  listing: {
    id: string | null
    slug: string | null
    title: string | null
  }
}

export interface ReviewSummary {
  rating_avg: number | null
  rating_count: number
  /** Bar lengths on the histogram, keyed 1–5 (doc 04 §11.1). */
  histogram: Record<1 | 2 | 3 | 4 | 5, number>
}

export type ReviewScope = 'listing' | 'owner_other'

export const REVIEW_PAGE_SIZE = 6

export const REVIEW_REPORT_REASONS = [
  'offensive',
  'not_about_item',
  'spam',
  'personal_data',
  'other',
] as const

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number]

export const REVIEW_REPORT_REASON_LABELS: Record<ReviewReportReason, string> = {
  offensive: 'Uvredljiv sadržaj',
  not_about_item: 'Ne odnosi se na ovaj predmet',
  spam: 'Neželjena poruka ili reklama',
  personal_data: 'Sadrži lične podatke',
  other: 'Nešto drugo',
}
