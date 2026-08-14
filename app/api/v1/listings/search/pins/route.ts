import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { parseSearchRequest } from '@/lib/search/search.request'
import { createClient } from '@/lib/supabase/server'
import { MAX_MAP_PINS, type MapPin } from '@/types/search'

interface PinRow {
  id: string
  slug: string
  title: string
  price_1_day_minor: number
  approx_latitude: number
  approx_longitude: number
  city: string | null
  total_count: number
}

/**
 * GET /api/v1/listings/search/pins — doc 03 §12.
 *
 * Same filters as the result list, but only what a pin needs. The map shows
 * every match rather than the current page, so this must stay cheap: paging
 * the list does not move the pins (§9.4).
 */
export async function GET(request: NextRequest) {
  const { rpcArgs } = parseSearchRequest(new URL(request.url))

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('snd_search_pins', {
    ...rpcArgs,
    p_limit: MAX_MAP_PINS,
    p_fuzzy: false,
  })

  if (error) {
    console.error('[search] snd_search_pins failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  const rows = (data ?? []) as PinRow[]
  const total = Number(rows[0]?.total_count ?? 0)

  const pins: MapPin[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    price_1_day_minor: row.price_1_day_minor,
    approx_latitude: row.approx_latitude,
    approx_longitude: row.approx_longitude,
    city: row.city,
  }))

  return apiList(
    pins,
    {
      total,
      // Past the cap the map may only draw clusters, and says so (§9.4).
      truncated: total > MAX_MAP_PINS,
    },
    60
  )
}
