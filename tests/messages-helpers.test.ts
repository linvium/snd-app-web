import { describe, expect, it } from 'vitest'

import {
  conversationPartyLabel,
  conversationsForListing,
  listingContactActionsPending,
  resolveListingConversationId,
  formatConversationTime,
  formatMessageClock,
  formatMessageDayLabel,
  isBookingRequestType,
  messageDayKey,
  messagePresentation,
  requestCardDatesLabel,
  shouldSubmitComposerOnEnter,
  sortConversationsForInbox,
  unreadMessageTotal,
} from '@/lib/messages/messages.helpers'
import { MESSAGE_TYPES } from '@/types/message'

describe('messagePresentation', () => {
  it('renders a request card for the spec system type with a null sender', () => {
    expect(
      messagePresentation({ type: 'system_booking_requested', sender_id: null })
    ).toBe('request_card')
  })

  it('still treats the legacy booking_request alias as a card', () => {
    expect(messagePresentation({ type: 'booking_request', sender_id: null })).toBe('request_card')
  })

  it('renders a bubble for a text message', () => {
    expect(
      messagePresentation({ type: 'text', sender_id: '11111111-1111-4111-8111-111111111111' })
    ).toBe('text_bubble')
  })

  it('renders an owner response as a bubble when it has a sender', () => {
    expect(
      messagePresentation({
        type: 'booking_accepted',
        sender_id: '11111111-1111-4111-8111-111111111111',
      })
    ).toBe('text_bubble')
    expect(
      messagePresentation({
        type: 'booking_declined',
        sender_id: '11111111-1111-4111-8111-111111111111',
      })
    ).toBe('text_bubble')
  })

  it('keeps a booking status without a sender as a system notice', () => {
    expect(messagePresentation({ type: 'booking_accepted', sender_id: null })).toBe('system')
  })

  it('knows the spec type is a booking request', () => {
    expect(isBookingRequestType('system_booking_requested')).toBe(true)
    expect(isBookingRequestType('text')).toBe(false)
  })
})

describe('conversationPartyLabel', () => {
  it('prefers a display name', () => {
    expect(
      conversationPartyLabel(
        { display_name: 'Ana P.', first_name: 'Ana', last_name: 'Petrović' },
        'ana@snd.rs'
      )
    ).toBe('Ana P.')
  })

  it('builds first name plus last initial when display name is missing', () => {
    expect(
      conversationPartyLabel(
        { display_name: null, first_name: 'Ana', last_name: 'Petrović' },
        'ana@snd.rs'
      )
    ).toBe('Ana P.')
  })

  it('falls back to email when the profile has no name', () => {
    expect(
      conversationPartyLabel({ display_name: null, first_name: null, last_name: null }, 'ana@snd.rs')
    ).toBe('ana@snd.rs')
    expect(conversationPartyLabel(null, 'ana@snd.rs')).toBe('ana@snd.rs')
    expect(
      conversationPartyLabel({ display_name: '  ', first_name: null, last_name: null }, 'ana@snd.rs')
    ).toBe('ana@snd.rs')
  })

  it('uses Korisnik only when name and email are both missing', () => {
    expect(conversationPartyLabel(null, null)).toBe('Korisnik')
  })
})

describe('requestCardDatesLabel', () => {
  it('says dates were not chosen when they are missing', () => {
    expect(requestCardDatesLabel(null, null)).toBe('Datumi nisu izabrani.')
  })

  it('formats a range without a price', () => {
    const label = requestCardDatesLabel('2026-08-20', '2026-08-22')
    expect(label).toContain('20')
    expect(label).toContain('22')
    expect(label).not.toMatch(/ukupno|RSD|od /i)
  })
})

describe('unreadMessageTotal', () => {
  it('sums unread counts', () => {
    expect(unreadMessageTotal([])).toBe(0)
    expect(unreadMessageTotal([0, 2, 1])).toBe(3)
  })
})

describe('conversationsForListing', () => {
  it('keeps only rows for that listing', () => {
    const rows = [
      { id: 'a', listing: { id: '11111111-1111-4111-8111-111111111111' } },
      { id: 'b', listing: { id: '22222222-2222-4222-8222-222222222222' } },
    ]
    expect(conversationsForListing(rows, '11111111-1111-4111-8111-111111111111').map((row) => row.id)).toEqual([
      'a',
    ])
  })
})

describe('resolveListingConversationId', () => {
  it('keeps the server id until the client fetch settles', () => {
    expect(
      resolveListingConversationId({
        fetchedId: undefined,
        fetchSettled: false,
        fetchFailed: false,
        initialId: 'conv-1',
      })
    ).toBe('conv-1')
  })

  it('uses the fetched id once the list has loaded', () => {
    expect(
      resolveListingConversationId({
        fetchedId: 'conv-2',
        fetchSettled: true,
        fetchFailed: false,
        initialId: 'conv-1',
      })
    ).toBe('conv-2')
  })

  it('clears the id when the list loaded and there is no conversation', () => {
    expect(
      resolveListingConversationId({
        fetchedId: undefined,
        fetchSettled: true,
        fetchFailed: false,
        initialId: 'conv-1',
      })
    ).toBeNull()
  })

  it('falls back to the server id when the client fetch fails', () => {
    expect(
      resolveListingConversationId({
        fetchedId: undefined,
        fetchSettled: true,
        fetchFailed: true,
        initialId: 'conv-1',
      })
    ).toBe('conv-1')
  })
})

describe('listingContactActionsPending', () => {
  it('shows a skeleton while auth or the conversation list is still unknown', () => {
    expect(
      listingContactActionsPending({
        conversationId: null,
        isSignedIn: false,
        authLoading: true,
        fetchSettled: false,
      })
    ).toBe(true)
    expect(
      listingContactActionsPending({
        conversationId: null,
        isSignedIn: true,
        authLoading: false,
        fetchSettled: false,
      })
    ).toBe(true)
  })

  it('does not flash send CTAs when a conversation id is already known', () => {
    expect(
      listingContactActionsPending({
        conversationId: 'conv-1',
        isSignedIn: false,
        authLoading: true,
        fetchSettled: false,
      })
    ).toBe(false)
  })

  it('shows send CTAs for a guest after auth has settled', () => {
    expect(
      listingContactActionsPending({
        conversationId: null,
        isSignedIn: false,
        authLoading: false,
        fetchSettled: false,
      })
    ).toBe(false)
  })

  it('does not skeleton again on a background refetch after an empty list', () => {
    expect(
      listingContactActionsPending({
        conversationId: null,
        isSignedIn: true,
        authLoading: false,
        fetchSettled: true,
      })
    ).toBe(false)
  })
})

describe('sortConversationsForInbox', () => {
  it('puts unread threads first, then newest activity', () => {
    const sorted = sortConversationsForInbox([
      { id: 'old-read', unread_count: 0, last_message_at: '2026-08-10T09:00:00.000Z' },
      { id: 'old-unread', unread_count: 1, last_message_at: '2026-08-01T09:00:00.000Z' },
      { id: 'new-read', unread_count: 0, last_message_at: '2026-08-19T09:00:00.000Z' },
      { id: 'new-unread', unread_count: 3, last_message_at: '2026-08-18T09:00:00.000Z' },
    ])

    expect(sorted.map((row) => row.id)).toEqual(['new-unread', 'old-unread', 'new-read', 'old-read'])
  })

  it('keeps conversations without a timestamp after dated ones in the same unread group', () => {
    const sorted = sortConversationsForInbox([
      { id: 'no-time', unread_count: 0, last_message_at: null },
      { id: 'dated', unread_count: 0, last_message_at: '2026-08-19T09:00:00.000Z' },
    ])

    expect(sorted.map((row) => row.id)).toEqual(['dated', 'no-time'])
  })
})

describe('formatConversationTime', () => {
  const now = new Date('2026-08-19T15:30:00')

  it('shows the clock time for messages from today', () => {
    expect(formatConversationTime('2026-08-19T08:05:00', now)).toBe('08:05')
  })

  it('shows day and month for earlier dates in the same year', () => {
    expect(formatConversationTime('2026-03-04T12:00:00', now)).toBe('04.03.')
  })

  it('includes the year for older messages', () => {
    expect(formatConversationTime('2025-12-31T12:00:00', now)).toBe('31.12.2025.')
  })
})

describe('formatMessageClock', () => {
  it('always shows hours and minutes', () => {
    expect(formatMessageClock('2026-08-19T08:05:00')).toBe('08:05')
  })
})

describe('formatMessageDayLabel', () => {
  const now = new Date('2026-08-19T15:30:00')

  it('labels today and yesterday', () => {
    expect(formatMessageDayLabel('2026-08-19T08:05:00', now)).toBe('Danas')
    expect(formatMessageDayLabel('2026-08-18T22:00:00', now)).toBe('Juče')
    expect(formatMessageDayLabel('2026-08-01T12:00:00', now)).toBe('01.08.2026.')
  })

  it('groups messages from the same local day', () => {
    expect(messageDayKey('2026-08-19T08:05:00')).toBe(messageDayKey('2026-08-19T23:50:00'))
    expect(messageDayKey('2026-08-19T08:05:00')).not.toBe(messageDayKey('2026-08-18T23:50:00'))
  })
})

describe('shouldSubmitComposerOnEnter', () => {
  it('sends on Enter and keeps a new line on Shift + Enter', () => {
    expect(shouldSubmitComposerOnEnter({ key: 'Enter', shiftKey: false })).toBe(true)
    expect(shouldSubmitComposerOnEnter({ key: 'Enter', shiftKey: true })).toBe(false)
    expect(shouldSubmitComposerOnEnter({ key: 'a', shiftKey: false })).toBe(false)
  })

  it('does not send while an IME composition is in progress', () => {
    expect(
      shouldSubmitComposerOnEnter({
        key: 'Enter',
        shiftKey: false,
        nativeEvent: { isComposing: true },
      })
    ).toBe(false)
  })
})
