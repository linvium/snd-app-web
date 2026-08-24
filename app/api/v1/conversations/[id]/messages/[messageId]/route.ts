import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { deleteConversationMessage, editConversationMessage } from '@/lib/messages/messages.server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function parseIds(context: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await context.params
  if (!UUID_RE.test(id) || !UUID_RE.test(messageId)) {
    return { error: apiError(404, ERROR_CODES.NOT_FOUND, 'Poruka nije pronađena.') }
  }
  return { id, messageId }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  const parsed = await parseIds(context)
  if ('error' in parsed) return parsed.error

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  let payload: { body?: string }
  try {
    payload = (await request.json()) as { body?: string }
  } catch {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const result = await editConversationMessage(
    auth.supabase,
    auth.userId,
    parsed.id,
    parsed.messageId,
    payload.body ?? ''
  )
  if ('response' in result) return result.response
  return apiOk(result)
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  const parsed = await parseIds(context)
  if ('error' in parsed) return parsed.error

  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await deleteConversationMessage(
    auth.supabase,
    auth.userId,
    parsed.id,
    parsed.messageId
  )
  if ('response' in result) return result.response
  return apiOk(result)
}
