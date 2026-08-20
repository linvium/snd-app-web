export const MESSAGE_TYPES = [
  'text',
  'system',
  'system_booking_requested',
  'booking_request',
  'booking_accepted',
  'booking_declined',
  'booking_paid',
  'booking_cancelled',
  'review_request',
] as const

export type MessageType = (typeof MESSAGE_TYPES)[number]

export type MessagePresentation = 'request_card' | 'text_bubble' | 'system'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  type: MessageType
  body: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ConversationParty {
  id: string
  display_name: string
  avatar_url: string | null
  /** Trust signals from `public_owner_profiles`; null when the row is missing. */
  is_verified: boolean
  rating_avg: number | null
  rating_count: number
  avg_response_minutes: number | null
  response_rate: number | null
  /** Conversations in the last 90 days; gates the two metrics above (doc 04 §5). */
  conversation_count: number
}

export interface ConversationListing {
  id: string
  title: string
  slug: string | null
  thumbnail_url: string | null
  price_1_day_minor: number | null
  item_value_minor: number | null
}

export interface ConversationBookingSummary {
  id: string
  reference: string | null
  start_date: string | null
  end_date: string | null
  days_count: number | null
  status: string
  rental_price_minor: number | null
  total_minor: number | null
  requested_at: string | null
}

export type ConversationRole = 'owner' | 'renter'

export interface ConversationSummary {
  id: string
  listing: ConversationListing
  other_party: ConversationParty
  /** Which side of this conversation the signed-in user is on. */
  viewer_role: ConversationRole
  booking: ConversationBookingSummary | null
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
}

export interface ConversationThread {
  conversation: ConversationSummary
  messages: Message[]
}

export interface SendMessageInput {
  body: string
}
