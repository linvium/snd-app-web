import { OWNER_COMMISSION_RATE } from '@/lib/pricing/pricing.config'
import { roundHalfUp } from '@/lib/pricing/pricing.helpers'
import { formatDate } from '@/lib/search/search.helpers'
import type { ConversationBookingSummary, ConversationListing } from '@/types/message'

const MONTHS_SHORT = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'avg',
  'sep',
  'okt',
  'nov',
  'dec',
] as const

/** How long the owner has to answer a request. Not yet enforced in the database. */
export const OWNER_RESPONSE_WINDOW_HOURS = 24

export function bookingDurationLabel(days: number | null | undefined): string | null {
  if (!days || days <= 0) return null
  const lastTwo = days % 100
  const last = days % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${days} dana`
  if (last === 1) return `${days} dan`
  return `${days} dana`
}

export function compactBookingRange(from: string | null, to: string | null): string | null {
  if (!from) return null
  const start = new Date(`${from}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return null

  const startDay = start.getUTCDate()
  const startMonth = MONTHS_SHORT[start.getUTCMonth()]
  if (!to || to === from) return `${startDay}. ${startMonth}`

  const end = new Date(`${to}T00:00:00Z`)
  if (Number.isNaN(end.getTime())) return `${startDay}. ${startMonth}`

  const endDay = end.getUTCDate()
  const endMonth = MONTHS_SHORT[end.getUTCMonth()]
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${startDay}-${endDay}. ${endMonth}`
  }
  return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`
}

export function requestExpiryLabel(requestedAt: string | null, now = new Date()): string | null {
  if (!requestedAt) return null
  const start = Date.parse(requestedAt)
  if (Number.isNaN(start)) return null

  const remainingMs = start + OWNER_RESPONSE_WINDOW_HOURS * 3_600_000 - now.getTime()
  if (remainingMs <= 0) return 'Istekao'

  const hours = Math.max(1, Math.ceil(remainingMs / 3_600_000))
  if (hours < 24) return `ističe za ${hours} h`
  const days = Math.ceil(hours / 24)
  return days === 1 ? 'ističe za 1 dan' : `ističe za ${days} dana`
}

/** Ticket footer / sidebar copy starts with a capital letter. */
export function requestExpiryCaption(requestedAt: string | null, now = new Date()): string | null {
  const label = requestExpiryLabel(requestedAt, now)
  if (!label) return null
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function pendingRequestBannerDetail(
  booking: Pick<ConversationBookingSummary, 'start_date' | 'end_date' | 'requested_at'>,
  now = new Date()
): string | null {
  const range = compactBookingRange(booking.start_date, booking.end_date)
  const expiry = requestExpiryLabel(booking.requested_at, now)
  const parts = [range, expiry].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(' · ') : null
}

export interface OwnerReviewMoney {
  dailyMinor: number | null
  days: number | null
  rentalMinor: number
  depositMinor: number | null
  feeMinor: number
  feePercent: number
  payoutMinor: number
}

export function ownerReviewMoney(
  booking: Pick<ConversationBookingSummary, 'days_count' | 'rental_price_minor'>,
  listing: Pick<ConversationListing, 'price_1_day_minor' | 'item_value_minor'>
): OwnerReviewMoney | null {
  const rentalMinor = booking.rental_price_minor ?? 0
  if (rentalMinor <= 0) return null

  const feeMinor = roundHalfUp(rentalMinor * OWNER_COMMISSION_RATE)
  const depositMinor = listing.item_value_minor && listing.item_value_minor > 0 ? listing.item_value_minor : null
  return {
    dailyMinor: listing.price_1_day_minor,
    days: booking.days_count,
    rentalMinor,
    depositMinor,
    feeMinor,
    feePercent: Math.round(OWNER_COMMISSION_RATE * 100),
    payoutMinor: Math.max(0, rentalMinor - feeMinor),
  }
}

export function proposedDatesMessage(from: string, to: string): string {
  return `Predlažem druge datume: ${formatDate(from)} - ${formatDate(to)}`
}
