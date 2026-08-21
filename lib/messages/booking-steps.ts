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

const CLOSED_STATUSES = new Set([
  'declined',
  'expired',
  'cancelled_by_renter',
  'cancelled_by_owner',
  'payment_failed',
])

/**
 * The lifecycle in order. A booking's position in this list decides which steps
 * are behind it, which one it is on, and which are still ahead.
 */
const LIFECYCLE = ['requested', 'accepted', 'booked', 'picked_up', 'returned', 'rated'] as const

export function bookingStageIndex(status: string | null | undefined): number {
  return LIFECYCLE.indexOf(status as (typeof LIFECYCLE)[number])
}

/**
 * Where the reservation stands, derived from the booking row alone.
 *
 * Six steps - request, accepted, booked, picked up, returned, rated - so the
 * panel says what has happened and what is next rather than stopping at the
 * owner's answer. A reservation that ended early shows only how far it got and
 * then why it stopped; drawing four pending steps under a declined request
 * would promise a rental that is not coming.
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
      detail:
        status === 'declined'
          ? 'Odbijen'
          : status === 'expired'
            ? 'Istekao'
            : status === 'payment_failed'
              ? 'Plaćanje nije prošlo'
              : 'Otkazan',
      state: 'done',
    })
    return steps
  }

  const link = booking.payment_link
  // "Expired" is only true of a link that existed. With none on the booking the
  // reservation is simply waiting to be paid.
  const paymentLapsed = Boolean(link) && link!.status !== 'pending'

  steps.push(
    {
      key: 'accepted',
      // Before the answer the step is the answer being waited on; after it, it
      // is the fact that the request was accepted.
      title: ownerPending ? 'Tvoja potvrda' : stage >= 1 ? 'Prihvaćeno' : 'Potvrda vlasnika',
      detail:
        stage >= 1
          ? (formatStamp(booking.accepted_at) ?? 'Potvrđeno')
          : ownerPending
            ? requestExpiryCaption(booking.requested_at)
            : 'Čeka odgovor',
      state: stateAt(1),
    },
    {
      key: 'booked',
      title: 'Rezervisano',
      detail:
        stage >= 2
          ? (formatStamp(booking.booked_at) ?? 'Plaćeno')
          : stage === 1
            ? paymentLapsed
              ? 'Link za plaćanje više ne važi'
              : 'Čeka plaćanje'
            : null,
      state: stateAt(2),
    },
    {
      key: 'picked_up',
      title: 'Preuzeto',
      detail:
        stage >= 3
          ? (formatStamp(booking.picked_up_at) ?? formatTicketDate(booking.start_date))
          : formatTicketDate(booking.start_date),
      state: stateAt(3),
    },
    {
      key: 'returned',
      title: 'Vraćeno',
      detail:
        stage >= 4
          ? (formatStamp(booking.returned_at) ?? formatTicketDate(booking.end_date))
          : formatTicketDate(booking.end_date),
      state: stateAt(4),
    },
    {
      key: 'rated',
      title: 'Ocenjeno',
      detail:
        stage >= 5
          ? formatStamp(booking.rated_at)
          : stage === 4
            ? 'Ostavite ocene'
            : null,
      state: stateAt(5),
    }
  )

  return steps
}
