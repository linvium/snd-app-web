/**
 * What SND charges for: listing, by subscription plan or by credit.
 *
 * Renting is free on the platform - the renter pays the owner directly - so
 * nothing here is about a booking. A plan caps how many listings may be
 * published at the same time; a credit publishes one listing and unlocks it
 * for good.
 */

export type BillingOrderKind = 'subscription' | 'credits'

export type BillingOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'

export type CreditTransactionReason = 'purchase' | 'listing_unlock' | 'grant' | 'adjustment'

export interface BillingPlan {
  key: string
  name: string
  description: string | null
  /** How many listings may be published at once while the plan is current. */
  listing_limit: number
  price_minor: number
  currency: string
  interval_months: number
  sort_order: number
}

export interface CreditPack {
  key: string
  name: string
  credits: number
  price_minor: number
  currency: string
  sort_order: number
}

export interface BillingCatalog {
  plans: BillingPlan[]
  packs: CreditPack[]
}

export interface ActiveSubscription {
  id: string
  plan_key: string
  plan_name: string
  listing_limit: number
  price_minor: number
  currency: string
  current_period_start: string
  current_period_end: string
  /** True once the owner cancelled: the plan works until the period ends, then stops. */
  cancel_at_period_end: boolean
  provider: string | null
}

export interface CreditTransaction {
  id: string
  delta: number
  reason: CreditTransactionReason
  listing_title: string | null
  created_at: string
}

export interface BillingSummary {
  subscription: ActiveSubscription | null
  /** Published listings occupying a plan slot (credit-unlocked ones do not). */
  slots_used: number
  credit_balance: number
  /** Listings a credit was spent on, or that were live before billing existed. */
  unlocked_listings: number
  transactions: CreditTransaction[]
}

export interface BillingOrder {
  token: string
  kind: BillingOrderKind
  status: BillingOrderStatus
  amount_minor: number
  currency: string
  credits: number | null
  item_name: string | null
  plan: { key: string; name: string; listing_limit: number } | null
  provider: string
  last_error: string | null
  expires_at: string
  paid_at: string | null
  created_at: string
}

export interface CreateBillingOrderInput {
  kind: BillingOrderKind
  itemKey: string
}

export interface BillingCheckoutResponse {
  token: string
  /** Where to send the owner: the provider's hosted page, or back to billing in sandbox. */
  url: string
  provider: string
}

export interface ConfirmBillingOrderResponse {
  token: string
  alreadyPaid: boolean
}

export interface CancelSubscriptionResponse {
  currentPeriodEnd: string | null
}
