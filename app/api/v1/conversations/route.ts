import { requireUser } from '@/lib/api/auth'
import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { listConversations } from '@/lib/messages/messages.server'

export async function GET() {
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await listConversations(auth.supabase, auth.userId)
  if ('response' in result) return result.response
  return apiList(result, { total: result.length })
}
