import { formatDateRange } from '@/lib/search/search.helpers'
import type { Message, MessagePresentation, MessageType } from '@/types/message'

export function isBookingRequestType(type: MessageType | string): boolean {
  return type === 'system_booking_requested' || type === 'booking_request'
}

export function messagePresentation(
  message: Pick<Message, 'type' | 'sender_id'>
): MessagePresentation {
  if (isBookingRequestType(message.type)) return 'request_card'
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
