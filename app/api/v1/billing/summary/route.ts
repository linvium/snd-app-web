import { requireUser } from '@/lib/api/auth'
import { apiOk } from '@/lib/api/response'
import { getBillingSummary } from '@/lib/billing/billing.server'

/** The caller's plan, slot usage, credit balance and recent credit history. */
export async function GET() {
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await getBillingSummary(auth.supabase)
  if ('response' in result) return result.response
  return apiOk(result)
}
