import { formatDateRange } from '@/lib/search/search.helpers'
import type { ConversationRole, Message, MessagePresentation, MessageType } from '@/types/message'

export function isBookingRequestType(type: MessageType | string): boolean {
  return type === 'system_booking_requested' || type === 'booking_request'
}

export function messagePresentation(
  message: Pick<Message, 'type' | 'sender_id'>
): MessagePresentation {
  if (isBookingRequestType(message.type)) return 'request_card'
  // The payment link is the one system row with something to press, so it gets
  // a card of its own instead of the centred grey line.
  if (message.type === 'booking_payment_link') return 'payment_card'
  if (message.sender_id) return 'text_bubble'
  if (message.type === 'text') return 'text_bubble'
  return 'system'
}

export function requestCardDatesLabel(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return 'Datumi nisu izabrani.'
  return formatDateRange(startDate, endDate) ?? 'Datumi nisu izabrani.'
}

type PartyNameFields = {
  display_name: string | null
  first_name: string | null
  last_name: string | null
}

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function conversationPartyLabel(
  profile: PartyNameFields | null,
  email: string | null
): string {
  const displayName = nonempty(profile?.display_name)
  if (displayName) return displayName

  const firstName = nonempty(profile?.first_name)
  const lastName = nonempty(profile?.last_name)
  if (firstName && lastName) return `${firstName} ${lastName.charAt(0)}.`
  if (firstName) return firstName

  return nonempty(email) ?? 'Korisnik'
}

export function unreadMessageTotal(unreadCounts: number[]): number {
  return unreadCounts.reduce((sum, count) => sum + count, 0)
}

export function conversationsForListing<T extends { listing: { id: string } }>(
  conversations: T[],
  listingId: string
): T[] {
  return conversations.filter((conversation) => conversation.listing.id === listingId)
}

export function resolveListingConversationId(input: {
  fetchedId: string | undefined
  fetchSettled: boolean
  fetchFailed: boolean
  initialId: string | null
}): string | null {
  if (input.fetchFailed) return input.initialId
  if (input.fetchSettled) return input.fetchedId ?? null
  return input.initialId
}

export function listingContactActionsPending(input: {
  conversationId: string | null
  isSignedIn: boolean
  authLoading: boolean
  fetchSettled: boolean
}): boolean {
  if (input.conversationId) return false
  if (input.authLoading) return true
  return input.isSignedIn && !input.fetchSettled
}

function lastMessageTime(iso: string | null): number {
  if (!iso) return 0
  const value = Date.parse(iso)
  return Number.isNaN(value) ? 0 : value
}

export function sortConversationsForInbox<
  T extends { unread_count: number; last_message_at: string | null },
>(conversations: T[]): T[] {
  return [...conversations].sort((left, right) => {
    const unreadDelta = Number(right.unread_count > 0) - Number(left.unread_count > 0)
    if (unreadDelta !== 0) return unreadDelta
    return lastMessageTime(right.last_message_at) - lastMessageTime(left.last_message_at)
  })
}

export function formatConversationTime(iso: string | null, now = new Date()): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => String(value).padStart(2, '0')
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  if (date.getFullYear() === now.getFullYear()) {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`
  }

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}.`
}

export function formatMessageClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function messageDayKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatMessageDayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const diffDays = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / 86_400_000)
  if (diffDays === 0) return 'Danas'
  if (diffDays === 1) return 'Juče'

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}.`
}

export function shouldSubmitComposerOnEnter(event: {
  key: string
  shiftKey: boolean
  nativeEvent?: { isComposing?: boolean }
}): boolean {
  if (event.nativeEvent?.isComposing) return false
  return event.key === 'Enter' && !event.shiftKey
}

export type ConversationTab = 'all' | 'unread' | 'requests'

export const CONVERSATION_TABS: readonly { key: ConversationTab; label: string }[] = [
  { key: 'all', label: 'Sve' },
  { key: 'unread', label: 'Nepročitano' },
  { key: 'requests', label: 'Zahtevi' },
] as const

export type BookingPillTone = 'wait' | 'ok' | 'done' | 'late'

export interface BookingPill {
  label: string
  tone: BookingPillTone
}

/**
 * The reservation state, shown on the row itself so the inbox says what is
 * burning without opening every conversation.
 */
export function bookingStatusPill(status: string | null | undefined): BookingPill | null {
  switch (status) {
    case 'requested':
      return { label: 'Zahtev čeka odgovor', tone: 'wait' }
    case 'accepted':
      return { label: 'Čeka plaćanje', tone: 'wait' }
    case 'booked':
      return { label: 'Rezervisano', tone: 'ok' }
    case 'picked_up':
      return { label: 'Preuzeto', tone: 'ok' }
    case 'returned':
      return { label: 'Vraćeno', tone: 'done' }
    case 'rated':
      return { label: 'Ocenjeno', tone: 'done' }
    case 'declined':
      return { label: 'Odbijeno', tone: 'done' }
    case 'expired':
      return { label: 'Isteklo', tone: 'late' }
    case 'cancelled_by_renter':
    case 'cancelled_by_owner':
      return { label: 'Otkazano', tone: 'late' }
    case 'payment_failed':
      return { label: 'Plaćanje nije prošlo', tone: 'late' }
    default:
      return null
  }
}

/**
 * Status on the request card inside the thread. Inbox rows keep
 * bookingStatusPill.
 *
 * The two waiting states read differently depending on who is waiting: the
 * label should name the move the reader has to make, not the state in the
 * abstract.
 */
export function ticketStatusPill(
  status: string | null | undefined,
  role: ConversationRole
): BookingPill | null {
  if (status === 'requested' && role === 'owner') {
    return { label: 'Čeka potvrdu', tone: 'wait' }
  }
  if (status === 'accepted') {
    return role === 'owner'
      ? { label: 'Čeka uplatu', tone: 'wait' }
      : { label: 'Plati da rezervišeš', tone: 'wait' }
  }
  return bookingStatusPill(status)
}

/**
 * Bookings still waiting on somebody - used for the "Zahtevi" tab.
 *
 * `accepted` counts too: the owner has answered but the renter has not paid,
 * so the reservation is still somebody's move rather than settled.
 */
export function isOpenRequestStatus(status: string | null | undefined): boolean {
  return status === 'requested' || status === 'accepted'
}

type FilterableConversation = {
  unread_count: number
  booking: { status: string } | null
  listing: { title: string }
  other_party: { display_name: string }
  last_message_preview: string | null
}

export function conversationMatchesQuery<T extends FilterableConversation>(
  conversation: T,
  query: string
): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return [
    conversation.listing.title,
    conversation.other_party.display_name,
    conversation.last_message_preview ?? '',
  ].some((field) => field.toLowerCase().includes(term))
}

export function filterConversations<T extends FilterableConversation>(
  conversations: T[],
  tab: ConversationTab,
  query = ''
): T[] {
  return conversations.filter((conversation) => {
    if (!conversationMatchesQuery(conversation, query)) return false
    if (tab === 'unread') return conversation.unread_count > 0
    if (tab === 'requests') return isOpenRequestStatus(conversation.booking?.status)
    return true
  })
}

export function conversationTabCounts<T extends FilterableConversation>(
  conversations: T[]
): Record<ConversationTab, number> {
  return {
    all: conversations.length,
    unread: conversations.filter((conversation) => conversation.unread_count > 0).length,
    requests: conversations.filter((conversation) => isOpenRequestStatus(conversation.booking?.status))
      .length,
  }
}

/** Reply templates the composer can drop in — plain text, nothing pre-sent. */
export const QUICK_REPLIES: readonly string[] = [
  'Da, dostupno je.',
  'Kada ti odgovara preuzimanje?',
  'Nažalost, zauzeto je u tom terminu.',
  'Javi se kad krećeš, pa da se nađemo.',
] as const
