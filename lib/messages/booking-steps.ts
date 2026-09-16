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

function formatStamp(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}. u ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const CLOSED_STATUSES = new Set(['declined', 'expired', 'cancelled_by_renter', 'cancelled_by_owner'])

/**
 * The lifecycle in order. A booking's position in this list decides which steps
 * are behind it, which one it is on, and which are still ahead.
 */
const LIFECYCLE = ['requested', 'booked', 'picked_up', 'returned', 'rated'] as const

export function bookingStageIndex(status: string | null | undefined): number {
  return LIFECYCLE.indexOf(status as (typeof LIFECYCLE)[number])
}

/**
 * Where the reservation stands, derived from the booking row alone.
 *
 * Five steps - request, booked, picked up, returned, rated. There is no payment
 * step between the owner's answer and the reservation: accepting is booking.
 * A reservation that ended early shows only how far it got and then why it
 * stopped; drawing pending steps under a declined request would promise a
 * rental that is not coming.
 */
export function bookingSteps(
  booking: ConversationBookingSummary | null,
  options?: { viewerRole?: ConversationRole }
): BookingStep[] {
  if (!booking) return []

  const status = booking.status
  const closed = CLOSED_STATUSES.has(status)
  const stage = bookingStageIndex(status)
  const ownerPending = options?.viewerRole === 'owner' && status === 'requested' && !closed

  // The highlighted step is the one being waited on, not the one just reached:
  // a reservation that is `booked` has its booking behind it and is waiting to
  // be picked up. Everything up to and including the current status is done.
  const stateAt = (index: number): BookingStepState => {
    if (stage < 0) return index === 0 ? 'done' : 'todo'
    if (index <= stage) return 'done'
    if (index === stage + 1) return 'current'
    return 'todo'
  }

  const steps: BookingStep[] = [
    {
      key: 'requested',
      title: 'Zahtev poslat',
      detail: formatStamp(booking.requested_at),
      state: 'done',
    },
  ]

  if (closed) {
    steps.push({
      key: 'closed',
      title: 'Zahtev je zatvoren',
      detail: status === 'declined' ? 'Odbijen' : status === 'expired' ? 'Istekao' : 'Otkazan',
      state: 'done',
    })
    return steps
  }

  steps.push(
    {
      key: 'booked',
      // Before the answer the step is the answer being waited on; after it, it
      // is the reservation the answer made.
      title: ownerPending ? 'Tvoja potvrda' : stage >= 1 ? 'Rezervisano' : 'Potvrda vlasnika',
      detail:
        stage >= 1
          ? (formatStamp(booking.booked_at ?? booking.accepted_at) ?? 'Potvrđeno')
          : ownerPending
            ? requestExpiryCaption(booking.requested_at)
            : 'Čeka odgovor',
      state: stateAt(1),
    },
    {
      key: 'picked_up',
      title: 'Preuzeto',
      detail:
        stage >= 2
          ? (formatStamp(booking.picked_up_at) ?? formatTicketDate(booking.start_date))
          : formatTicketDate(booking.start_date),
      state: stateAt(2),
    },
    {
      key: 'returned',
      title: 'Vraćeno',
      detail:
        stage >= 3
          ? (formatStamp(booking.returned_at) ?? formatTicketDate(booking.end_date))
          : formatTicketDate(booking.end_date),
      state: stateAt(3),
    },
    {
      key: 'rated',
      title: 'Ocenjeno',
      detail:
        stage >= 4
          ? formatStamp(booking.rated_at)
          : stage === 3
            ? 'Ostavite ocene'
            : null,
      state: stateAt(4),
    }
  )

  return steps
}
