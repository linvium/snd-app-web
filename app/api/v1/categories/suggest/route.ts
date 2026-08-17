import { NextRequest } from 'next/server'

import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { SndCategoryCatalog } from '@/types/category'

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/š/g, 's')
    .replace(/đ/g, 'dj')
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/ž/g, 'z')
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title')?.trim() ?? ''
  if (title.length < 2) {
    return apiList([], { total: 0 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select(
      'id, parent_id, name, slug, full_path, level, icon_name, sort_order, listing_count, is_enabled, guarantee_cap_minor, suggested_price_1_day_minor, suggested_price_3_days_minor, suggested_price_7_days_minor'
    )
    .eq('is_enabled', true)

  if (error) {
    console.error('[categories] suggest failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  const rows = (data ?? []) as SndCategoryCatalog[]
  const parentIds = new Set(rows.map((row) => row.parent_id).filter((id): id is string => Boolean(id)))
  const leaves = rows.filter((row) => !parentIds.has(row.id))
  const needle = normalize(title)

  const scored = leaves
    .map((row) => {
      const haystack = normalize(`${row.name} ${row.full_path}`)
      const index = haystack.indexOf(needle)
      const score = index === -1 ? -1 : needle.length / haystack.length + (index === 0 ? 1 : 0)
      return { row, score }
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.row)

  if (scored.length > 0) {
    return apiList(scored, { total: scored.length })
  }

  const fallback = leaves.find((row) => row.slug === 'ostalo') ?? rows.find((row) => row.slug === 'ostalo')
  return apiList(fallback ? [fallback] : [], { total: fallback ? 1 : 0, fallback: true })
}
