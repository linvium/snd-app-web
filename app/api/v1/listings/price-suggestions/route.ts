import { NextRequest, NextResponse } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import type { PriceSuggestion } from '@/types/listing'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const categoryId = request.nextUrl.searchParams.get('category_id')
  if (!categoryId || !UUID_RE.test(categoryId)) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Izaberi kategoriju.')
  }

  const { data: category } = await auth.supabase
    .from('categories')
    .select(
      'id, name, suggested_price_1_day_minor, suggested_price_3_days_minor, suggested_price_7_days_minor'
    )
    .eq('id', categoryId)
    .maybeSingle()

  if (!category) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Kategorija nije pronađena.')
  }

  const since = new Date()
  since.setMonth(since.getMonth() - 6)

  const { data: rows } = await auth.supabase
    .from('listings')
    .select('price_1_day_minor, price_3_days_minor, price_7_days_minor')
    .eq('category_id', categoryId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .gte('published_at', since.toISOString())

  const samples = rows ?? []
  if (samples.length >= 5) {
    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
    }

    const suggestion: PriceSuggestion = {
      category_id: category.id,
      category_name: category.name,
      price_1_day_minor: median(samples.map((row) => Number(row.price_1_day_minor))),
      price_3_days_minor: median(
        samples
          .map((row) => row.price_3_days_minor)
          .filter((value): value is number => value != null)
          .map(Number)
      ),
      price_7_days_minor: median(
        samples
          .map((row) => row.price_7_days_minor)
          .filter((value): value is number => value != null)
          .map(Number)
      ),
      sample_size: samples.length,
      source: 'median',
    }

    if (!Number.isFinite(suggestion.price_3_days_minor)) {
      suggestion.price_3_days_minor = Math.round(suggestion.price_1_day_minor * 2.6)
    }
    if (!Number.isFinite(suggestion.price_7_days_minor)) {
      suggestion.price_7_days_minor = Math.round(suggestion.price_1_day_minor * 5.2)
    }

    return apiOk(suggestion)
  }

  if (
    category.suggested_price_1_day_minor == null ||
    category.suggested_price_3_days_minor == null ||
    category.suggested_price_7_days_minor == null
  ) {
    return new NextResponse(null, { status: 204 })
  }

  const suggestion: PriceSuggestion = {
    category_id: category.id,
    category_name: category.name,
    price_1_day_minor: Number(category.suggested_price_1_day_minor),
    price_3_days_minor: Number(category.suggested_price_3_days_minor),
    price_7_days_minor: Number(category.suggested_price_7_days_minor),
    sample_size: samples.length,
    source: 'category',
  }

  return apiOk(suggestion)
}
