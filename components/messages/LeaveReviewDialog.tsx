'use client'

import { useEffect, useState } from 'react'
import { StarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useSubmitBookingReview } from '@/hooks/bookings'
import { ApiError } from '@/lib/search'
import { cn } from '@/lib/utils'
import { REVIEW_COMMENT_MAX } from '@/types/booking'

const RATING_LABELS = ['', 'Loše', 'Moglo bi bolje', 'U redu', 'Dobro', 'Odlično'] as const

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (next: number) => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState(0)
  const shown = hovered || value

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Ocena"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} od 5`}
          data-testid={`review-star-${star}`}
          disabled={disabled}
          onMouseEnter={() => setHovered(star)}
          onFocus={() => setHovered(star)}
          onClick={() => onChange(star)}
          className="cursor-pointer rounded-md border-0 bg-transparent p-1 disabled:cursor-not-allowed"
        >
          <StarIcon
            className={cn(
              'size-8',
              star <= shown ? 'fill-warning text-warning' : 'text-border'
            )}
            strokeWidth={1.6}
          />
        </button>
      ))}
    </div>
  )
}

/**
 * The rating that closes a reservation.
 *
 * Both sides write one and neither text appears until both have - the copy says
 * so, because a review nobody can read yet looks like a bug otherwise.
 */
export function LeaveReviewDialog({
  open,
  onOpenChange,
  bookingId,
  partyName,
  listingTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  partyName: string
  listingTitle: string
}) {
  const submit = useSubmitBookingReview()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRating(0)
    setComment('')
    setError(null)
  }, [open])

  const handleSubmit = () => {
    if (rating < 1) {
      setError('Izaberi ocenu od 1 do 5.')
      return
    }
    setError(null)
    submit.mutate(
      { bookingId, rating, comment: comment.trim() || null },
      {
        onSuccess: () => onOpenChange(false),
        onError: (submitError) => {
          setError(
            submitError instanceof ApiError
              ? submitError.message
              : 'Ocena nije sačuvana. Pokušaj ponovo.'
          )
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="leave-review-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Oceni iznajmljivanje</DialogTitle>
          <DialogDescription>
            {listingTitle} · {partyName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <StarPicker value={rating} onChange={setRating} disabled={submit.isPending} />
            <p className="mt-1 mb-0 h-4 text-[12.5px] text-muted-foreground">
              {rating > 0 ? RATING_LABELS[rating] : ''}
            </p>
          </div>

          <Textarea
            data-testid="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={REVIEW_COMMENT_MAX}
            rows={4}
            placeholder="Kako je prošlo? (neobavezno)"
            className="resize-none"
          />

          <p className="m-0 text-[12px] leading-relaxed text-muted-foreground">
            Ocene se objavljuju tek kada obe strane ocene jedna drugu.
          </p>

          {error ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            data-testid="review-submit"
            disabled={submit.isPending}
            loading={submit.isPending}
            onClick={handleSubmit}
            className="h-11 bg-brand-500 hover:bg-brand-600"
          >
            Pošalji ocenu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
