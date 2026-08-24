import { describe, expect, it } from 'vitest'

import {
  bookingStatusPill,
  ticketStatusPill,
  conversationMatchesQuery,
  conversationTabCounts,
  filterConversations,
  isOpenRequestStatus,
} from '@/lib/messages'
import { bookingSteps, formatTicketDate } from '@/lib/messages/booking-steps'
import type { ConversationBookingSummary } from '@/types/message'

type Row = {
  id: string
  unread_count: number
  booking: { status: string } | null
  listing: { title: string }
  other_party: { display_name: string }
  last_message_preview: string | null
}

const rows: Row[] = [
  {
    id: 'a',
    unread_count: 2,
    booking: { status: 'requested' },
    listing: { title: 'Brener XH345' },
    other_party: { display_name: 'Andrej M.' },
    last_message_preview: 'Javi se na telefon',
  },
  {
    id: 'b',
    unread_count: 0,
    booking: { status: 'rated' },
    listing: { title: 'Merdevine 3m' },
    other_party: { display_name: 'Sanja K.' },
    last_message_preview: 'Hvala!',
  },
  {
    id: 'c',
    unread_count: 1,
    booking: null,
    listing: { title: 'Šator za 4' },
    other_party: { display_name: 'Dejan J.' },
    last_message_preview: null,
  },
]

describe('bookingStatusPill', () => {
  it('maps every booking status the schema allows', () => {
    expect(bookingStatusPill('requested')).toEqual({ label: 'Zahtev čeka odgovor', tone: 'wait' })
    expect(bookingStatusPill('accepted')?.tone).toBe('wait')
    expect(bookingStatusPill('booked')?.tone).toBe('ok')
    expect(bookingStatusPill('picked_up')?.tone).toBe('ok')
    expect(bookingStatusPill('returned')?.tone).toBe('done')
    expect(bookingStatusPill('rated')?.tone).toBe('done')
    expect(bookingStatusPill('cancelled_by_owner')?.tone).toBe('late')
    expect(bookingStatusPill(null)).toBeNull()
    expect(bookingStatusPill('nešto_novo')).toBeNull()
  })
})

describe('ticketStatusPill', () => {
  it('tells the owner the request is waiting on them', () => {
    expect(ticketStatusPill('requested', 'owner')).toEqual({ label: 'Čeka potvrdu', tone: 'wait' })
  })

  it('keeps the inbox wording for the renter', () => {
    expect(ticketStatusPill('requested', 'renter')).toEqual({
      label: 'Zahtev čeka odgovor',
      tone: 'wait',
    })
  })

  it('names the move each side owes once the request is accepted', () => {
    expect(ticketStatusPill('accepted', 'renter')?.label).toBe('Plati da rezervišeš')
    expect(ticketStatusPill('accepted', 'owner')?.label).toBe('Čeka uplatu')
  })
})

describe('isOpenRequestStatus', () => {
  it('is true while the reservation still needs somebody to move', () => {
    expect(isOpenRequestStatus('requested')).toBe(true)
    // Accepted but unpaid is still an open request: the renter owes the money.
    expect(isOpenRequestStatus('accepted')).toBe(true)
    expect(isOpenRequestStatus('booked')).toBe(false)
    expect(isOpenRequestStatus(undefined)).toBe(false)
  })
})

describe('conversationMatchesQuery', () => {
  it('searches the party, the listing and the preview', () => {
    expect(conversationMatchesQuery(rows[0], '')).toBe(true)
    expect(conversationMatchesQuery(rows[0], 'brener')).toBe(true)
    expect(conversationMatchesQuery(rows[0], 'andrej')).toBe(true)
    expect(conversationMatchesQuery(rows[0], 'telefon')).toBe(true)
    expect(conversationMatchesQuery(rows[0], 'kamera')).toBe(false)
  })

  it('survives a null preview', () => {
    expect(conversationMatchesQuery(rows[2], 'šator')).toBe(true)
  })
})

describe('filterConversations', () => {
  it('filters by tab', () => {
    expect(filterConversations(rows, 'all').map((row) => row.id)).toEqual(['a', 'b', 'c'])
    expect(filterConversations(rows, 'unread').map((row) => row.id)).toEqual(['a', 'c'])
    expect(filterConversations(rows, 'requests').map((row) => row.id)).toEqual(['a'])
  })

  it('combines tab and query', () => {
    expect(filterConversations(rows, 'unread', 'šator').map((row) => row.id)).toEqual(['c'])
    expect(filterConversations(rows, 'requests', 'sanja')).toEqual([])
  })
})

describe('conversationTabCounts', () => {
  it('counts each tab', () => {
    expect(conversationTabCounts(rows)).toEqual({ all: 3, unread: 2, requests: 1 })
  })
})

describe('formatTicketDate', () => {
  it('returns null for missing or broken dates', () => {
    expect(formatTicketDate(null)).toBeNull()
    expect(formatTicketDate('nije-datum')).toBeNull()
  })

  it('formats an ISO date', () => {
    expect(formatTicketDate('2026-08-22')).toContain('22')
  })
})

describe('bookingSteps', () => {
  const booking = (overrides: Partial<ConversationBookingSummary>): ConversationBookingSummary => ({
    id: 'b1',
    reference: 'SND123',
    start_date: '2026-08-22',
    end_date: '2026-08-23',
    days_count: 2,
    status: 'requested',
    rental_price_minor: 2400,
    total_minor: 2400,
    requested_at: '2026-08-19T17:10:00.000Z',
    accepted_at: null,
    booked_at: null,
    picked_up_at: null,
    returned_at: null,
    rated_at: null,
    payment_link: null,
    viewer_has_reviewed: false,
    ...overrides,
  })

  it('has no steps without a booking', () => {
    expect(bookingSteps(null)).toEqual([])
  })

  it('marks the owner confirmation as the live step while requested', () => {
    const steps = bookingSteps(booking({ status: 'requested' }))
    expect(steps.map((step) => step.state)).toEqual([
      'done',
      'current',
      'todo',
      'todo',
      'todo',
      'todo',
    ])
    expect(steps.map((step) => step.title)).toEqual([
      'Zahtev poslat',
      'Potvrda vlasnika',
      'Rezervisano',
      'Preuzeto',
      'Vraćeno',
      'Ocenjeno',
    ])
    expect(steps[1].detail).toBe('Čeka odgovor')
  })

  it('addresses the owner on their own pending confirmation', () => {
    const steps = bookingSteps(booking({ status: 'requested' }), { viewerRole: 'owner' })
    expect(steps[1].title).toBe('Tvoja potvrda')
    expect(steps[1].detail).toMatch(/^Ističe za |^Istekao$/)
  })

  it('waits on payment once the booking is accepted', () => {
    const steps = bookingSteps(
      booking({
        status: 'accepted',
        accepted_at: '2026-08-19T18:00:00.000Z',
        payment_link: {
          token: 'a'.repeat(32),
          status: 'pending',
          amount_minor: 2400,
          expires_at: '2026-08-22T18:00:00.000Z',
          paid_at: null,
        },
      })
    )
    expect(steps.map((step) => step.state)).toEqual([
      'done',
      'done',
      'current',
      'todo',
      'todo',
      'todo',
    ])
    expect(steps[2].detail).toBe('Čeka plaćanje')
  })

  it('only calls the link lapsed when there was one', () => {
    expect(bookingSteps(booking({ status: 'accepted' }))[2].detail).toBe('Čeka plaćanje')
    expect(
      bookingSteps(
        booking({
          status: 'accepted',
          payment_link: {
            token: 'b'.repeat(32),
            status: 'expired',
            amount_minor: 2400,
            expires_at: '2026-08-20T18:00:00.000Z',
            paid_at: null,
          },
        })
      )[2].detail
    ).toBe('Link za plaćanje više ne važi')
  })

  it('advances through the paid reservation', () => {
    expect(bookingSteps(booking({ status: 'booked' })).map((step) => step.state)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'todo',
      'todo',
    ])
    expect(bookingSteps(booking({ status: 'picked_up' })).map((step) => step.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'current',
      'todo',
    ])
    expect(bookingSteps(booking({ status: 'returned' })).map((step) => step.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
      'current',
    ])
  })

  it('stops at two steps when the request is closed', () => {
    const steps = bookingSteps(booking({ status: 'declined' }))
    expect(steps).toHaveLength(2)
    expect(steps[1].title).toBe('Zahtev je zatvoren')
  })

  it('completes every step on a rated rental', () => {
    const steps = bookingSteps(booking({ status: 'rated' }))
    expect(steps.map((step) => step.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
    ])
  })
})
