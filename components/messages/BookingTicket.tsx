import { ArrowRightIcon } from 'lucide-react'

import { bookingStatusPill, type BookingPillTone } from '@/lib/messages'
import { formatTicketDate } from '@/lib/messages/booking-steps'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import { cn } from '@/lib/utils'
import type { ConversationBookingSummary, ConversationListing, ConversationRole } from '@/types'

const PILL_TONE: Record<BookingPillTone, string> = {
  wait: 'bg-warning-soft text-amber-700',
  ok: 'bg-brand-50 text-brand-600',
  done: 'bg-muted text-muted-foreground',
  late: 'bg-red-50 text-destructive',
}

const STRIP_TONE: Record<BookingPillTone, string> = {
  wait: 'bg-warning',
  ok: 'bg-brand-500',
  done: 'bg-border',
  late: 'bg-destructive',
}

function daysLabel(days: number | null): string | null {
  if (!days || days <= 0) return null
  const lastTwo = days % 100
  const last = days % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${days} dana`
  if (last === 1) return `${days} dan`
  if (last >= 2 && last <= 4) return `${days} dana`
  return `${days} dana`
}

/**
 * The rental request, rendered inside the conversation where it was made.
 *
 * It reports what the request actually says — dates, length, the listing's
 * daily rate — and stops there. The booking row carries a price snapshot taken
 * off the 1-day rate that ignores the 3- and 7-day packages, so it is not shown
 * as a total; the two sides settle the figure in the thread.
 */
export function BookingTicket({
  booking,
  listing,
  role,
  partyName,
  compact = false,
}: {
  booking: ConversationBookingSummary
  listing: ConversationListing
  role: ConversationRole
  partyName: string
  compact?: boolean
}) {
  const pill = bookingStatusPill(booking.status)
  const tone = pill?.tone ?? 'done'
  const from = formatTicketDate(booking.start_date)
  const to = formatTicketDate(booking.end_date)
  const days = daysLabel(booking.days_count)

  return (
    <article
      data-testid="request-card"
      className={cn(
        'flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
        compact ? 'my-0' : 'my-3'
      )}
    >
      <span aria-hidden className={cn('w-1.5 shrink-0', STRIP_TONE[tone])} />

      <div className="min-w-0 flex-1">
        <header className="flex items-start gap-3 px-4 pt-3.5 pb-2.5">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Zahtev za iznajmljivanje
            </p>
            <h3 className="mt-1 mb-0 text-[14.5px] leading-snug font-semibold tracking-[-0.01em] text-card-foreground">
              {role === 'owner'
                ? `${partyName} želi da pozajmi ${listing.title}`
                : `Poslao/la si zahtev za ${listing.title}`}
            </h3>
          </div>
          {pill ? (
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                PILL_TONE[pill.tone]
              )}
            >
              {pill.label}
            </span>
          ) : null}
        </header>

        {from && to ? (
          <div className="mx-4 flex items-center gap-3 border-y border-dashed border-border py-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                Preuzimanje
              </p>
              <p className="mt-0.5 mb-0 text-sm font-semibold text-card-foreground">{from}</p>
            </div>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                Vraćanje
              </p>
              <p className="mt-0.5 mb-0 text-sm font-semibold text-card-foreground">{to}</p>
            </div>
          </div>
        ) : (
          <p className="mx-4 border-y border-dashed border-border py-3 text-[13px] text-muted-foreground">
            Datumi nisu izabrani — dogovorite ih u razgovoru.
          </p>
        )}

        <dl className="m-0 grid gap-1 px-4 pt-3 pb-4 text-[13px]">
          {days ? (
            <div className="flex justify-between gap-3">
              <dt className="m-0 text-muted-foreground">Trajanje</dt>
              <dd className="m-0 font-medium text-card-foreground">{days}</dd>
            </div>
          ) : null}
          {listing.price_1_day_minor ? (
            <div className="flex justify-between gap-3">
              <dt className="m-0 text-muted-foreground">Cena po danu</dt>
              <dd className="m-0 font-medium text-card-foreground">
                {formatPriceMinor(listing.price_1_day_minor)}
              </dd>
            </div>
          ) : null}
          {booking.reference ? (
            <div className="flex justify-between gap-3">
              <dt className="m-0 text-muted-foreground">Broj zahteva</dt>
              <dd className="m-0 font-mono text-[12px] font-medium text-card-foreground">
                {booking.reference}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  )
}
