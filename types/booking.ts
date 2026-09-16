/**
 * The reservation lifecycle, mirroring the `booking_status` enum.
 *
 * The first five are the steps the interface draws, in order; the rest are the
 * ways a reservation ends before it gets there. There is no payment step in
 * between: renting is not charged through the platform, so the owner accepting
 * a request is what books it.
 */
export const BOOKING_STATUSES = [
  'requested',
  'booked',
  'picked_up',
  'returned',
  'rated',
  'declined',
  'expired',
  'cancelled_by_renter',
  'cancelled_by_owner',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** The happy path, in the order the stepper shows it. */
export const BOOKING_LIFECYCLE: readonly BookingStatus[] = [
  'requested',
  'booked',
  'picked_up',
  'returned',
  'rated',
] as const

export const MESSAGE_MIN = 1
export const MESSAGE_MAX = 2000

export const REVIEW_COMMENT_MAX = 1000

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
  /** What the renter pays the owner directly. Nothing is added on top of it. */
  rental_price_minor: number
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

/**
 * Everything the owner can do to a booking from the thread. The first three
 * answer a request; the last two move a booked reservation along.
 */
export type BookingResponseAction =
  | 'accept'
  | 'decline'
  | 'propose'
  | 'mark_picked_up'
  | 'mark_returned'

export const REQUEST_RESPONSE_ACTIONS = ['accept', 'decline', 'propose'] as const
export const STAGE_ACTIONS = ['mark_picked_up', 'mark_returned'] as const

export interface RespondToBookingInput {
  bookingId: string
  action: BookingResponseAction
  startDate?: string | null
  endDate?: string | null
}

export interface RespondToBookingResponse {
  bookingId: string
  status: BookingStatus
  conversationId: string
}

export interface SubmitBookingReviewInput {
  bookingId: string
  rating: number
  comment?: string | null
}

export interface SubmitBookingReviewResponse {
  bookingId: string
  reviewId: string
  status: BookingStatus
  /** True once both sides have written - that is when the texts appear. */
  published: boolean
  conversationId: string | null
}
