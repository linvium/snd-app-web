import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { SndCategory } from '@/types/category'

/**
 * GET /api/v1/categories — the populated category tree (doc 03 §11).
 *
 * "Populated" is the whole point: the tree in the database is far wider than
 * what a user should be offered, and walking into an empty category is the
 * failure this endpoint exists to prevent (doc 00 §3.5).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  const radius = Number(url.searchParams.get('radius') ?? 50)
  const hasCenter = Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has('lat')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('snd_category_tree', {
    p_lat: hasCenter ? lat : null,
    p_lng: hasCenter ? lng : null,
    p_radius_km: hasCenter && Number.isFinite(radius) ? Math.trunc(radius) : null,
  })

  if (error) {
    console.error('[categories] snd_category_tree failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  const rows = (data ?? []) as (Omit<SndCategory, 'listing_count'> & {
    listing_count: number | string
  })[]

  const categories: SndCategory[] = rows.map((row) => ({
    ...row,
    listing_count: Number(row.listing_count),
  }))

  return apiList(categories, { total: categories.length }, 60)
}
