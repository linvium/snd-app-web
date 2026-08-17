import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiList, apiOk, ERROR_CODES } from '@/lib/api/response'
import { createDraft, listOwnDrafts } from '@/lib/listings/listings.server'

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  try {
    const drafts = await listOwnDrafts(auth.supabase, auth.userId)
    return apiList(drafts, { total: drafts.length })
  } catch (error) {
    console.error('[listings] list drafts failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }
}

export async function POST(_request: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const result = await createDraft(auth.supabase, auth.userId)
  if ('response' in result) return result.response
  return apiOk(result.listing, 201)
}
