import type { ListingStatus } from './listing'
import type { KycDbStatus } from './kyc'
import type { ProfileCompleteness } from './user'

export type ActionTone = 'urgent' | 'attention' | 'calm'

export type ActionKind = 'request' | 'unread' | 'draft' | 'profile'

export interface DashboardAction {
  id: string
  kind: ActionKind
  tone: ActionTone
  title: string
  detail: string
  href: string
  cta: string
  /** Listing thumbnail when the action hangs off one. */
  thumbnail_url: string | null
}

export interface DashboardListingRow {
  id: string
  slug: string | null
  title: string
  thumbnail_url: string | null
  price_1_day_minor: number
  status: ListingStatus
  view_count: number
  favorite_count: number
  request_count: number
}

export interface DashboardTotals {
  listings_published: number
  listings_draft: number
  listings_paused: number
  views: number
  saves: number
  open_requests: number
  unread_messages: number
  rating_avg: number | null
  rating_count: number
  response_rate: number | null
  avg_response_minutes: number | null
}

export interface DashboardIdentity {
  display_name: string
  initials: string
  avatar_url: string | null
  user_id: string
  email: string
  member_since: string | null
  kyc_status: KycDbStatus | null
  is_verified: boolean
}

export interface DashboardSummary {
  identity: DashboardIdentity
  completeness: ProfileCompleteness
  actions: DashboardAction[]
  totals: DashboardTotals
  listings: DashboardListingRow[]
}
