import { requireUser } from '@/lib/api/auth'
import { apiOk } from '@/lib/api/response'
import { cancelSubscription } from '@/lib/billing/billing.server'

/** Stops the caller's plan from renewing; it keeps working until the period ends. */
export async function POST() {
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await cancelSubscription(auth.supabase)
  if ('response' in result) return result.response
  return apiOk(result)
}
