'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EllipsisVerticalIcon, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ListingPublishedToast } from '@/components/listings/ListingPublishedToast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useDeleteListing,
  usePauseListing,
  usePublishListing,
  useResumeListing,
  useUnpublishListing,
} from '@/hooks/listings'
import { listingEditPath, LISTING_NEW_PATH } from '@/lib/listings'
import {
  LISTING_STATUS_LABELS,
  LISTING_UI_STATUSES,
  listingStatusAction,
  type ListingUiStatus,
} from '@/lib/listings/listings.status'
import { formatPricePerDay } from '@/lib/search'
import { ApiError } from '@/lib/search/search.service'
import { cn } from '@/lib/utils'
import type { ListingStatus, OwnedListingSummary } from '@/types/listing'

function statusLabel(status: ListingStatus): string | null {
  if (status === 'draft' || status === 'published' || status === 'paused') {
    return LISTING_STATUS_LABELS[status]
  }
  return null
}

function listingHref(listing: OwnedListingSummary): string {
  if (listing.status === 'published' && listing.slug) {
    return `/listings/${listing.slug}`
  }
  return listingEditPath(listing.id)
}

function OwnerListingActions({
  listing,
  onStatusChange,
  onDeleted,
}: {
  listing: OwnedListingSummary
  onStatusChange: (status: ListingStatus) => void
  onDeleted: () => void
}) {
  const publish = usePublishListing()
  const pause = usePauseListing()
  const resume = useResumeListing()
  const unpublish = useUnpublishListing()
  const remove = useDeleteListing()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isPending = publish.isPending || pause.isPending || resume.isPending || unpublish.isPending

  const changeStatus = (next: ListingUiStatus) => {
    const action = listingStatusAction(listing.status, next)
    if (!action || isPending) return
    const previous = listing.status
    onStatusChange(next)

    const rollback = (error: unknown, fallback: string) => {
      onStatusChange(previous)
      toast.error(error instanceof Error ? error.message : fallback)
    }

    if (action === 'publish') {
      publish.mutate(listing.id, {
        onSuccess: () => toast.success('Oglas je objavljen.'),
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Nismo mogli da objavimo oglas. Otvori ga i dopuni polja.'
          onStatusChange(previous)
          toast.error(message)
        },
      })
      return
    }

    if (action === 'pause') {
      pause.mutate(listing.id, {
        onSuccess: () => toast.success('Oglas je arhiviran.'),
        onError: (error) => rollback(error, 'Nismo mogli da arhiviramo oglas.'),
      })
      return
    }

    if (action === 'unpublish') {
      unpublish.mutate(listing.id, {
        onSuccess: () => toast.success('Oglas je vraćen u nacrt.'),
        onError: (error) => rollback(error, 'Nismo mogli da vratimo oglas u nacrt.'),
      })
      return
    }

    resume.mutate(listing.id, {
      onSuccess: () => toast.success('Oglas je ponovo aktivan.'),
      onError: (error) => rollback(error, 'Nismo mogli da vratimo oglas.'),
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            data-testid="listing-actions"
            aria-label="Akcije oglasa"
            disabled={isPending}
          >
            <EllipsisVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger data-testid="listing-status-menu">Promeni status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={listing.status}
                onValueChange={(value) => changeStatus(value as ListingUiStatus)}
              >
                {LISTING_UI_STATUSES.map((status) => {
                  const enabled = listingStatusAction(listing.status, status) !== null
                  return (
                    <DropdownMenuRadioItem
                      key={status}
                      value={status}
                      disabled={!enabled}
                      data-testid={`listing-status-${status}`}
                    >
                      {LISTING_STATUS_LABELS[status]}
                    </DropdownMenuRadioItem>
                  )
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            data-testid="listing-delete"
            onClick={() => setDeleteOpen(true)}
          >
            Obriši
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obrisati oglas?</DialogTitle>
            <DialogDescription>
              Ovo se ne može poništiti. Recenzije i istorija rezervacija ostaju sačuvani.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Otkaži
            </Button>
            <Button
              type="button"
              variant="danger"
              data-testid="listing-delete-confirm"
              loading={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync(listing.id)
                  toast.success('Oglas je obrisan.')
                  setDeleteOpen(false)
                  onDeleted()
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Oglas se ne može obrisati.')
                }
              }}
            >
              Obriši oglas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function OwnerListingCard({
  listing,
  highlighted,
  onStatusChange,
  onDeleted,
}: {
  listing: OwnedListingSummary
  highlighted: boolean
  onStatusChange: (status: ListingStatus) => void
  onDeleted: () => void
}) {
  const badge = statusLabel(listing.status)
  const editHref = listingEditPath(listing.id)

  return (
    <article
      data-listing-id={listing.id}
      data-listing-status={listing.status}
      className={cn(
        'overflow-hidden rounded-lg bg-card shadow-sm transition-shadow',
        highlighted && 'ring-2 ring-brand-500'
      )}
    >
      <Link
        href={listingHref(listing)}
        className="group/card block no-underline transition-transform duration-150 hover:-translate-y-0.5"
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100">
          {listing.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.thumbnail_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-zinc-300">
              <ImageIcon className="size-7" strokeWidth={1.5} aria-hidden />
            </div>
          )}
          {badge ? (
            <span className="absolute top-1.5 left-1.5 rounded bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-0.5 p-2 pb-1.5">
          <h2 className="m-0 line-clamp-1 text-[13px] leading-snug font-semibold text-card-foreground">
            {listing.title}
          </h2>
          <p className="m-0 text-[11px] text-zinc-500">{listing.city || '\u00a0'}</p>
          <p className="mt-0.5 mb-0 text-[13px] font-bold text-card-foreground">
            {listing.price_1_day_minor > 0 ? formatPricePerDay(listing.price_1_day_minor) : '—'}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-2 pb-2">
        <Button size="sm" variant="secondary" className="h-8 flex-1 text-xs" asChild>
          <Link href={editHref} data-testid="listing-edit-link">
            Izmeni
          </Link>
        </Button>
        <OwnerListingActions listing={listing} onStatusChange={onStatusChange} onDeleted={onDeleted} />
      </div>
    </article>
  )
}

export function MyListings({
  listings: initialListings,
  highlightId,
}: {
  listings: OwnedListingSummary[]
  highlightId: string | null
}) {
  const [listings, setListings] = useState(initialListings)

  useEffect(() => {
    if (!highlightId) return
    document
      .querySelector(`[data-listing-id="${highlightId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId])

  return (
    <div className="flex flex-col gap-4">
      <ListingPublishedToast />
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <h1 className="m-0 text-[22px] font-normal text-foreground">Moji oglasi</h1>
        <Button size="sm" asChild>
          <Link href={LISTING_NEW_PATH}>Objavi predmet</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">Još nemaš oglasa.</p>
          <p className="mb-5 text-sm text-muted-foreground">
            Objavi predmet ili sačuvaj nacrt da bi se ovde pojavila kartica.
          </p>
          <Button asChild>
            <Link href={LISTING_NEW_PATH}>Objavi predmet</Link>
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {listings.map((listing) => (
            <OwnerListingCard
              key={listing.id}
              listing={listing}
              highlighted={listing.id === highlightId}
              onStatusChange={(status) => {
                setListings((current) =>
                  current.map((item) => (item.id === listing.id ? { ...item, status } : item))
                )
              }}
              onDeleted={() => {
                setListings((current) => current.filter((item) => item.id !== listing.id))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
