import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { confirmPayment } from '@/lib/bookings/bookings.server'

const TOKEN_RE = /^[0-9a-f]{24,64}$/i

/**
 * Confirms a payment on the renter's behalf.
 *
 * This is the sandbox path while no provider is wired: the edge function only
 * honours it when PAYMENT_MANUAL_CONFIRM is on, and checks that the caller is
 * the renter who owes the money. The real confirmation arrives at the same
 * edge function as a signed provider webhook, without passing through here.
 */
export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!TOKEN_RE.test(token)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Link za plaćanje ne postoji.')
  }

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await confirmPayment(auth.supabase, token)
  if ('response' in result) return result.response
  return apiOk(result)
}
