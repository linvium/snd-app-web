import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { MANUAL_BILLING_CONFIRM } from '@/lib/billing/billing.config'
import { parseBillingOrderInput } from '@/lib/billing/billing.helpers'
import { createBillingCheckout } from '@/lib/billing/billing.server'

/**
 * Starts buying a subscription plan or a credit pack.
 *
 * Answers with where to send the owner next: the provider's hosted checkout,
 * or - in sandbox mode - back to the billing page to confirm by hand.
 */
export async function POST(request: Request) {
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const input = parseBillingOrderInput(body)
  if (!input) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Izaberi paket.')
  }

  const result = await createBillingCheckout(auth.supabase, input, {
    manualConfirm: MANUAL_BILLING_CONFIRM,
  })
  if ('response' in result) return result.response
  return apiOk(result, 201)
}
