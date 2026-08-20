import Link from 'next/link'
import { CheckIcon, ImageIcon, ShieldCheckIcon } from 'lucide-react'

import { bookingSteps, formatTicketDate } from '@/lib/messages/booking-steps'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/types'

/**
 * The context column: what the conversation is about, where the reservation
 * stands, and the one rule that decides whether the Guarantee applies.
 */
export function ThreadDetailPanel({ conversation }: { conversation: ConversationSummary }) {
  const { listing, booking } = conversation
  const steps = bookingSteps(booking)
  const listingHref = listing.slug ? `/listings/${listing.slug}` : null

  return (
    <div className="flex flex-col">
      <section className="border-b border-border p-4">
        <h3 className="mt-0 mb-3 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Predmet
        </h3>
        <div className="flex items-center gap-3">
          {listing.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.thumbnail_url}
              alt=""
              className="size-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted"
            >
              <ImageIcon className="size-5 text-muted-foreground" strokeWidth={1.6} />
            </span>
          )}
          <div className="min-w-0">
            {listingHref ? (
              <Link
                href={listingHref}
                className="block truncate text-[14.5px] font-semibold text-card-foreground no-underline hover:text-brand-600"
              >
                {listing.title}
              </Link>
            ) : (
              <p className="m-0 truncate text-[14.5px] font-semibold text-card-foreground">
                {listing.title}
              </p>
            )}
            {listing.price_1_day_minor ? (
              <p className="mt-0.5 mb-0 text-[12.5px] text-muted-foreground">
                {formatPriceMinor(listing.price_1_day_minor)} / dan
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {steps.length > 0 ? (
        <section className="border-b border-border p-4">
          <h3 className="mt-0 mb-3 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Status rezervacije
          </h3>
          <ol className="m-0 grid list-none gap-0 p-0">
            {steps.map((step, index) => (
              <li
                key={step.key}
                className={cn(
                  'relative flex gap-3 pb-4 text-[13px] last:pb-0',
                  index < steps.length - 1 &&
                    'after:absolute after:top-5 after:bottom-0 after:left-[9px] after:w-0.5',
                  index < steps.length - 1 && (step.state === 'done' ? 'after:bg-brand-500' : 'after:bg-border')
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'z-[1] grid size-5 shrink-0 place-items-center rounded-full border-2',
                    step.state === 'done' && 'border-brand-500 bg-brand-500 text-white',
                    step.state === 'current' && 'border-warning bg-warning-soft',
                    step.state === 'todo' && 'border-border bg-card'
                  )}
                >
                  {step.state === 'done' ? <CheckIcon className="size-3" strokeWidth={4} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-card-foreground">
                    {step.title}
                  </span>
                  {step.detail ? (
                    <span className="block text-[12px] text-muted-foreground">{step.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
          {booking?.start_date && booking.end_date ? (
            <p className="mt-3 mb-0 text-[12px] text-muted-foreground">
              {formatTicketDate(booking.start_date)} — {formatTicketDate(booking.end_date)}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="p-4">
        <h3 className="mt-0 mb-3 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Zaštita
        </h3>
        <div className="rounded-xl bg-info-soft p-3.5 text-[12.5px] leading-relaxed text-info">
          <p className="m-0 mb-1 flex items-center gap-1.5 text-[13px] font-semibold">
            <ShieldCheckIcon className="size-4 shrink-0" aria-hidden />
            SND Garancija
          </p>
          <p className="m-0">
            Važi samo za dogovore sklopljene kroz platformu. Slikaj predmet pri predaji i pri
            vraćanju.
          </p>
          <Link href="/garancija" className="mt-2 inline-block font-semibold text-info underline">
            Kako garancija radi
          </Link>
        </div>
      </section>
    </div>
  )
}
