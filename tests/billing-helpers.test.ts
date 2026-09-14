import { describe, expect, it } from 'vitest'

import {
  creditPackSavingsPercent,
  creditTransactionLabel,
  creditUnitPriceMinor,
  formatBillingDate,
  formatCreditCount,
  formatCreditDelta,
  formatListingCount,
  isCreditLadderValid,
  isListingLimitDbError,
  parseBillingOrderInput,
  planPricePerListingMinor,
  publishEntitlement,
  publishEntitlementCopy,
  slotUsage,
  subscriptionRenewalCopy,
} from '@/lib/billing/billing.helpers'
import type { ActiveSubscription, BillingSummary, CreditPack } from '@/types/billing'

// The packs the billing migration seeds.
const PACKS: CreditPack[] = [
  { key: 'single', name: '1 kredit', credits: 1, price_minor: 15000, currency: 'RSD', sort_order: 1 },
  { key: 'pack_10', name: '10 kredita', credits: 10, price_minor: 120000, currency: 'RSD', sort_order: 2 },
  { key: 'pack_25', name: '25 kredita', credits: 25, price_minor: 250000, currency: 'RSD', sort_order: 3 },
  { key: 'pack_50', name: '50 kredita', credits: 50, price_minor: 400000, currency: 'RSD', sort_order: 4 },
]

const SUBSCRIPTION: ActiveSubscription = {
  id: 's1',
  plan_key: 'starter',
  plan_name: 'Start',
  listing_limit: 5,
  price_minor: 49000,
  currency: 'RSD',
  current_period_start: '2026-09-14T10:00:00.000Z',
  current_period_end: '2026-10-14T10:00:00.000Z',
  cancel_at_period_end: false,
  provider: 'stripe',
}

function summary(overrides: Partial<BillingSummary> = {}): BillingSummary {
  return {
    subscription: null,
    slots_used: 0,
    credit_balance: 0,
    unlocked_listings: 0,
    transactions: [],
    ...overrides,
  }
}

describe('credit packs', () => {
  it('prices one credit in each pack', () => {
    expect(PACKS.map(creditUnitPriceMinor)).toEqual([15000, 12000, 10000, 8000])
  })

  it('makes a bigger pack cheaper per credit - 50 credits beat 10', () => {
    const ten = PACKS.find((pack) => pack.credits === 10)!
    const fifty = PACKS.find((pack) => pack.credits === 50)!
    expect(creditUnitPriceMinor(fifty)).toBeLessThan(creditUnitPriceMinor(ten))
    expect(isCreditLadderValid(PACKS)).toBe(true)
  })

  it('shows the saving against a single credit, and none on the single credit itself', () => {
    expect(PACKS.map((pack) => creditPackSavingsPercent(pack, PACKS))).toEqual([null, 20, 33, 47])
  })

  it('rejects a price list where a bigger pack is not cheaper per credit', () => {
    const broken = PACKS.map((pack) =>
      pack.credits === 50 ? { ...pack, price_minor: 600000 } : pack
    )
    expect(isCreditLadderValid(broken)).toBe(false)
    expect(creditPackSavingsPercent(broken[3], broken)).toBe(20)
  })

  it('does not care which order the packs arrive in', () => {
    expect(isCreditLadderValid([...PACKS].reverse())).toBe(true)
  })
})

describe('planPricePerListingMinor', () => {
  it('spreads the monthly price over the listing limit, in whole dinars', () => {
    expect(planPricePerListingMinor({ price_minor: 49000, listing_limit: 5 })).toBe(9800)
    expect(planPricePerListingMinor({ price_minor: 129000, listing_limit: 20 })).toBe(6500)
    expect(planPricePerListingMinor({ price_minor: 299000, listing_limit: 60 })).toBe(5000)
  })
})

describe('publishEntitlement', () => {
  it('uses a free plan slot first', () => {
    const entitlement = publishEntitlement(
      summary({ subscription: SUBSCRIPTION, slots_used: 2, credit_balance: 4 })
    )
    expect(entitlement).toEqual({ kind: 'slot', used: 2, limit: 5 })
    expect(publishEntitlementCopy(entitlement)).toBe('Oglas zauzima mesto iz pretplate: 3 od 5.')
  })

  it('falls back to a credit once the plan is full', () => {
    const entitlement = publishEntitlement(
      summary({ subscription: SUBSCRIPTION, slots_used: 5, credit_balance: 4 })
    )
    expect(entitlement).toEqual({ kind: 'credit', balance: 4 })
    expect(publishEntitlementCopy(entitlement)).toBe(
      'Objava troši 1 kredit. Posle objave ostaje ti 3 kredita.'
    )
  })

  it('spends a credit without any plan at all', () => {
    expect(publishEntitlement(summary({ credit_balance: 1 }))).toEqual({ kind: 'credit', balance: 1 })
  })

  it('has nothing to publish with when the plan is full and there are no credits', () => {
    const entitlement = publishEntitlement(summary({ subscription: SUBSCRIPTION, slots_used: 5 }))
    expect(entitlement).toEqual({ kind: 'none' })
    expect(publishEntitlementCopy(entitlement)).toMatch(/Izaberi paket/)
    expect(publishEntitlement(summary())).toEqual({ kind: 'none' })
  })
})

describe('slotUsage', () => {
  it('is empty without a plan', () => {
    expect(slotUsage(summary())).toBeNull()
  })

  it('reports used, remaining and a capped percentage', () => {
    expect(slotUsage(summary({ subscription: SUBSCRIPTION, slots_used: 2 }))).toEqual({
      used: 2,
      limit: 5,
      remaining: 3,
      percent: 40,
    })
    // Legacy listings can leave usage above a newly bought limit.
    expect(slotUsage(summary({ subscription: SUBSCRIPTION, slots_used: 7 }))).toEqual({
      used: 7,
      limit: 5,
      remaining: 0,
      percent: 100,
    })
  })
})

describe('Serbian counts', () => {
  it('agrees for credits', () => {
    expect(formatCreditCount(1)).toBe('1 kredit')
    expect(formatCreditCount(2)).toBe('2 kredita')
    expect(formatCreditCount(5)).toBe('5 kredita')
    expect(formatCreditCount(11)).toBe('11 kredita')
    expect(formatCreditCount(21)).toBe('21 kredit')
    expect(formatCreditCount(0)).toBe('0 kredita')
  })

  it('agrees for listings', () => {
    expect(formatListingCount(1)).toBe('1 oglas')
    expect(formatListingCount(5)).toBe('5 oglasa')
    expect(formatListingCount(20)).toBe('20 oglasa')
    expect(formatListingCount(61)).toBe('61 oglas')
  })
})

describe('parseBillingOrderInput', () => {
  it('accepts a plan or a credit pack by key', () => {
    expect(parseBillingOrderInput({ kind: 'subscription', itemKey: 'standard' })).toEqual({
      kind: 'subscription',
      itemKey: 'standard',
    })
    expect(parseBillingOrderInput({ kind: 'credits', itemKey: 'pack_50' })).toEqual({
      kind: 'credits',
      itemKey: 'pack_50',
    })
  })

  it('refuses anything else, including an amount the client made up', () => {
    expect(parseBillingOrderInput(null)).toBeNull()
    expect(parseBillingOrderInput({ kind: 'booking', itemKey: 'standard' })).toBeNull()
    expect(parseBillingOrderInput({ kind: 'credits' })).toBeNull()
    expect(parseBillingOrderInput({ kind: 'credits', itemKey: "pack'; drop" })).toBeNull()
    expect(parseBillingOrderInput({ kind: 'credits', itemKey: 'pack_10', amount: 1 })).toEqual({
      kind: 'credits',
      itemKey: 'pack_10',
    })
  })
})

describe('isListingLimitDbError', () => {
  it('recognises the trigger refusing a publish', () => {
    expect(isListingLimitDbError({ message: 'LISTING_LIMIT_REACHED' })).toBe(true)
    expect(isListingLimitDbError({ message: 'duplicate key value' })).toBe(false)
    expect(isListingLimitDbError(null)).toBe(false)
  })
})

describe('dates and history', () => {
  it('formats a billing date the same in every time zone', () => {
    expect(formatBillingDate('2026-10-14T10:00:00.000Z')).toBe('14.10.2026.')
    expect(formatBillingDate(null)).toBeNull()
    expect(formatBillingDate('nije-datum')).toBeNull()
  })

  it('says whether the plan renews or runs out', () => {
    expect(subscriptionRenewalCopy(SUBSCRIPTION)).toBe('Obnavlja se 14.10.2026.')
    expect(subscriptionRenewalCopy({ ...SUBSCRIPTION, cancel_at_period_end: true })).toBe(
      'Otkazana - važi do 14.10.2026.'
    )
  })

  it('labels each kind of credit movement', () => {
    expect(creditTransactionLabel({ reason: 'purchase', listing_title: null })).toBe('Kupljeni krediti')
    expect(creditTransactionLabel({ reason: 'listing_unlock', listing_title: 'Bušilica' })).toBe(
      'Objava: Bušilica'
    )
    expect(creditTransactionLabel({ reason: 'listing_unlock', listing_title: null })).toBe('Objava oglasa')
    expect(formatCreditDelta(10)).toBe('+10')
    expect(formatCreditDelta(-1)).toBe('-1')
  })
})
