import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { isPageCategory } from '@/lib/pages/pages.paths'
import { loadPagesInCategory } from '@/lib/pages/pages.server'
import { createClient } from '@/lib/supabase/server'

/** The other pages in a category — the sheet's "see also" list. */
export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') ?? 'support'

  if (!isPageCategory(category)) {
    return apiError(400, ERROR_CODES.VALIDATION_FAILED, 'Nepoznata kategorija strana.')
  }

  const supabase = await createClient()
  const pages = await loadPagesInCategory(supabase, category)

  const response = apiList(pages, { total: pages.length })
  response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return response
}
