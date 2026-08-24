'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PackageCheckIcon, StarIcon, UndoDotIcon, WalletIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useRespondToBookingRequest } from '@/hooks/bookings'
import { formatTicketDate } from '@/lib/messages/booking-steps'
import { ApiError } from '@/lib/search'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import type { ConversationBookingSummary, ConversationRole } from '@/types'

/**
 * What this person can do about the reservation right now.
 *
 * One bar above the composer, showing exactly one move - the reservation is a
 * queue of turns, and a screen offering "pick up", "return" and "rate" at once
 * would be inviting the owner to skip steps that mean something.
 */
export function BookingStageActions({
  booking,
  role,
  onReview,
}: {
  booking: ConversationBookingSummary
  role: ConversationRole
  onReview: () => void
}) {
  const respond = useRespondToBookingRequest()
  const [error, setError] = useState<string | null>(null)

  const move = (action: 'mark_picked_up' | 'mark_returned') => {
    setError(null)
    respond.mutate(
      { bookingId: booking.id, action },
      {
        onError: (moveError) => {
          setError(
            moveError instanceof ApiError
              ? moveError.message
              : 'Nije sačuvano. Pokušaj ponovo.'
          )
        },
      }
    )
  }

  const status = booking.status
  const link = booking.payment_link
  const linkLive = link?.status === 'pending' && new Date(link.expires_at) > new Date()
  // A booking with no link at all is not the same as one whose link ran out.
  const linkLapsed = Boolean(link) && !linkLive

  let content: React.ReactNode = null

  if (status === 'accepted' && role === 'renter') {
    content = linkLive ? (
      <>
        <Note icon={<WalletIcon className="size-4" aria-hidden />}>
          Rezerviši termin uplatom od {formatPriceMinor(link!.amount_minor)}.
        </Note>
        <Button asChild size="sm" data-testid="stage-pay" className="bg-brand-500 hover:bg-brand-600">
          <Link href={`/pay/${link!.token}`}>Plati i rezerviši</Link>
        </Button>
      </>
    ) : (
      <Note icon={<WalletIcon className="size-4" aria-hidden />}>
        {linkLapsed
          ? 'Link za plaćanje je istekao - dogovorite novi termin u razgovoru.'
          : 'Zahtev je prihvaćen. Link za plaćanje stiže u razgovor i na email.'}
      </Note>
    )
  } else if (status === 'accepted' && role === 'owner') {
    content = (
      <Note icon={<WalletIcon className="size-4" aria-hidden />}>
        Poslat je link za plaćanje. Termin je rezervisan kada uplata prođe.
      </Note>
    )
  } else if (status === 'booked' && role === 'owner') {
    content = (
      <>
        <Note icon={<PackageCheckIcon className="size-4" aria-hidden />}>
          Plaćeno. Označi preuzimanje kada predaš predmet.
        </Note>
        <Button
          size="sm"
          data-testid="stage-picked-up"
          disabled={respond.isPending}
          onClick={() => move('mark_picked_up')}
          className="bg-brand-500 hover:bg-brand-600"
        >
          Označi kao preuzeto
        </Button>
      </>
    )
  } else if (status === 'booked' && role === 'renter') {
    content = (
      <Note icon={<PackageCheckIcon className="size-4" aria-hidden />}>
        Rezervisano. Dogovorite preuzimanje
        {booking.start_date ? ` (${formatTicketDate(booking.start_date)})` : ''}.
      </Note>
    )
  } else if (status === 'picked_up' && role === 'owner') {
    content = (
      <>
        <Note icon={<UndoDotIcon className="size-4" aria-hidden />}>
          Predmet je kod zakupca
          {booking.end_date ? ` do ${formatTicketDate(booking.end_date)}` : ''}.
        </Note>
        <Button
          size="sm"
          data-testid="stage-returned"
          disabled={respond.isPending}
          onClick={() => move('mark_returned')}
          className="bg-brand-500 hover:bg-brand-600"
        >
          Označi kao vraćeno
        </Button>
      </>
    )
  } else if (status === 'picked_up' && role === 'renter') {
    content = (
      <Note icon={<UndoDotIcon className="size-4" aria-hidden />}>
        Preuzeto. Vraćanje
        {booking.end_date ? `: ${formatTicketDate(booking.end_date)}` : ' po dogovoru'}.
      </Note>
    )
  } else if ((status === 'returned' || status === 'rated') && !booking.viewer_has_reviewed) {
    content = (
      <>
        <Note icon={<StarIcon className="size-4" aria-hidden />}>
          Iznajmljivanje je završeno. Ostavi ocenu.
        </Note>
        <Button
          size="sm"
          data-testid="stage-review"
          onClick={onReview}
          className="bg-brand-500 hover:bg-brand-600"
        >
          Ostavi ocenu
        </Button>
      </>
    )
  } else if (status === 'rated' || status === 'returned') {
    content = (
      <Note icon={<StarIcon className="size-4" aria-hidden />}>
        Ocena je poslata. Objavljuje se kada i druga strana oceni.
      </Note>
    )
  }

  if (!content) return null

  return (
    <div
      data-testid="booking-stage-actions"
      className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/50 px-3 py-2.5"
    >
      {content}
      {error ? (
        <p className="m-0 w-full text-[12.5px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Note({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="m-0 flex min-w-0 flex-1 items-center gap-2 text-[13px] text-foreground">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  )
}
