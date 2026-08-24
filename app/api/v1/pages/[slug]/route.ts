import { NextRequest } from 'next/server'

import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { loadPage } from '@/lib/pages/pages.server'
import { createClient } from '@/lib/supabase/server'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * The body behind the support sheet.
 *
 * The sheet asks for a page by slug alone: it is opened from a link anywhere in
 * the app, and the reader never leaves the screen they were on, so there is no
 * route to read the category from. Slugs are unique across categories for
 * exactly this reason.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params

  if (!SLUG_RE.test(slug)) {
    return apiError(400, ERROR_CODES.VALIDATION_FAILED, 'Neispravna adresa strane.')
  }

  const supabase = await createClient()
  const page = await loadPage(supabase, slug)

  if (!page) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Strana nije pronađena.')
  }

  const response = apiOk(page)
  // Editorial copy, identical for everyone: a shared cache may hold it, and the
  // sheet reopening the same page should not go back to the database at all.
  response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return response
}
