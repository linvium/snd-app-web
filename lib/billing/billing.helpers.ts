import type {
  ActiveSubscription,
  BillingPlan,
  BillingSummary,
  CreateBillingOrderInput,
  CreditPack,
  CreditTransaction,
} from '@/types/billing'

/** The public price list, and the manager page where an owner handles what they bought. */
export const PRICING_PATH = '/pricing'
export const BILLING_PATH = '/profile/billing'

/** What the database raises, and the API answers with, when a publish is not covered. */
export const LISTING_LIMIT_REACHED = 'LISTING_LIMIT_REACHED'

export const LISTING_LIMIT_MESSAGE =
  'Nemaš slobodno mesto za još jedan objavljen oglas. Izaberi pretplatu ili kupi kredite.'

/** Order tokens are hex, like every other token the database mints. */
export const BILLING_TOKEN_RE = /^[0-9a-f]{24,64}$/i

/** The trigger on `listings` refused the status change; anything else is a real failure. */
export function isListingLimitDbError(error: { message?: string } | null | undefined): boolean {
  return Boolean(error?.message?.includes(LISTING_LIMIT_REACHED))
}

/** A purchase request as the API accepts it, or null for anything else. */
export function parseBillingOrderInput(body: unknown): CreateBillingOrderInput | null {
  if (!body || typeof body !== 'object') return null
  const { kind, itemKey } = body as { kind?: unknown; itemKey?: unknown }
  if (kind !== 'subscription' && kind !== 'credits') return null
  if (typeof itemKey !== 'string' || !/^[a-z0-9_]{1,32}$/.test(itemKey)) return null
  return { kind, itemKey }
}

function serbianCount(count: number, one: string, other: string): string {
  const lastTwo = Math.abs(count) % 100
  const last = Math.abs(count) % 10
  return last === 1 && lastTwo !== 11 ? `${count} ${one}` : `${count} ${other}`
}

/** "1 kredit", "4 kredita", "21 kredit". */
export function formatCreditCount(count: number): string {
  return serbianCount(count, 'kredit', 'kredita')
}

/** "1 oglas", "5 oglasa", "21 oglas". */
export function formatListingCount(count: number): string {
  return serbianCount(count, 'oglas', 'oglasa')
}

/** What one credit costs in a pack, in para. */
export function creditUnitPriceMinor(pack: Pick<CreditPack, 'credits' | 'price_minor'>): number {
  return Math.round(pack.price_minor / pack.credits)
}

/**
 * How much cheaper a credit is in this pack than bought singly. The smallest
 * pack is the reference, so it never advertises a saving of its own.
 */
export function creditPackSavingsPercent(
  pack: Pick<CreditPack, 'credits' | 'price_minor'>,
  packs: readonly Pick<CreditPack, 'credits' | 'price_minor'>[]
): number | null {
  const smallest = [...packs].sort((a, b) => a.credits - b.credits)[0]
  if (!smallest || smallest.credits === pack.credits) return null

  const base = smallest.price_minor / smallest.credits
  const unit = pack.price_minor / pack.credits
  if (unit >= base) return null
  return Math.round((1 - unit / base) * 100)
}

/**
 * Every bigger pack costs less per credit than every smaller one. The database
 * enforces the same rule on write; this is how the UI and tests state it.
 */
export function isCreditLadderValid(
  packs: readonly Pick<CreditPack, 'credits' | 'price_minor'>[]
): boolean {
  const sorted = [...packs].sort((a, b) => a.credits - b.credits)
  return sorted.every(
    (pack, index) =>
      index === 0 ||
      pack.price_minor / pack.credits < sorted[index - 1].price_minor / sorted[index - 1].credits
  )
}

/** What one live listing costs a month on a plan, rounded to whole dinars. */
export function planPricePerListingMinor(
  plan: Pick<BillingPlan, 'price_minor' | 'listing_limit'>
): number {
  return Math.round(plan.price_minor / plan.listing_limit / 100) * 100
}

export type PublishEntitlement =
  | { kind: 'slot'; used: number; limit: number }
  | { kind: 'credit'; balance: number }
  | { kind: 'none' }

/**
 * What publishing one more listing will use, in the order the database decides
 * it: a free plan slot first, then a credit, otherwise nothing.
 */
export function publishEntitlement(
  summary: Pick<BillingSummary, 'subscription' | 'slots_used' | 'credit_balance'>
): PublishEntitlement {
  const limit = summary.subscription?.listing_limit ?? null
  if (limit != null && summary.slots_used < limit) {
    return { kind: 'slot', used: summary.slots_used, limit }
  }
  if (summary.credit_balance >= 1) {
    return { kind: 'credit', balance: summary.credit_balance }
  }
  return { kind: 'none' }
}

export function publishEntitlementCopy(entitlement: PublishEntitlement): string {
  switch (entitlement.kind) {
    case 'slot':
      return `Oglas zauzima mesto iz pretplate: ${entitlement.used + 1} od ${entitlement.limit}.`
    case 'credit':
      return `Objava troši 1 kredit. Posle objave ostaje ti ${formatCreditCount(entitlement.balance - 1)}.`
    default:
      return 'Nemaš slobodno mesto u pretplati ni kredite. Izaberi paket da bi oglas mogao da bude objavljen.'
  }
}

export interface SlotUsage {
  used: number
  limit: number
  remaining: number
  percent: number
}

export function slotUsage(
  summary: Pick<BillingSummary, 'subscription' | 'slots_used'>
): SlotUsage | null {
  const limit = summary.subscription?.listing_limit
  if (!limit) return null
  const used = summary.slots_used
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percent: Math.min(100, Math.round((used / limit) * 100)),
  }
}

/** "14.10.2026." - read in UTC so a date never shifts with the reader's time zone. */
export function formatBillingDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}.`
}

export function subscriptionRenewalCopy(
  subscription: Pick<ActiveSubscription, 'current_period_end' | 'cancel_at_period_end'>
): string {
  const date = formatBillingDate(subscription.current_period_end) ?? ''
  return subscription.cancel_at_period_end ? `Otkazana - važi do ${date}` : `Obnavlja se ${date}`
}

export function creditTransactionLabel(
  transaction: Pick<CreditTransaction, 'reason' | 'listing_title'>
): string {
  switch (transaction.reason) {
    case 'purchase':
      return 'Kupljeni krediti'
    case 'listing_unlock':
      return transaction.listing_title ? `Objava: ${transaction.listing_title}` : 'Objava oglasa'
    case 'grant':
      return 'Dodeljeni krediti'
    default:
      return 'Ispravka stanja'
  }
}

export function formatCreditDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta)
}
