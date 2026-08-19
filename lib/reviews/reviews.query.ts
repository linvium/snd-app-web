import type { ReviewScope } from '@/types/listing-detail'

export const reviewKeys = {
  all: ['reviews'] as const,
  list: (listingId: string, scope: ReviewScope) =>
    [...reviewKeys.all, 'list', listingId, scope] as const,
}
