import { toast } from 'sonner'

import { LISTING_LIMIT_REACHED, PRICING_PATH } from '@/lib/billing'
import { ApiError } from '@/lib/search/search.service'

/** The API refused a publish because the owner has no free plan slot and no credit. */
export function isListingLimitError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === LISTING_LIMIT_REACHED
}

/**
 * Says why the listing did not go live and offers the way out.
 *
 * One toast id, so a double click on "Objavi" does not stack two of them.
 */
export function notifyListingLimit(error: ApiError, navigate: (href: string) => void): void {
  toast.error(error.message, {
    id: 'listing-limit',
    action: {
      label: 'Pogledaj pakete',
      onClick: () => navigate(PRICING_PATH),
    },
  })
}
