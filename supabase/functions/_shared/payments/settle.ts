import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

/**
 * The one way a payment becomes a reservation.
 *
 * Every caller - the Stripe webhook, another PSP's webhook, the sandbox confirm
 * button - lands here, so the rules about double payment, expiry and which
 * booking states may be settled are stated once, in the database.
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

export async function settlePayment(
  admin: SupabaseClient,
  token: string,
  providerReference: string | null
): Promise<SettleOutcome> {
  const { data, error } = await admin.rpc('snd_confirm_booking_payment', {
    p_token: token,
    p_provider_reference: providerReference,
  })

  if (error) {
    const mapped = mapRpcError(error.message ?? '')
    if (mapped.status === 500) console.error('settlePayment: rpc failed', error)
    return { ok: false, status: mapped.status, code: mapped.code, data: null }
  }

  await drainOutbox()
  return { ok: true, status: 200, code: 'OK', data }
}

export async function failPayment(
  admin: SupabaseClient,
  token: string,
  reason: string | null,
  providerReference: string | null
): Promise<SettleOutcome> {
  const { data, error } = await admin.rpc('snd_record_payment_failure', {
    p_token: token,
    p_reason: reason,
    p_provider_reference: providerReference,
  })

  if (error) {
    const mapped = mapRpcError(error.message ?? '')
    if (mapped.status === 500) console.error('failPayment: rpc failed', error)
    return { ok: false, status: mapped.status, code: mapped.code, data: null }
  }

  return { ok: true, status: 200, code: 'OK', data }
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
