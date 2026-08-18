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
