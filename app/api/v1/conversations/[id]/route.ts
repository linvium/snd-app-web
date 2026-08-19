import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { getConversationThread } from '@/lib/messages/messages.server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Razgovor nije pronađen.')
  }

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await getConversationThread(auth.supabase, auth.userId, id)
  if ('response' in result) return result.response
  return apiOk(result)
}
