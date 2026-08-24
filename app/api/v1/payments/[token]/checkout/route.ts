import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { startPaymentCheckout } from '@/lib/bookings/bookings.server'

const TOKEN_RE = /^[0-9a-f]{24,64}$/i

/**
 * Opens the provider checkout for a link.
 *
 * Signing in is required here even though the link itself is readable with the
 * token alone: seeing what is owed is not the same as putting a charge in
 * motion, and the edge function checks that the caller is the renter.
 */
export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!TOKEN_RE.test(token)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Link za plaćanje ne postoji.')
  }

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await startPaymentCheckout(auth.supabase, token)
  if ('response' in result) return result.response
  return apiOk(result)
}
