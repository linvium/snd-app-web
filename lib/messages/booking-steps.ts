import { requestExpiryCaption } from '@/lib/messages/request-review.helpers'
import type { ConversationBookingSummary, ConversationRole } from '@/types/message'

export type BookingStepState = 'done' | 'current' | 'todo'

export interface BookingStep {
  key: string
  title: string
  detail: string | null
  state: BookingStepState
}

/** "pet, 22. avg" - shared by the ticket and the detail panel. */
export function formatTicketDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat('sr-Latn-RS', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date)
  } catch {
    return iso
  }
}

function formatStamp(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}. u ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const CLOSED_STATUSES = new Set([
  'declined',
  'expired',
  'cancelled_by_renter',
  'cancelled_by_owner',
  'payment_failed',
])

/**
 * Where the reservation stands, derived from the booking row alone.
 *
 * The product can currently only reach `requested`, so the later steps render
 * as pending rather than as something the interface pretends already happened.
 */
export function bookingSteps(
  booking: ConversationBookingSummary | null,
  options?: { viewerRole?: ConversationRole }
): BookingStep[] {
  if (!booking) return []

  const status = booking.status
  const closed = CLOSED_STATUSES.has(status)
  const accepted = ['accepted', 'paid', 'in_progress', 'completed'].includes(status)
  const running = ['in_progress', 'completed'].includes(status)
  const done = status === 'completed'
  const ownerPending = options?.viewerRole === 'owner' && status === 'requested' && !closed

  const steps: BookingStep[] = [
    {
      key: 'requested',
      title: 'Zahtev poslat',
      detail: formatStamp(booking.requested_at),
      state: 'done',
    },
    {
      key: 'confirm',
      title: closed ? 'Zahtev je zatvoren' : ownerPending ? 'Tvoja potvrda' : 'Potvrda vlasnika',
      detail: closed
        ? null
        : accepted
          ? 'Potvrđeno'
          : ownerPending
            ? requestExpiryCaption(booking.requested_at)
            : 'Čeka odgovor',
      state: closed ? 'done' : accepted ? 'done' : 'current',
    },
  ]

  if (closed) return steps

  steps.push(
    {
      key: 'pickup',
      title: 'Preuzimanje',
      detail: formatTicketDate(booking.start_date),
      state: running ? 'done' : accepted ? 'current' : 'todo',
    },
    {
      key: 'return',
      title: 'Vraćanje',
      detail: formatTicketDate(booking.end_date),
      state: done ? 'done' : running ? 'current' : 'todo',
    }
  )

  return steps
}
