import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { BILLING_TOKEN_RE } from '@/lib/billing/billing.helpers'
import { confirmBillingOrder } from '@/lib/billing/billing.server'

/**
 * Marks the caller's own order as paid.
 *
 * The sandbox path only: the edge function honours it when
 * PAYMENT_MANUAL_CONFIRM is on and checks that the caller placed the order.
 * Real payments settle through the provider's signed webhook and never pass
 * through here.
 */
export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!BILLING_TOKEN_RE.test(token)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Porudžbina ne postoji.')
  }

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await confirmBillingOrder(auth.supabase, token)
  if ('response' in result) return result.response
  return apiOk(result)
}
