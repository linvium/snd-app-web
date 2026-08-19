'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertCircleIcon, CalendarIcon, InfoIcon, StarIcon } from 'lucide-react'

import DateRangeCalendar from '@/components/search/DateRangeCalendar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthSession } from '@/context/AuthContext'
import { useListingQuote } from '@/hooks/listings'
import { formatRating, pluralizeRatings } from '@/lib/listings'
import { formatDate, formatPriceMinor, formatPricePerDay } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { ListingDetail } from '@/types/listing-detail'

const PACKAGE_LABELS: Record<string, string> = {
  '1_day': 'Dnevna cena',
  '3_days': 'Paket od 3 dana',
  '7_days': 'Paket od 7 dana',
}

export interface BookingCardProps {
  listing: ListingDetail
  from: string | null
  to: string | null
  onDatesChange: (from: string | null, to: string | null) => void
  /** Set on the mobile sheet, where the card is already inside a modal. */
  variant?: 'sticky' | 'plain'
}

/**
 * Price, dates and the request button (doc 04 §13).
 *
 * Every figure here comes from the server. The card holds the two dates and
 * nothing else — it never multiplies a price by a day count locally, because a
 * total the browser computed is a total the browser can change, and the number
 * shown has to be the number charged (doc 04 §13.2).
 */
export default function BookingCard({
  listing,
  from,
  to,
  onDatesChange,
  variant = 'sticky',
}: BookingCardProps) {
  const router = useRouter()
  const { user } = useAuthSession()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const quote = useListingQuote(listing.id, from, to)
  const rating = formatRating(listing.rating_avg)

  // Doc 04 §13.1, "Sopstveni oglas": the whole card is replaced rather than
  // disabled — the owner's business here is managing, not renting.
  if (listing.is_own_listing) {
    return (
      <aside
        className={cn(
          'rounded-xl border border-border bg-card p-5',
          variant === 'sticky' && 'lg:sticky lg:top-24'
        )}
      >
        <p className="m-0 text-base font-semibold text-card-foreground">Ovo je tvoj oglas</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Vidiš ga onako kako ga vide drugi.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/listings/new/${listing.id}`}>Izmeni oglas</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/bookings?role=owner">Vidi zahteve</Link>
          </Button>
        </div>
      </aside>
    )
  }

  if (listing.status !== 'published') {
    return (
      <aside
        className={cn(
          'rounded-xl border border-border bg-muted p-5',
          variant === 'sticky' && 'lg:sticky lg:top-24'
        )}
      >
        <p className="m-0 text-sm font-medium text-foreground">Ovaj oglas trenutno nije aktivan.</p>
      </aside>
    )
  }

  const hasDates = Boolean(from && to)
  const unavailable = quote.data && !quote.data.is_available
  const suggestion =
    quote.data?.suggested_start && quote.data.suggested_end
      ? { start: quote.data.suggested_start, end: quote.data.suggested_end }
      : null

  const handleSubmit = () => {
    const next = `/listings/${listing.slug}${from && to ? `?from=${from}&to=${to}` : ''}`

    // A guest keeps their dates through the round trip (doc 04 §16).
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(next)}`)
      return
    }

    if (!hasDates) {
      setCalendarOpen(true)
      return
    }

    router.push(`/bookings/new?listing=${listing.id}&from=${from}&to=${to}`)
  }

  return (
    <>
      <aside
        className={cn(
          'rounded-xl border border-border bg-card p-5 shadow-sm',
          variant === 'sticky' && 'lg:sticky lg:top-24'
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="m-0 text-xl font-semibold text-card-foreground">
            {formatPricePerDay(listing.price_1_day_minor)}
          </p>
          {rating && listing.rating_count > 0 ? (
            <p className="m-0 flex items-center gap-1 text-[13px] text-muted-foreground">
              <StarIcon
                className="size-3.5 fill-accent-orange-500 text-accent-orange-500"
                aria-hidden
              />
              {rating} ({listing.rating_count})
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="mt-4 grid w-full cursor-pointer grid-cols-2 overflow-hidden rounded-lg border border-input bg-card p-0 text-left transition-colors hover:border-zinc-400"
        >
          <span className="border-r border-input px-3 py-2">
            <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Preuzimanje
            </span>
            <span className="block text-sm text-card-foreground">
              {from ? formatDate(from) : 'Izaberi'}
            </span>
          </span>
          <span className="px-3 py-2">
            <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Vraćanje
            </span>
            <span className="block text-sm text-card-foreground">
              {to ? formatDate(to) : 'Izaberi'}
            </span>
          </span>
        </button>

        {/* No dates, no sum: an itemised total for days nobody picked is noise
            (doc 04 §13.1). */}
        {hasDates && quote.isPending ? (
          <p className="mt-4 mb-0 text-sm text-muted-foreground">Računam cenu…</p>
        ) : null}

        {hasDates && quote.data ? (
          <div className="mt-4">
            <p className="m-0 text-sm font-medium text-card-foreground">
              {quote.data.days_count} {quote.data.days_count === 1 ? 'dan' : 'dana'}
            </p>

            <dl className="mt-3 mb-0 space-y-2 text-sm">
              {quote.data.price_breakdown.map((entry) => (
                <div key={entry.package} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {PACKAGE_LABELS[entry.package] ?? entry.package}
                    {entry.count > 1 ? ` × ${entry.count}` : ''}
                  </dt>
                  <dd className="m-0">{formatPriceMinor(entry.amount_minor)}</dd>
                </div>
              ))}

              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Iznajmljivanje</dt>
                <dd className="m-0">{formatPriceMinor(quote.data.rental_price_minor)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Naknada platforme</dt>
                <dd className="m-0">{formatPriceMinor(quote.data.service_fee_minor)}</dd>
              </div>

              <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold text-card-foreground">
                <dt>Ukupno</dt>
                <dd className="m-0">{formatPriceMinor(quote.data.total_minor)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {unavailable ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <p className="m-0 flex items-start gap-2 text-[13px] font-medium text-destructive">
              <AlertCircleIcon className="mt-0.5 size-4 flex-none" strokeWidth={1.8} aria-hidden />
              Ti datumi nisu slobodni.
            </p>
            {suggestion ? (
              <button
                type="button"
                onClick={() => onDatesChange(suggestion.start, suggestion.end)}
                className="mt-2 cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-brand-700 underline underline-offset-2"
              >
                Najbliži slobodan termin: {formatDate(suggestion.start)} –{' '}
                {formatDate(suggestion.end)}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleSubmit} disabled={Boolean(hasDates && unavailable)}>
            {hasDates ? 'Pošalji zahtev' : 'Proveri dostupnost'}
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/messages/new?listing=${listing.id}`}>Pošalji poruku</Link>
          </Button>
        </div>

        {/* Doc 04 §13: the sentence that makes the request feel safe to send. */}
        <p className="mt-3 mb-0 flex items-start gap-2 text-center text-[13px] text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 flex-none" strokeWidth={1.8} aria-hidden />
          Nećeš biti naplaćen dok vlasnik ne prihvati zahtev.
        </p>
      </aside>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="size-5" aria-hidden />
              Izaberi period
            </DialogTitle>
          </DialogHeader>

          <DateRangeCalendar
            from={from}
            to={to}
            unavailable={listing.unavailable_dates}
            onChange={onDatesChange}
          />

          <Button onClick={() => setCalendarOpen(false)} disabled={!from || !to}>
            {from && to ? 'Potvrdi' : 'Izaberi oba datuma'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
