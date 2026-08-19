import type { ListingPrices } from '@/lib/pricing'
import type { CategoryNode, DetailImage, ListingPriceTier, OwnerSummary } from '@/types/listing-detail'

/**
 * Display rules for the item page (doc 04 §4, §5, §7, §10).
 *
 * Kept apart from the loader so each rule can be tested on its own — most of
 * them are conditions about when *not* to show something, which is exactly the
 * kind of logic that rots silently inside a component.
 */

/** "4,8" — Serbian decimal comma (doc 04 §4). */
export function formatRating(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return value.toFixed(1).replace('.', ',')
}

/** "12 ocena" / "1 ocena" / "2 ocene" — Serbian plural agreement. */
export function pluralizeRatings(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} ocena`
  if (last === 1) return `${count} ocena`
  if (last >= 2 && last <= 4) return `${count} ocene`
  return `${count} ocena`
}

export function pluralizeReviews(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} recenzija`
  if (last === 1) return `${count} recenzija`
  if (last >= 2 && last <= 4) return `${count} recenzije`
  return `${count} recenzija`
}

/**
 * The price table (doc 04 §7).
 *
 * A tier appears only if it has a price; the per-day figure rounds down so the
 * headline never promises a rate the package does not actually deliver. The
 * saving is measured against the same days bought singly, which is the
 * comparison the number is implicitly making.
 */
export function buildPriceTiers(prices: ListingPrices): ListingPriceTier[] {
  const rows: { days: number; label: string; minor: number | null }[] = [
    { days: 1, label: '1 dan', minor: prices.price_1_day_minor },
    { days: 3, label: '3 dana', minor: prices.price_3_days_minor },
    { days: 7, label: '7 dana', minor: prices.price_7_days_minor },
  ]

  return rows
    .filter((row): row is { days: number; label: string; minor: number } => row.minor != null)
    .map((row) => {
      const singleDayCost = prices.price_1_day_minor * row.days
      const savingPercent =
        row.days > 1 && singleDayCost > 0 && row.minor < singleDayCost
          ? Math.round(((singleDayCost - row.minor) / singleDayCost) * 100)
          : 0

      return {
        days: row.days,
        label: row.label,
        amount_minor: row.minor,
        per_day_minor: Math.floor(row.minor / row.days),
        saving_percent: savingPercent > 0 ? savingPercent : null,
      }
    })
}

/** Doc 04 §5: metrics stay hidden below five conversations in the window. */
export const MIN_CONVERSATIONS_FOR_METRICS = 5

export function canShowResponseMetrics(owner: Pick<OwnerSummary, 'conversation_count'>): boolean {
  return owner.conversation_count >= MIN_CONVERSATIONS_FOR_METRICS
}

/**
 * Response speed in words (doc 04 §5).
 *
 * The bands get vaguer as the number grows, which is honest: the difference
 * between 200 and 900 minutes is not something a renter can plan around, so
 * both are "istog dana".
 */
export function responseTimeText(
  owner: Pick<OwnerSummary, 'avg_response_minutes' | 'conversation_count'>
): string | null {
  const minutes = owner.avg_response_minutes
  if (minutes === null || minutes === undefined || !canShowResponseMetrics(owner)) return null

  if (minutes < 60) return `Odgovara za ${Math.max(1, Math.round(minutes))} min`
  if (minutes < 180) return `Odgovara za oko ${Math.round(minutes / 60)} sata`
  if (minutes <= 1440) return 'Odgovara istog dana'
  return 'Odgovara u roku od par dana'
}

export function responseRateText(
  owner: Pick<OwnerSummary, 'response_rate' | 'conversation_count'>
): string | null {
  const rate = owner.response_rate
  if (rate === null || rate === undefined || !canShowResponseMetrics(owner)) return null
  return `Odgovara na ${Math.round(rate)}% poruka`
}

/**
 * Guarantee cover (doc 04 §10): the category's cap, cut down to the item's own
 * value when the item is worth less — the guarantee replaces a thing, it does
 * not pay out above it.
 */
export function guaranteeCapMinor(
  categoryCapMinor: number | null | undefined,
  itemValueMinor: number | null | undefined
): number | null {
  if (categoryCapMinor == null) return itemValueMinor ?? null
  if (itemValueMinor == null) return categoryCapMinor
  return Math.min(categoryCapMinor, itemValueMinor)
}

/**
 * Walks a category up to its root to build the breadcrumb (doc 04 §4).
 *
 * Returned root-first, which is the reading order. A cycle in `parent_id` would
 * otherwise spin forever, so the walk stops on any id it has already seen.
 */
export function buildBreadcrumb(
  categoryId: string | null,
  byId: ReadonlyMap<string, CategoryNode>
): CategoryNode[] {
  const trail: CategoryNode[] = []
  const seen = new Set<string>()

  let current = categoryId ? byId.get(categoryId) : undefined
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    trail.unshift(current)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }

  return trail
}

/** The nearest ancestor that sets a guarantee cap, so leaves need not repeat it. */
export function inheritedGuaranteeCap(trail: readonly CategoryNode[]): number | null {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const cap = trail[index].guarantee_cap_minor
    if (cap != null) return cap
  }
  return null
}

/** "mart 2025." for the owner card (doc 04 §5). */
export function formatMonthYear(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  try {
    const formatted = new Intl.DateTimeFormat('sr-Latn-RS', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
    // The Serbian locale already ends this with a full stop, so appending one
    // unconditionally produces "avgust 2026..".
    return formatted.endsWith('.') ? formatted : `${formatted}.`
  } catch {
    return null
  }
}

/**
 * "Zvezdara, Beograd" — but just "Beograd" when the municipality is the city
 * (doc 04 §4).
 *
 * City-level locations store the same name in both fields, and printing it
 * twice reads as a bug in the listing rather than as precision.
 */
export function placeLabel(
  municipality: string | null | undefined,
  city: string | null | undefined
): string {
  const parts = [municipality, city]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  const unique = parts.filter(
    (part, index) => parts.findIndex((other) => other.localeCompare(part, 'sr') === 0) === index
  )

  return unique.join(', ')
}

/**
 * `listing_images` no longer stores pixel size (dropped in
 * `20260818110000_listing_images_drop_width_height`). Selecting those columns
 * makes PostgREST reject the whole query, so the gallery renders empty.
 */
export function toDetailImages(
  rows:
    | readonly {
        id: unknown
        thumbnail_url: unknown
        medium_url: unknown
        large_url: unknown
        sort_order: unknown
      }[]
    | null
): DetailImage[] {
  return (rows ?? []).map((image) => ({
    id: image.id as string,
    thumbnail_url: image.thumbnail_url as string,
    medium_url: image.medium_url as string,
    large_url: image.large_url as string,
    sort_order: Number(image.sort_order),
  }))
}
