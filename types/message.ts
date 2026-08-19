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
}

export interface ConversationListing {
  id: string
  title: string
  slug: string | null
  thumbnail_url: string | null
}

export interface ConversationBookingSummary {
  id: string
  start_date: string | null
  end_date: string | null
  status: string
}

export interface ConversationSummary {
  id: string
  listing: ConversationListing
  other_party: ConversationParty
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
