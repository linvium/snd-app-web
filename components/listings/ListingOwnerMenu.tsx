'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EllipsisIcon } from 'lucide-react'
import { toast } from 'sonner'

import { StatusConfirmDialog } from '@/components/listings/StatusConfirmDialog'
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
import { listingEditPath } from '@/lib/listings'
import {
  LISTING_STATUS_LABELS,
  LISTING_UI_STATUSES,
  listingStatusAction,
  listingStatusAfterAction,
  type ListingStatusAction,
  type ListingUiStatus,
} from '@/lib/listings/listings.status'
import { searchKeys } from '@/lib/search'
import { ApiError } from '@/lib/search/search.service'
import { cn } from '@/lib/utils'
import type { ListingStatus } from '@/types/listing'
import { useQueryClient } from '@tanstack/react-query'

interface ListingOwnerMenuProps {
  listingId: string
  status: ListingStatus
  onStatusChange?: (status: ListingStatus) => void
  onDeleted?: () => void
}

export default function ListingOwnerMenu({
  listingId,
  status,
  onStatusChange,
  onDeleted,
}: ListingOwnerMenuProps) {
  const queryClient = useQueryClient()
  const publish = usePublishListing()
  const pause = usePauseListing()
  const resume = useResumeListing()
  const unpublish = useUnpublishListing()
  const remove = useDeleteListing()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<ListingStatusAction | null>(null)
  const isPending = publish.isPending || pause.isPending || resume.isPending || unpublish.isPending

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: searchKeys.all })
  }

  const requestStatusChange = (next: ListingUiStatus) => {
    const action = listingStatusAction(status, next)
    if (!action || isPending) return
    setPendingAction(action)
  }

  const confirmStatusChange = () => {
    const action = pendingAction
    if (!action || isPending) return
    const previous = status
    const next = listingStatusAfterAction(action)
    onStatusChange?.(next)
    setPendingAction(null)

    const rollback = (error: unknown, fallback: string) => {
      onStatusChange?.(previous)
      toast.error(error instanceof Error ? error.message : fallback)
    }

    if (action === 'publish') {
      publish.mutate(listingId, {
        onSuccess: () => {
          invalidateLists()
          toast.success('Oglas je objavljen.')
        },
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Nismo mogli da objavimo oglas. Otvori ga i dopuni polja.'
          onStatusChange?.(previous)
          toast.error(message)
        },
      })
      return
    }

    if (action === 'pause') {
      pause.mutate(listingId, {
        onSuccess: () => {
          invalidateLists()
          toast.success('Oglas je arhiviran.')
        },
        onError: (error) => rollback(error, 'Nismo mogli da arhiviramo oglas.'),
      })
      return
    }

    if (action === 'unpublish') {
      unpublish.mutate(listingId, {
        onSuccess: () => {
          invalidateLists()
          toast.success('Oglas je vraćen u nacrt.')
        },
        onError: (error) => rollback(error, 'Nismo mogli da vratimo oglas u nacrt.'),
      })
      return
    }

    resume.mutate(listingId, {
      onSuccess: () => {
        invalidateLists()
        toast.success('Oglas je ponovo aktivan.')
      },
      onError: (error) => rollback(error, 'Nismo mogli da vratimo oglas.'),
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="listing-actions"
            aria-label="Akcije oglasa"
            disabled={isPending}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              'absolute top-2.5 right-2.5 grid size-7 cursor-pointer place-items-center rounded-full',
              'border border-dotted border-zinc-500 bg-white/95 text-zinc-700 shadow-sm',
              'hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
              'disabled:opacity-50'
            )}
          >
            <EllipsisIcon className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem asChild>
            <Link href={listingEditPath(listingId)} data-testid="listing-edit-link">
              Izmeni
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger data-testid="listing-status-menu">Promeni status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={status}
                onValueChange={(value) => requestStatusChange(value as ListingUiStatus)}
              >
                {LISTING_UI_STATUSES.map((item) => {
                  const enabled = listingStatusAction(status, item) !== null
                  return (
                    <DropdownMenuRadioItem
                      key={item}
                      value={item}
                      disabled={!enabled}
                      data-testid={`listing-status-${item}`}
                    >
                      {LISTING_STATUS_LABELS[item]}
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
            onSelect={() => setDeleteOpen(true)}
          >
            Obriši
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StatusConfirmDialog
        action={pendingAction}
        open={pendingAction !== null}
        loading={isPending}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
        onConfirm={confirmStatusChange}
      />

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
                  await remove.mutateAsync(listingId)
                  toast.success('Oglas je obrisan.')
                  setDeleteOpen(false)
                  invalidateLists()
                  onDeleted?.()
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
