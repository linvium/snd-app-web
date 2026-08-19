import { OWNER_COMMISSION_RATE, RENTER_SERVICE_FEE_RATE } from '@/lib/pricing/pricing.config'

export type PackageKey = '1_day' | '3_days' | '7_days'

export interface PriceBreakdownEntry {
  package: PackageKey
  count: number
  amount_minor: number
}

export interface RentalPrice {
  rental_price_minor: number
  price_breakdown: PriceBreakdownEntry[]
}

export interface Quote extends RentalPrice {
  days_count: number
  service_fee_minor: number
  total_minor: number
  owner_payout_minor: number
}

export interface ListingPrices {
  price_1_day_minor: number
  price_3_days_minor: number | null
  price_7_days_minor: number | null
}

/** Round half up, on whole para (doc 00 §6.2). */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5)
}

/**
 * The cheapest combination of packages that covers `days` (doc 00 §6.1).
 *
 * The rule that shapes this: a package may overshoot the number of days when
 * that costs less. Two days on an 1000/1800 listing are charged as the
 * three-day package, because 1800 is less than 2000 — the platform never bills
 * more than it has to, even when the person asked for more.
 *
 * Undefined tiers do not disable the packages, they fall back to a synthetic
 * price, so the algorithm has a value for every step and a listing priced only
 * by the day still gets the right answer.
 */
export function calculateRentalPrice(days: number, prices: ListingPrices): RentalPrice {
  const dayCount = Math.max(1, Math.trunc(days))

  const c1 = prices.price_1_day_minor
  const c3 = prices.price_3_days_minor ?? c1 * 3
  const c7 = prices.price_7_days_minor ?? Math.min(c1 * 7, c3 * 3 + c1)

  const cheapest = new Array<number>(dayCount + 1).fill(Number.POSITIVE_INFINITY)
  // `from[d]` is the step that produced `cheapest[d]`, which is what turns the
  // total back into the itemised list the booking card prints.
  const from = new Array<{ prev: number; pkg: PackageKey; amount: number } | null>(
    dayCount + 1
  ).fill(null)
  cheapest[0] = 0

  const consider = (day: number, prev: number, pkg: PackageKey, amount: number) => {
    const candidate = cheapest[prev] + amount
    if (candidate < cheapest[day]) {
      cheapest[day] = candidate
      from[day] = { prev, pkg, amount }
    }
  }

  for (let d = 1; d <= dayCount; d += 1) {
    consider(d, d - 1, '1_day', c1)
    if (d >= 3) consider(d, d - 3, '3_days', c3)
    if (d >= 7) consider(d, d - 7, '7_days', c7)
    // A package that runs past the last day, when it is cheaper than filling
    // the remainder a day at a time.
    if (d < 3) consider(d, 0, '3_days', c3)
    if (d < 7) consider(d, 0, '7_days', c7)
  }

  const counts = new Map<PackageKey, { count: number; amount: number }>()
  let cursor = dayCount
  while (cursor > 0) {
    const step = from[cursor]
    if (!step) break
    const entry = counts.get(step.pkg) ?? { count: 0, amount: 0 }
    entry.count += 1
    entry.amount += step.amount
    counts.set(step.pkg, entry)
    cursor = step.prev
  }

  const order: PackageKey[] = ['7_days', '3_days', '1_day']
  const price_breakdown: PriceBreakdownEntry[] = order
    .filter((pkg) => counts.has(pkg))
    .map((pkg) => ({
      package: pkg,
      count: counts.get(pkg)!.count,
      amount_minor: counts.get(pkg)!.amount,
    }))

  return { rental_price_minor: cheapest[dayCount], price_breakdown }
}

/** Days are inclusive on both ends: 20.08 to 22.08 is three days (doc 00 §3.10). */
export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`)
  const end = Date.parse(`${endIso}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.round((end - start) / 86_400_000) + 1
}

/**
 * The full sum the booking card shows (doc 04 §13.2).
 *
 * Computed on the server and never in the browser: the price displayed has to
 * be the price charged, and a number the client can edit is neither.
 */
export function quoteForRange(
  startIso: string,
  endIso: string,
  prices: ListingPrices
): Quote {
  const days_count = daysBetweenInclusive(startIso, endIso)
  const { rental_price_minor, price_breakdown } = calculateRentalPrice(days_count, prices)

  const service_fee_minor = roundHalfUp(rental_price_minor * RENTER_SERVICE_FEE_RATE)
  const owner_payout_minor =
    rental_price_minor - roundHalfUp(rental_price_minor * OWNER_COMMISSION_RATE)

  return {
    days_count,
    rental_price_minor,
    price_breakdown,
    service_fee_minor,
    total_minor: rental_price_minor + service_fee_minor,
    owner_payout_minor,
  }
}
