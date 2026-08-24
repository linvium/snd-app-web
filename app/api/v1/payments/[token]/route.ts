import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { getPaymentLinkSummary } from '@/lib/bookings/bookings.server'
import { createClient } from '@/lib/supabase/server'

const TOKEN_RE = /^[0-9a-f]{24,64}$/i

/**
 * The pay page's data. Open to anyone holding the token, signed in or not -
 * the link goes out by email and gets opened wherever the renter reads it.
 */
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!TOKEN_RE.test(token)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Link za plaćanje ne postoji.')
  }

  const supabase = await createClient()
  const summary = await getPaymentLinkSummary(supabase, token)

  if (!summary) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Link za plaćanje ne postoji.')
  }

  return apiOk(summary)
}
