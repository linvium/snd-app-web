'use client'

import Link from 'next/link'
import { CheckCircle2Icon, CreditCardIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import { cn } from '@/lib/utils'
import type { ConversationBookingSummary, ConversationRole, Message } from '@/types'

function paymentDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}. do ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * The payment link, as a message in the thread.
 *
 * The renter was promised the link would arrive in the chat, so it is a card
 * they can act on rather than a grey system line with a URL in it. The owner
 * sees the same row read-only - it is their reservation too, and knowing the
 * link is out is the answer to "what am I waiting for".
 */
export function PaymentLinkCard({
  message,
  booking,
  role,
}: {
  message: Pick<Message, 'metadata'>
  booking: ConversationBookingSummary | null
  role: ConversationRole
}) {
  const metadata = (message.metadata ?? {}) as {
    token?: string
    payment_path?: string
    amount_minor?: number
    expires_at?: string
  }

  const link = booking?.payment_link
  const token = link?.token ?? metadata.token ?? null
  const amountMinor = link?.amount_minor ?? metadata.amount_minor ?? booking?.total_minor ?? null
  const expiresAt = link?.expires_at ?? metadata.expires_at ?? null

  const status = link?.status ?? 'pending'
  const expired = status === 'pending' && Boolean(expiresAt) && new Date(expiresAt!) <= new Date()
  const paid = status === 'paid' || booking?.status === 'booked' || booking?.status === 'picked_up'
  const settled = paid || booking?.status === 'returned' || booking?.status === 'rated'

  return (
    <article
      data-testid="payment-link-card"
      className={cn(
        'mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border bg-card shadow-sm',
        settled ? 'border-border' : 'border-brand-200'
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-dashed border-border px-4 py-3">
        <span
          aria-hidden
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            settled ? 'bg-muted text-muted-foreground' : 'bg-brand-50 text-brand-600'
          )}
        >
          {settled ? (
            <CheckCircle2Icon className="size-[18px]" strokeWidth={1.9} />
          ) : (
            <CreditCardIcon className="size-[18px]" strokeWidth={1.9} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[14px] font-semibold text-card-foreground">
            {settled
              ? 'Plaćeno'
              : expired
                ? 'Link za plaćanje je istekao'
                : 'Zahtev je prihvaćen'}
          </p>
          <p className="mt-0.5 mb-0 text-[12.5px] text-muted-foreground">
            {settled
              ? 'Termin je rezervisan.'
              : expired
                ? 'Zatraži novi termin u razgovoru.'
                : role === 'renter'
                  ? 'Plati da rezervišeš termin.'
                  : 'Poslat je link za plaćanje.'}
          </p>
        </div>
      </header>

      <div className="grid gap-2.5 px-4 py-3">
        {amountMinor != null ? (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12.5px] text-muted-foreground">Za uplatu</span>
            <span className="text-[17px] font-bold tracking-[-0.01em] text-card-foreground">
              {formatPriceMinor(amountMinor)}
            </span>
          </div>
        ) : null}

        {!settled && !expired && expiresAt ? (
          <p className="m-0 text-[12px] text-muted-foreground">
            Link važi do {paymentDeadline(expiresAt)}.
          </p>
        ) : null}

        {role === 'renter' && !settled && !expired && token ? (
          <Button
            asChild
            data-testid="payment-link-cta"
            className="h-11 bg-brand-500 hover:bg-brand-600"
          >
            <Link href={`/pay/${token}`}>Plati i rezerviši</Link>
          </Button>
        ) : null}
      </div>
    </article>
  )
}
