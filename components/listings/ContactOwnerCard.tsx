'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BadgeCheckIcon } from 'lucide-react'

import DateRangeCalendar from '@/components/search/DateRangeCalendar'
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
import { useAuthSession } from '@/context/AuthContext'
import { useCreateBookingRequest } from '@/hooks/bookings'
import { useListingConversations } from '@/hooks/messages'
import { validateCreateRequestInput } from '@/lib/bookings'
import { requestThreadPath } from '@/lib/messages'
import { ApiError } from '@/lib/search'

export function ContactOwnerCard({
  listingId,
  listingSlug,
  ownerName,
  ownerVerified,
  initialFrom,
  initialTo,
}: {
  listingId: string
  listingSlug: string
  ownerName: string | null
  ownerVerified: boolean
  initialFrom: string | null
  initialTo: string | null
}) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthSession()
  const createRequest = useCreateBookingRequest()
  const existing = useListingConversations(listingId, Boolean(user))
  const openConversation = Boolean(user) && !existing.isLoading ? existing.data[0] : undefined
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [from, setFrom] = useState<string | null>(initialFrom)
  const [to, setTo] = useState<string | null>(initialTo)
  const [showDates, setShowDates] = useState(Boolean(initialFrom && initialTo))
  const [fieldError, setFieldError] = useState<string | null>(null)

  const openContact = () => {
    if (authLoading) return
    if (!user) {
      router.push(`/auth/login?next=/listings/${listingSlug}`)
      return
    }
    setOpen(true)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const startDate = showDates ? from : null
    const endDate = showDates ? to : null
    const fields = validateCreateRequestInput({ listingId, body, startDate, endDate })
    if (fields.body || fields.startDate || fields.endDate) {
      setFieldError(fields.body ?? fields.startDate ?? fields.endDate ?? 'Popravi polja.')
      return
    }

    setFieldError(null)
    createRequest.mutate(
      { listingId, body, startDate, endDate },
      {
        onSuccess: (result) => {
          setOpen(false)
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
    <div className="rounded-xl border border-border bg-card p-5" data-testid="contact-owner-card">
      <div className="mb-4">
        {ownerName ? (
          <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-card-foreground">
            {ownerName}
            {ownerVerified ? (
              <BadgeCheckIcon className="size-4 text-brand-600" aria-label="Verifikovan vlasnik" />
            ) : null}
          </p>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">Vlasnik oglasa</p>
        )}
      </div>
      {openConversation ? (
        <Button fullWidth className="bg-brand-500 hover:bg-brand-600" asChild>
          <Link href={requestThreadPath(openConversation.id)} data-testid="open-conversation-button">
            Otvori razgovor
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          fullWidth
          data-testid="contact-owner-button"
          className="bg-brand-500 hover:bg-brand-600"
          loading={authLoading}
          disabled={authLoading}
          onClick={openContact}
        >
          Kontaktiraj vlasnika
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="contact-dialog" className="max-h-[90vh] overflow-y-auto">
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

            {showDates ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <p className="m-0 text-sm font-medium">Datumi</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid="request-clear-dates"
                    onClick={() => {
                      setShowDates(false)
                      setFrom(null)
                      setTo(null)
                    }}
                  >
                    Obriši datume
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border border-border p-3">
                  <DateRangeCalendar
                    from={from}
                    to={to}
                    onChange={(nextFrom, nextTo) => {
                      setFrom(nextFrom)
                      setTo(nextTo)
                    }}
                    monthsAhead={6}
                  />
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                data-testid="request-add-dates"
                onClick={() => setShowDates(true)}
              >
                Dodaj datume
              </Button>
            )}

            {fieldError ? (
              <p className="m-0 text-sm text-destructive" data-testid="request-error" role="alert">
                {fieldError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
    </div>
  )
}
