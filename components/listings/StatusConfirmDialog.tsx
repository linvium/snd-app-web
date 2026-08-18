'use client'

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
  listingStatusConfirm,
  type ListingStatusAction,
} from '@/lib/listings/listings.status'

export function StatusConfirmDialog({
  action,
  open,
  loading,
  onOpenChange,
  onConfirm,
}: {
  action: ListingStatusAction | null
  open: boolean
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const copy = action ? listingStatusConfirm(action) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy?.title ?? 'Promeniti status?'}</DialogTitle>
          <DialogDescription>{copy?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Otkaži
          </Button>
          <Button
            type="button"
            data-testid="status-confirm-button"
            loading={loading}
            className="bg-brand-500 hover:bg-brand-600"
            onClick={onConfirm}
          >
            {copy?.confirmLabel ?? 'Potvrdi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
