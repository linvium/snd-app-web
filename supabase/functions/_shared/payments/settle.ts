import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { PaymentEvent } from './types.ts'

/**
 * The one way a payment becomes something an owner bought.
 *
 * Every caller - the Stripe webhook, another PSP's webhook, the sandbox confirm
 * button - lands here, so the rules about double payment, replaced plans and
 * renewals are stated once, in the database.
 */

const ERROR_STATUS: Record<string, number> = {
  VALIDATION_FAILED: 422,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EXPIRED: 410,
}

export interface SettleOutcome {
  ok: boolean
  status: number
  code: string
  data: unknown
}

export function mapRpcError(message: string): { status: number; code: string } {
  for (const [code, status] of Object.entries(ERROR_STATUS)) {
    if (message.includes(code)) return { status, code }
  }
  return { status: 500, code: 'INTERNAL' }
}

async function callRpc(
  admin: SupabaseClient,
  fn: string,
  args: Record<string, unknown>
): Promise<SettleOutcome> {
  const { data, error } = await admin.rpc(fn, args)

  if (error) {
    const mapped = mapRpcError(error.message ?? '')
    if (mapped.status === 500) console.error(`${fn}: rpc failed`, error)
    return { ok: false, status: mapped.status, code: mapped.code, data: null }
  }

  return { ok: true, status: 200, code: 'OK', data }
}

/** Delivers what an order bought: credits on the ledger, or a current plan. */
export async function settleOrder(
  admin: SupabaseClient,
  event: Pick<PaymentEvent, 'token' | 'providerReference' | 'subscriptionId' | 'periodEnd'>
): Promise<SettleOutcome> {
  const outcome = await callRpc(admin, 'snd_settle_billing_order', {
    p_token: event.token,
    p_provider_reference: event.providerReference,
    p_provider_subscription_id: event.subscriptionId,
    p_period_end: event.periodEnd ? event.periodEnd.toISOString() : null,
  })

  if (outcome.ok) await drainOutbox()
  return outcome
}

export function failOrder(
  admin: SupabaseClient,
  token: string,
  reason: string | null,
  providerReference: string | null
): Promise<SettleOutcome> {
  return callRpc(admin, 'snd_record_billing_failure', {
    p_token: token,
    p_reason: reason,
    p_provider_reference: providerReference,
  })
}

/** A later period was paid: move the plan's end date forward. */
export function renewSubscription(
  admin: SupabaseClient,
  event: Pick<PaymentEvent, 'subscriptionId' | 'periodEnd' | 'providerReference' | 'amountMinor'>
): Promise<SettleOutcome> {
  return callRpc(admin, 'snd_renew_subscription', {
    p_provider_subscription_id: event.subscriptionId,
    p_period_end: event.periodEnd ? event.periodEnd.toISOString() : null,
    p_provider_reference: event.providerReference,
    p_amount_minor: event.amountMinor,
  })
}

/** The provider stopped the subscription: end the plan and pause what no longer fits. */
export function endSubscription(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<SettleOutcome> {
  return callRpc(admin, 'snd_end_subscription', {
    p_provider_subscription_id: subscriptionId,
  })
}

/**
 * Kick the mail queue.
 *
 * The confirmation emails are already written by the settling transaction; this
 * only decides whether they leave now or on the next scheduled drain, which is
 * why nothing here is allowed to fail the settlement.
 */
export async function drainOutbox(): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return

  try {
    await fetch(`${url}/functions/v1/send-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  } catch (error) {
    console.error('drainOutbox: failed', error)
  }
}
