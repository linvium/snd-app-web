import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { BILLING_TOKEN_RE } from '@/lib/billing/billing.helpers'
import { getBillingOrder } from '@/lib/billing/billing.server'

/** One of the caller's own orders, for the page they come back to after checkout. */
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!BILLING_TOKEN_RE.test(token)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Porudžbina ne postoji.')
  }

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await getBillingOrder(auth.supabase, token)
  if (result === null) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Porudžbina ne postoji.')
  }
  if ('response' in result) return result.response
  return apiOk(result)
}
