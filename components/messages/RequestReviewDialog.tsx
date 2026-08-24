'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRightIcon, ClockIcon, ShieldCheckIcon, XIcon } from 'lucide-react'

import DateRangePicker from '@/components/search/DateRangePicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRespondToBookingRequest } from '@/hooks/bookings'
import { useMediaQuery } from '@/hooks/search'
import { formatTicketDate } from '@/lib/messages/booking-steps'
import {
  bookingDurationLabel,
  ownerReviewMoney,
  pendingRequestBannerDetail,
} from '@/lib/messages/request-review.helpers'
import { ApiError } from '@/lib/search'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import type { ConversationBookingSummary, ConversationListing } from '@/types/message'

export function PendingRequestBanner({
  booking,
  onReview,
}: {
  booking: ConversationBookingSummary
  onReview: () => void
}) {
  const detail = pendingRequestBannerDetail(booking)

  return (
    <button
      type="button"
      onClick={onReview}
      data-testid="pending-request-banner"
      className="flex w-full shrink-0 cursor-pointer items-center gap-2.5 border-0 border-b border-warning/40 bg-warning-soft px-3 py-2.5 text-left"
    >
      <ClockIcon className="size-4 shrink-0 text-amber-700" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-amber-900">
          Zahtev čeka tvoju potvrdu
        </span>
        {detail ? <span className="block text-[11.5px] text-amber-800">{detail}</span> : null}
      </span>
      <span className="shrink-0 rounded-lg bg-warning px-3 py-2 text-[12.5px] font-bold text-amber-950">
        Pregledaj
      </span>
    </button>
  )
}

function RequestReviewActions({
  busy,
  acceptPending,
  proposePending,
  error,
  mode,
  canSubmitPropose,
  canAccept,
  onAccept,
  onDecline,
  onOpenPropose,
  onSubmitPropose,
  onBack,
}: {
  busy: boolean
  acceptPending: boolean
  proposePending: boolean
  error: string | null
  mode: 'review' | 'propose'
  canSubmitPropose: boolean
  canAccept: boolean
  onAccept: () => void
  onDecline: () => void
  onOpenPropose: () => void
  onSubmitPropose: () => void
  onBack: () => void
}) {
  return (
    <div className="grid shrink-0 gap-2 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {mode === 'review' ? (
        <>
          <Button
            data-testid="request-accept"
            disabled={busy || !canAccept}
            loading={acceptPending}
            onClick={onAccept}
            className="h-11 bg-brand-500 hover:bg-brand-600"
          >
            Prihvati zahtev
          </Button>
          {!canAccept ? (
            <p className="m-0 text-[12.5px] text-muted-foreground">
              Prihvatanje šalje link za plaćanje, pa prvo predloži datume.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              data-testid="request-propose-dates"
              disabled={busy}
              className="h-11 whitespace-normal text-[13px] leading-tight"
              onClick={onOpenPropose}
            >
              Predloži druge datume
            </Button>
            <Button
              variant="secondary"
              data-testid="request-decline"
              disabled={busy}
              className="h-11"
              onClick={onDecline}
            >
              Odbij
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button
            data-testid="request-propose-submit"
            disabled={busy || !canSubmitPropose}
            loading={proposePending}
            onClick={onSubmitPropose}
            className="h-11 bg-brand-500 hover:bg-brand-600"
          >
            Pošalji predlog
          </Button>
          <Button variant="secondary" className="h-11" disabled={busy} onClick={onBack}>
            Nazad
          </Button>
        </>
      )}
    </div>
  )
}

function RequestReviewPanel({
  booking,
  listing,
  mode,
  from,
  to,
  isDesktop,
  showGrabber,
  showClose,
  onClose,
  onDatesChange,
  actions,
}: {
  booking: ConversationBookingSummary
  listing: ConversationListing
  mode: 'review' | 'propose'
  from: string | null
  to: string | null
  isDesktop: boolean
  showGrabber: boolean
  showClose: boolean
  onClose: () => void
  onDatesChange: (from: string | null, to: string | null) => void
  actions: ReactNode
}) {
  const fromLabel = formatTicketDate(booking.start_date)
  const toLabel = formatTicketDate(booking.end_date)
  const duration = bookingDurationLabel(booking.days_count)
  const money = ownerReviewMoney(booking, listing)

  return (
    <>
      {showGrabber ? (
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border" aria-hidden />
      ) : null}

      <header className="relative shrink-0 border-b border-border px-4 pt-3 pr-12 pb-3">
        <p className="m-0 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Zahtev za iznajmljivanje
        </p>
        <div className="mt-1 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-card-foreground">
              {listing.title}
            </h2>
          </div>
          <span className="mt-0.5 shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            Čeka potvrdu
          </span>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </header>

      <div className="snd-thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5">
        {mode === 'review' ? (
          <>
            {fromLabel && toLabel ? (
              <div className="mb-3.5 flex items-center gap-2.5 rounded-xl bg-muted/70 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold tracking-[-0.01em] text-card-foreground">
                    {fromLabel}
                  </p>
                  <p className="mt-0.5 mb-0 text-xs text-muted-foreground">preuzimanje</p>
                </div>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold tracking-[-0.01em] text-card-foreground">
                    {toLabel}
                  </p>
                  <p className="mt-0.5 mb-0 text-xs text-muted-foreground">vraćanje</p>
                </div>
              </div>
            ) : (
              <p className="mb-3.5 rounded-xl bg-muted/70 px-3.5 py-3 text-[13px] text-muted-foreground">
                Datumi nisu izabrani. Dogovorite ih u razgovoru.
              </p>
            )}

            {duration ? (
              <p className="mt-0 mb-3 text-[13px] text-muted-foreground">{duration}</p>
            ) : null}

            {money ? (
              <dl className="m-0 grid gap-1.5 text-sm text-card-foreground">
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
                <div className="mt-1 flex justify-between gap-3 border-t border-border pt-2.5 text-base font-bold">
                  <dt>Ti dobijaš</dt>
                  <dd className="m-0">{formatPriceMinor(money.payoutMinor)}</dd>
                </div>
              </dl>
            ) : null}

            <div className="mt-4 rounded-xl bg-info-soft p-3 text-[12.5px] leading-relaxed text-info">
              <p className="m-0 mb-1 flex items-center gap-1.5 text-[13px] font-semibold">
                <ShieldCheckIcon className="size-4 shrink-0" aria-hidden />
                {listing.item_value_minor
                  ? `Garancija do ${formatPriceMinor(listing.item_value_minor)}`
                  : 'SND Garancija'}
              </p>
              <p className="m-0">
                Važi samo za dogovore kroz platformu. Slikaj predmet pri predaji i pri vraćanju.
              </p>
            </div>
          </>
        ) : (
          <DateRangePicker
            layout={isDesktop ? 'split' : 'stack'}
            from={from}
            to={to}
            onChange={onDatesChange}
          />
        )}
      </div>

      {actions}
    </>
  )
}

export function RequestReviewDialog({
  open,
  onOpenChange,
  booking,
  listing,
  initialMode = 'review',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: ConversationBookingSummary
  listing: ConversationListing
  initialMode?: 'review' | 'propose'
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const respond = useRespondToBookingRequest()
  const [mode, setMode] = useState<'review' | 'propose'>(initialMode)
  const [from, setFrom] = useState<string | null>(booking.start_date)
  const [to, setTo] = useState<string | null>(booking.end_date)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setFrom(booking.start_date)
    setTo(booking.end_date)
    setError(null)
  }, [open, initialMode, booking.start_date, booking.end_date])

  const busy = respond.isPending

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode('review')
      setError(null)
      setFrom(booking.start_date)
      setTo(booking.end_date)
    }
    onOpenChange(next)
  }

  const handleRespond = (action: 'accept' | 'decline' | 'propose') => {
    if (action === 'propose' && (!from || !to)) {
      setError('Izaberi oba datuma.')
      return
    }
    setError(null)
    respond.mutate(
      {
        bookingId: booking.id,
        action,
        startDate: action === 'propose' ? from : null,
        endDate: action === 'propose' ? to : null,
      },
      {
        onSuccess: () => handleOpenChange(false),
        onError: (respondError) => {
          setError(
            respondError instanceof ApiError
              ? respondError.message
              : 'Odgovor nije sačuvan. Pokušaj ponovo.'
          )
        },
      }
    )
  }

  const actions = (
    <RequestReviewActions
      busy={busy}
      acceptPending={respond.isPending && respond.variables?.action !== 'propose'}
      proposePending={respond.isPending && respond.variables?.action === 'propose'}
      error={error}
      mode={mode}
      canSubmitPropose={Boolean(from && to)}
      canAccept={Boolean(booking.start_date && booking.end_date)}
      onAccept={() => handleRespond('accept')}
      onDecline={() => handleRespond('decline')}
      onOpenPropose={() => {
        setError(null)
        setMode('propose')
      }}
      onSubmitPropose={() => handleRespond('propose')}
      onBack={() => setMode('review')}
    />
  )

  const panel = (
    <RequestReviewPanel
      booking={booking}
      listing={listing}
      mode={mode}
      from={from}
      to={to}
      isDesktop={isDesktop}
      showGrabber={!isDesktop}
      showClose={!isDesktop}
      onClose={() => handleOpenChange(false)}
      onDatesChange={(nextFrom, nextTo) => {
        setFrom(nextFrom)
        setTo(nextTo)
      }}
      actions={actions}
    />
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          data-testid="request-review-dialog"
          className="flex max-h-[82dvh] flex-col overflow-hidden p-0 sm:max-w-md"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Zahtev za iznajmljivanje</DialogTitle>
            <DialogDescription>Pregled zahteva i odgovor vlasnika.</DialogDescription>
          </DialogHeader>
          {panel}
        </DialogContent>
      </Dialog>
    )
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-review-title"
      data-testid="request-review-dialog"
    >
      <button
        type="button"
        aria-label="Zatvori pregled"
        onClick={() => handleOpenChange(false)}
        className="absolute inset-0 cursor-pointer border-0 bg-black/40"
      />
      <div className="relative flex max-h-[min(82dvh,calc(100dvh-env(safe-area-inset-bottom)))] min-h-0 w-full flex-col overflow-hidden rounded-t-3xl bg-card shadow-lg">
        <span id="request-review-title" className="sr-only">
          Zahtev za iznajmljivanje
        </span>
        {panel}
      </div>
    </div>
  )
}
