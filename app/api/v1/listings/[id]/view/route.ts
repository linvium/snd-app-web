import { NextRequest, NextResponse } from 'next/server'

import { apiError, ERROR_CODES } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** One count per viewer per half hour (doc 04 §14). */
const THROTTLE_SECONDS = 30 * 60
const COOKIE_PREFIX = 'snd_v_'

/**
 * POST /api/v1/listings/<id>/view — doc 04 §14.
 *
 * Throttled with a short-lived cookie rather than a table of who looked at
 * what. It costs nothing to store, it keeps no record of anybody's browsing,
 * and the failure mode is mild in the right direction: clearing cookies lets a
 * refresh count twice, which is a far smaller error than counting every refresh
 * and reporting reloads as interest.
 *
 * Always answers 204. A view counter is not worth failing a page over.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const cookieName = `${COOKIE_PREFIX}${id.slice(0, 8)}`
  const alreadySeen = _request.cookies.get(cookieName)

  const response = new NextResponse(null, { status: 204 })

  if (alreadySeen) return response

  const supabase = await createClient()
  const { error } = await supabase.rpc('snd_increment_listing_view', { p_listing_id: id })
  if (error) console.error('[listing-view] increment failed', error)

  response.cookies.set(cookieName, '1', {
    maxAge: THROTTLE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
