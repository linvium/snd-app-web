'use client'

import { ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ticketStatusPill, type BookingPillTone } from '@/lib/messages'
import { formatTicketDate } from '@/lib/messages/booking-steps'
import { bookingDurationLabel, ownerReviewMoney } from '@/lib/messages/request-review.helpers'
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

const DATE_LABEL = 'm-0 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase'
const DATE_VALUE = 'mt-0.5 mb-0 text-sm font-semibold text-card-foreground'

function DateCell({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string | null
}) {
  return (
    <div className="min-w-0">
      <p className={DATE_LABEL}>{label}</p>
      <p className={DATE_VALUE}>{value}</p>
      {hint ? <p className="mt-0.5 mb-0 text-[12px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * The rental request, rendered inside the conversation where it was made.
 *
 * For the owner while the request is still open, the card is the place to
 * accept, decline, or propose other dates. The renter sees the same facts
 * without payout figures - those belong on the owner's side.
 */
export function BookingTicket({
  booking,
  listing,
  role,
  partyName,
  compact = false,
  expiryLabel,
  actionBusy = false,
  actionError,
  onReview,
  onAccept,
  onDecline,
  onPropose,
}: {
  booking: ConversationBookingSummary
  listing: ConversationListing
  role: ConversationRole
  partyName: string
  compact?: boolean
  expiryLabel?: string | null
  actionBusy?: boolean
  actionError?: string | null
  onReview?: () => void
  onAccept?: () => void
  onDecline?: () => void
  onPropose?: () => void
}) {
  const pill = ticketStatusPill(booking.status, role)
  const tone = pill?.tone ?? 'done'
  const from = formatTicketDate(booking.start_date)
  const to = formatTicketDate(booking.end_date)
  const days = bookingDurationLabel(booking.days_count)
  const ownerPending = role === 'owner' && booking.status === 'requested'
  const money = ownerPending ? ownerReviewMoney(booking, listing) : null
  const showActions = ownerPending && onAccept && onDecline && onPropose

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
            onReview && ownerPending ? (
              <button
                type="button"
                data-testid="request-card-review"
                onClick={onReview}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-[11px] font-semibold',
                  PILL_TONE[pill.tone]
                )}
              >
                {pill.label}
              </button>
            ) : (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                  PILL_TONE[pill.tone]
                )}
              >
                {pill.label}
              </span>
            )
          ) : null}
        </header>

        {from && to ? (
          ownerPending ? (
            <div className="mx-4 grid grid-cols-3 border-y border-dashed border-border py-3">
              <DateCell label="Preuzimanje" value={from} />
              <div className="border-l border-dashed border-border px-2 sm:px-3">
                <DateCell label="Vraćanje" value={to} />
              </div>
              <div className="border-l border-dashed border-border pl-2 sm:pl-3">
                <DateCell
                  label="Trajanje"
                  value={days ?? 'lično preuzimanje'}
                  hint={days ? 'lično preuzimanje' : null}
                />
              </div>
            </div>
          ) : (
            <div className="mx-4 flex items-center gap-3 border-y border-dashed border-border py-3">
              <div className="min-w-0 flex-1">
                <p className={DATE_LABEL}>Preuzimanje</p>
                <p className={DATE_VALUE}>{from}</p>
              </div>
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={DATE_LABEL}>Vraćanje</p>
                <p className={DATE_VALUE}>{to}</p>
              </div>
            </div>
          )
        ) : (
          <p className="mx-4 border-y border-dashed border-border py-3 text-[13px] text-muted-foreground">
            Datumi nisu izabrani - dogovorite ih u razgovoru.
          </p>
        )}

            {money ? (
              <dl className="m-0 grid gap-1.5 px-4 pt-3 text-sm text-card-foreground">
                {money.dailyMinor && money.days ? (
                  <div className="flex justify-between gap-3">
                    <dt className="m-0 text-muted-foreground">
                      {formatPriceMinor(money.dailyMinor)} × {bookingDurationLabel(money.days)}
                    </dt>
                    <dd className="m-0">{formatPriceMinor(money.rentalMinor)}</dd>
                  </div>
                ) : null}
                {money.depositMinor ? (
                  <div className="flex justify-between gap-3">
                    <dt className="m-0 text-muted-foreground">Depozit (vraća se)</dt>
                    <dd className="m-0">{formatPriceMinor(money.depositMinor)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="m-0 text-muted-foreground">
                    Naknada platforme ({money.feePercent}%)
                  </dt>
                  <dd className="m-0">{formatPriceMinor(money.feeMinor)}</dd>
                </div>
                <div className="mt-1 flex justify-between gap-3 border-t border-border pt-2.5 text-[15px] font-bold">
                  <dt>Ti dobijaš</dt>
                  <dd className="m-0">{formatPriceMinor(money.payoutMinor)}</dd>
                </div>
              </dl>
            ) : !ownerPending ? (
          <dl className="m-0 grid gap-1 px-4 pt-3 pb-4 text-[13px]">
            {days ? (
              <div className="flex justify-between gap-3">
                <dt className="m-0 text-muted-foreground">Trajanje</dt>
                <dd className="m-0 font-medium text-card-foreground">{days}</dd>
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
        ) : null}

        {showActions ? (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-4">
            {actionError ? (
              <p className="m-0 w-full text-sm text-destructive" role="alert">
                {actionError}
              </p>
            ) : null}
            <Button
              size="sm"
              data-testid="request-card-accept"
              disabled={actionBusy}
              onClick={onAccept}
              className="bg-brand-500 hover:bg-brand-600"
            >
              Prihvati zahtev
            </Button>
            <Button
              size="sm"
              variant="secondary"
              data-testid="request-card-propose"
              disabled={actionBusy}
              onClick={onPropose}
            >
              Predloži druge datume
            </Button>
            <Button
              size="sm"
              variant="secondary"
              data-testid="request-card-decline"
              disabled={actionBusy}
              onClick={onDecline}
            >
              Odbij
            </Button>
            {expiryLabel ? (
              <p className="m-0 ml-auto text-[12.5px] font-semibold text-amber-700">{expiryLabel}</p>
            ) : null}
          </div>
        ) : ownerPending ? (
          <div className="h-3" />
        ) : null}
      </div>
    </article>
  )
}
