'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import DateRangePicker from '@/components/search/DateRangePicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateBookingRequest } from '@/hooks/bookings'
import { useMediaQuery } from '@/hooks/search'
import { validateCreateRequestInput } from '@/lib/bookings'
import { requestThreadPath } from '@/lib/messages'
import { ApiError, formatDate } from '@/lib/search'

export function ContactOwnerDialog({
  open,
  onOpenChange,
  listingId,
  from,
  to,
  onDatesChange,
  unavailable,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listingId: string
  from: string | null
  to: string | null
  onDatesChange: (from: string | null, to: string | null) => void
  unavailable?: readonly string[]
}) {
  const router = useRouter()
  const createRequest = useCreateBookingRequest()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [body, setBody] = useState('')
  const [showPicker, setShowPicker] = useState(Boolean(from && to))
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    if (from && to) setShowPicker(true)
  }, [from, to])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const fields = validateCreateRequestInput({
      listingId,
      body,
      startDate: from,
      endDate: to,
    })
    if (fields.body || fields.startDate || fields.endDate) {
      setFieldError(fields.body ?? fields.startDate ?? fields.endDate ?? 'Popravi polja.')
      return
    }

    setFieldError(null)
    createRequest.mutate(
      { listingId, body, startDate: from, endDate: to },
      {
        onSuccess: (result) => {
          onOpenChange(false)
          setBody('')
          router.push(requestThreadPath(result.conversationId))
        },
        onError: (error) => {
          setFieldError(
            error instanceof ApiError ? error.message : 'Zahtev nije poslat. Pokušaj ponovo.'
          )
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setShowPicker(Boolean(from && to))
      }}
    >
      <DialogContent data-testid="contact-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-md md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pošalji zahtev</DialogTitle>
          <DialogDescription>
            Napiši vlasniku. Datumi su opcionalni - nisu obavezni za prvi kontakt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="request-message">Poruka</Label>
            <Textarea
              id="request-message"
              data-testid="request-message"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Zdravo, da li je predmet slobodan?"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="m-0 text-sm font-medium">Datumi</p>
              {from || to ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="request-clear-dates"
                  onClick={() => {
                    onDatesChange(null, null)
                    setShowPicker(false)
                  }}
                >
                  Obriši datume
                </Button>
              ) : null}
            </div>

            {showPicker ? (
              <DateRangePicker
                layout={isDesktop ? 'split' : 'stack'}
                from={from}
                to={to}
                unavailable={unavailable}
                monthsAhead={6}
                onChange={onDatesChange}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                data-testid="request-add-dates"
                onClick={() => setShowPicker(true)}
              >
                {from ? `Datumi: ${formatDate(from)}${to ? ` - ${formatDate(to)}` : ''}` : 'Dodaj datume'}
              </Button>
            )}
          </div>

          {fieldError ? (
            <p className="m-0 text-sm text-destructive" data-testid="request-error" role="alert">
              {fieldError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Otkaži
            </Button>
            <Button
              type="submit"
              data-testid="request-submit"
              loading={createRequest.isPending}
              className="bg-brand-500 hover:bg-brand-600"
            >
              Pošalji zahtev
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
