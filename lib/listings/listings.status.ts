import type { ListingStatus } from '@/types/listing'

export const LISTING_UI_STATUSES = ['draft', 'published', 'paused'] as const
export type ListingUiStatus = (typeof LISTING_UI_STATUSES)[number]

export const LISTING_STATUS_LABELS: Record<ListingUiStatus, string> = {
  draft: 'Nacrt',
  published: 'Objavljen',
  paused: 'Arhiviran',
}

export type ListingStatusAction = 'publish' | 'pause' | 'resume' | 'unpublish'

export function listingStatusAction(
  current: ListingStatus,
  next: ListingUiStatus
): ListingStatusAction | null {
  if (current === next) return null
  if (next === 'published') {
    if (current === 'draft') return 'publish'
    if (current === 'paused') return 'resume'
    return null
  }
  if (next === 'paused' && current === 'published') return 'pause'
  if (next === 'draft' && (current === 'published' || current === 'paused')) return 'unpublish'
  return null
}

export function listingStatusAfterAction(action: ListingStatusAction): ListingUiStatus {
  if (action === 'publish' || action === 'resume') return 'published'
  if (action === 'pause') return 'paused'
  return 'draft'
}

export function listingStatusConfirm(action: ListingStatusAction): {
  title: string
  description: string
  confirmLabel: string
} {
  if (action === 'publish') {
    return {
      title: 'Objaviti oglas?',
      description: 'Oglas će biti vidljiv u pretrazi. Možeš ga kasnije arhivirati ili vratiti u nacrt.',
      confirmLabel: 'Objavi',
    }
  }
  if (action === 'pause') {
    return {
      title: 'Arhivirati oglas?',
      description: 'Oglas više neće biti vidljiv u pretrazi. Možeš ga kasnije vratiti.',
      confirmLabel: 'Arhiviraj',
    }
  }
  if (action === 'resume') {
    return {
      title: 'Ponovo objaviti oglas?',
      description: 'Oglas će opet biti vidljiv u pretrazi.',
      confirmLabel: 'Objavi',
    }
  }
  return {
    title: 'Vratiti oglas u nacrt?',
    description: 'Oglas više neće biti javan. Možeš ga kasnije ponovo objaviti.',
    confirmLabel: 'Vrati u nacrt',
  }
}
