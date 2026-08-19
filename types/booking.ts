export const BOOKING_STATUSES = [
  'requested',
  'accepted',
  'declined',
  'expired',
  'paid',
  'in_progress',
  'completed',
  'cancelled_by_renter',
  'cancelled_by_owner',
  'payment_failed',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const MESSAGE_MIN = 1
export const MESSAGE_MAX = 2000

export interface Booking {
  id: string
  reference: string
  listing_id: string
  renter_id: string
  owner_id: string
  pickup_location_id: string
  start_date: string | null
  end_date: string | null
  days_count: number | null
  status: BookingStatus
  rental_price_minor: number
  service_fee_minor: number
  total_minor: number
  owner_payout_minor: number
  cancellation_policy: string
  item_value_minor: number
  requested_at: string
  created_at: string
}

export interface CreateBookingRequestInput {
  listingId: string
  body: string
  startDate?: string | null
  endDate?: string | null
}

export interface CreateBookingRequestResponse {
  booking: Booking
  conversationId: string
}
