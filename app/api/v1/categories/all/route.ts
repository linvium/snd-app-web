import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { SndCategoryCatalog } from '@/types/category'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select(
      'id, parent_id, name, slug, full_path, level, icon_name, sort_order, listing_count, is_enabled, guarantee_cap_minor, suggested_price_1_day_minor, suggested_price_3_days_minor, suggested_price_7_days_minor'
    )
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[categories] all failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  const categories = (data ?? []) as SndCategoryCatalog[]
  return apiList(categories, { total: categories.length }, 60)
}
