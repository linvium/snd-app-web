/**
 * The reservation lifecycle, mirroring the `booking_status` enum.
 *
 * The first six are the steps the interface draws, in order; the rest are the
 * ways a reservation ends before it gets there.
 */
export const BOOKING_STATUSES = [
  'requested',
  'accepted',
  'booked',
  'picked_up',
  'returned',
  'rated',
  'declined',
  'expired',
  'cancelled_by_renter',
  'cancelled_by_owner',
  'payment_failed',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** The happy path, in the order the stepper shows it. */
export const BOOKING_LIFECYCLE: readonly BookingStatus[] = [
  'requested',
  'accepted',
  'booked',
  'picked_up',
  'returned',
  'rated',
] as const

export const MESSAGE_MIN = 1
export const MESSAGE_MAX = 2000

export const REVIEW_COMMENT_MAX = 1000

export type PaymentLinkStatus = 'pending' | 'paid' | 'expired' | 'cancelled'

export interface BookingPaymentLink {
  token: string
  status: PaymentLinkStatus
  amount_minor: number
  expires_at: string
  paid_at: string | null
}

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

/**
 * Everything the owner can do to a booking from the thread. The first three
 * answer a request; the last two move a paid reservation along.
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
  /** Present only when accepting: the link the renter has to pay. */
  paymentToken?: string | null
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

export interface PaymentLinkSummary {
  token: string
  status: PaymentLinkStatus
  /** Which adapter settles this link: 'stripe' today, 'manual' in sandbox. */
  provider: string
  /** Why the last attempt failed, if one did. Shown so a refused card says so. */
  last_error: string | null
  amount_minor: number
  currency: string
  expires_at: string
  paid_at: string | null
  booking: {
    id: string
    reference: string | null
    status: BookingStatus
    start_date: string | null
    end_date: string | null
    days_count: number | null
    rental_price_minor: number | null
    service_fee_minor: number | null
    total_minor: number | null
  }
  listing: {
    title: string
    slug: string | null
  }
  owner_name: string
}

export interface StartCheckoutResponse {
  /** Where to send the renter to pay. Provider-hosted, so a full URL. */
  url: string
  provider: string
}

export interface ConfirmPaymentResponse {
  bookingId: string
  status: BookingStatus
  alreadyPaid: boolean
}
