'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2Icon,
  ClockAlertIcon,
  Loader2Icon,
  ShieldCheckIcon,
  XCircleIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useConfirmPayment, usePaymentLink, useStartCheckout } from '@/hooks/bookings'
import { formatTicketDate } from '@/lib/messages/booking-steps'
import { bookingDurationLabel } from '@/lib/messages/request-review.helpers'
import { ApiError } from '@/lib/search'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import type { PaymentLinkSummary } from '@/types/booking'

/** How long to keep waiting on the webhook before saying so out loud. */
const CONFIRMATION_GRACE_MS = 60_000

/**
 * The sandbox confirm button, which stands in for a provider.
 *
 * Mirrors PAYMENT_MANUAL_CONFIRM on the edge function. Both have to be on for
 * it to do anything, and neither is on in an environment with real Stripe keys.
 */
const MANUAL_CONFIRM = process.env.NEXT_PUBLIC_PAYMENT_MANUAL_CONFIRM === 'true'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="m-0 text-muted-foreground">{label}</dt>
      <dd className="m-0 font-medium text-card-foreground">{value}</dd>
    </div>
  )
}

function Outcome({
  tone,
  title,
  detail,
  action,
}: {
  tone: 'ok' | 'late' | 'waiting'
  title: string
  detail: string
  action?: React.ReactNode
}) {
  const Icon = tone === 'ok' ? CheckCircle2Icon : tone === 'waiting' ? Loader2Icon : ClockAlertIcon
  return (
    <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <span
        aria-hidden
        className={
          tone === 'late'
            ? 'mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-amber-700'
            : 'mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600'
        }
      >
        <Icon className={tone === 'waiting' ? 'size-6 animate-spin' : 'size-6'} strokeWidth={1.8} />
      </span>
      <h1 className="mt-3 mb-1 text-[19px] font-semibold tracking-[-0.02em] text-card-foreground">
        {title}
      </h1>
      <p className="m-0 text-sm text-muted-foreground">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  )
}

/**
 * Pay-by-link.
 *
 * The button hands off to the provider's hosted checkout - no card field, and
 * no publishable key, is ever on an SND page. What comes back through the
 * redirect is only a hint: the booking is settled by the provider's webhook,
 * which is the one account of events the renter's browser cannot edit. That is
 * why returning with `?status=success` shows "confirming" and waits for the
 * link itself to flip rather than declaring victory.
 */
export function PaymentPanel({
  summary,
  isSignedIn,
}: {
  summary: PaymentLinkSummary
  isSignedIn: boolean
}) {
  const params = useSearchParams()
  const returnedFromProvider = params.get('status') === 'success'
  const cancelled = params.get('status') === 'cancelled'

  const [waitedTooLong, setWaitedTooLong] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const awaiting = returnedFromProvider && !waitedTooLong
  const query = usePaymentLink(summary.token, { awaitingConfirmation: awaiting })
  const checkout = useStartCheckout(summary.token)
  const confirm = useConfirmPayment(summary.token)

  const link = query.data ?? summary
  const { booking, listing } = link

  useEffect(() => {
    if (!returnedFromProvider) return
    const timer = setTimeout(() => setWaitedTooLong(true), CONFIRMATION_GRACE_MS)
    return () => clearTimeout(timer)
  }, [returnedFromProvider])

  if (link.status === 'paid' || confirm.data) {
    return (
      <Outcome
        tone="ok"
        title="Plaćanje je uspešno"
        detail={`${listing.title} je rezervisan. Poslali smo potvrdu na email, a vlasnik je obavešten.`}
        action={
          <Button asChild className="bg-brand-500 hover:bg-brand-600">
            <Link href="/profile/requests">Otvori rezervaciju</Link>
          </Button>
        }
      />
    )
  }

  // Back from the provider, webhook not in yet. Common and harmless - it
  // usually lands within a second or two.
  if (awaiting) {
    return (
      <Outcome
        tone="waiting"
        title="Potvrđujemo plaćanje"
        detail="Ovo traje nekoliko sekundi. Ne zatvaraj stranicu."
      />
    )
  }

  if (link.status === 'expired') {
    return (
      <Outcome
        tone="late"
        title="Link je istekao"
        detail="Termin više nije rezervisan za tebe. Javi se vlasniku u razgovoru da dogovorite novi."
        action={
          <Button asChild variant="secondary">
            <Link href="/profile/requests">Otvori razgovor</Link>
          </Button>
        }
      />
    )
  }

  if (link.status === 'cancelled') {
    return (
      <Outcome
        tone="late"
        title="Link više ne važi"
        detail="Ovaj zahtev je u međuvremenu promenjen. Proveri razgovor sa vlasnikom."
        action={
          <Button asChild variant="secondary">
            <Link href="/profile/requests">Otvori razgovor</Link>
          </Button>
        }
      />
    )
  }

  const from = formatTicketDate(booking.start_date)
  const to = formatTicketDate(booking.end_date)
  const days = bookingDurationLabel(booking.days_count)
  const busy = checkout.isPending || confirm.isPending

  // Either the webhook never arrived, or the payment did not go through. The
  // link is still payable, so the honest move is to say so and offer a retry.
  const notice = waitedTooLong
    ? 'Nismo dobili potvrdu plaćanja. Ako je novac skinut, javi se podršci pre nego što pokušaš ponovo.'
    : cancelled
      ? 'Plaćanje je prekinuto. Termin je i dalje rezervisan do isteka linka.'
      : (link.last_error ?? null)

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-5 py-4">
        <p className="m-0 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Plaćanje rezervacije
        </p>
        <h1 className="mt-1 mb-0 text-[19px] leading-snug font-semibold tracking-[-0.02em] text-card-foreground">
          {listing.title}
        </h1>
        <p className="mt-1 mb-0 text-[13px] text-muted-foreground">
          Vlasnik: {link.owner_name}
          {booking.reference ? ` · ${booking.reference}` : ''}
        </p>
      </header>

      <dl className="m-0 grid gap-2 px-5 py-4">
        {from && to ? <Row label="Termin" value={`${from} - ${to}`} /> : null}
        {days ? <Row label="Trajanje" value={days} /> : null}
        {booking.rental_price_minor ? (
          <Row label="Iznajmljivanje" value={formatPriceMinor(booking.rental_price_minor)} />
        ) : null}
        {booking.service_fee_minor ? (
          <Row label="Naknada platforme" value={formatPriceMinor(booking.service_fee_minor)} />
        ) : null}
        <div className="mt-1 flex justify-between gap-3 border-t border-border pt-3 text-[17px] font-bold text-card-foreground">
          <dt>Za uplatu</dt>
          <dd className="m-0">{formatPriceMinor(link.amount_minor)}</dd>
        </div>
      </dl>

      <div className="grid gap-2.5 px-5 pb-5">
        {notice ? (
          <p
            className="m-0 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900"
            role="status"
          >
            {notice}
          </p>
        ) : null}

        {isSignedIn ? (
          <Button
            data-testid="payment-checkout"
            disabled={busy}
            loading={checkout.isPending}
            onClick={() => {
              setError(null)
              checkout.mutate(undefined, {
                onError: (checkoutError) => {
                  setError(
                    checkoutError instanceof ApiError
                      ? checkoutError.message
                      : 'Plaćanje nije moglo da se otvori. Pokušaj ponovo.'
                  )
                },
              })
            }}
            className="h-12 bg-brand-500 text-[15px] hover:bg-brand-600"
          >
            Plati {formatPriceMinor(link.amount_minor)}
          </Button>
        ) : (
          <Button asChild className="h-12 bg-brand-500 text-[15px] hover:bg-brand-600">
            <Link href={`/auth/login?next=/pay/${link.token}`}>Prijavi se da platiš</Link>
          </Button>
        )}

        {MANUAL_CONFIRM && isSignedIn ? (
          <Button
            variant="secondary"
            data-testid="payment-confirm"
            disabled={busy}
            loading={confirm.isPending}
            onClick={() => {
              setError(null)
              confirm.mutate(undefined, {
                onError: (confirmError) => {
                  setError(
                    confirmError instanceof ApiError
                      ? confirmError.message
                      : 'Plaćanje nije potvrđeno. Pokušaj ponovo.'
                  )
                },
              })
            }}
          >
            Označi kao plaćeno (test)
          </Button>
        ) : null}

        {error ? (
          <p className="m-0 flex items-start gap-1.5 text-sm text-destructive" role="alert">
            <XCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <p className="m-0 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Plaćanje ide preko sigurne stranice provajdera - podaci o kartici ne prolaze kroz SND.
          Termin je rezervisan tek kada uplata prođe.
        </p>
      </div>
    </section>
  )
}
