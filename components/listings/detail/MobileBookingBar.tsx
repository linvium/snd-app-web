'use client'

import { useState } from 'react'

import BookingCard from '@/components/listings/detail/BookingCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useListingQuote } from '@/hooks/listings'
import { formatDateRange, formatPriceMinor, formatPricePerDay } from '@/lib/search'
import type { ListingDetail } from '@/types/listing-detail'

/**
 * The fixed bar on phones (doc 04 §2.2).
 *
 * Sits above the bottom navigation rather than replacing it, so the page's own
 * action never covers the way out of the page. It summarises what is already
 * chosen — dates and total — and opens the full card for anything more.
 */
export default function MobileBookingBar({
  listing,
  from,
  to,
  onDatesChange,
  onStartRequest,
  existingConversationId,
}: {
  listing: ListingDetail
  from: string | null
  to: string | null
  onDatesChange: (from: string | null, to: string | null) => void
  onStartRequest: () => void
  existingConversationId?: string | null
}) {
  const [open, setOpen] = useState(false)
  const quote = useListingQuote(listing.id, from, to)

  // The owner has no bar: their actions live in the card itself (doc 04 §13.1).
  if (listing.is_own_listing || listing.status !== 'published') return null

  const dateLabel = formatDateRange(from, to)

  return (
    <>
      <div className="fixed right-0 bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 md:hidden">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-card-foreground">
            {formatPricePerDay(listing.price_1_day_minor)}
          </p>
          {dateLabel ? (
            <p className="m-0 truncate text-[13px] text-muted-foreground">
              {dateLabel}
              {quote.data ? ` · ${formatPriceMinor(quote.data.total_minor)}` : ''}
            </p>
          ) : (
            <p className="m-0 text-[13px] text-muted-foreground">Izaberi datume</p>
          )}
        </div>

        <Button className="flex-none" onClick={() => setOpen(true)}>
          Rezerviši
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rezervacija</DialogTitle>
          </DialogHeader>

          <BookingCard
            listing={listing}
            from={from}
            to={to}
            onDatesChange={onDatesChange}
            onStartRequest={() => {
              setOpen(false)
              onStartRequest()
            }}
            existingConversationId={existingConversationId}
            variant="plain"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
