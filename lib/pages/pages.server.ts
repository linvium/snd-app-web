import type { SupabaseClient } from '@supabase/supabase-js'

import { buildPageDocument } from '@/lib/pages/pages.helpers'
import type { PageCategory, SndPage, SndPageDocument, SndPageSummary } from '@/types/page'

const PAGE_COLUMNS = 'id, slug, category, title, summary, content, published_at'
const SUMMARY_COLUMNS = 'id, slug, category, title, summary, published_at'

/**
 * One page by slug.
 *
 * `category` is checked here rather than in the query: a row that exists under
 * a different namespace is a wrong address, not a missing page, and the route
 * can tell the two apart (404 vs. redirect) only if it gets the row back.
 * Unpublished rows never arrive — RLS filters them for anon and authenticated
 * alike, so a draft cannot be reached by guessing its slug.
 */
export async function loadPage(
  supabase: SupabaseClient,
  slug: string
): Promise<SndPageDocument | null> {
  const { data, error } = await supabase
    .from('pages')
    .select(PAGE_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[pages] load failed', { slug, error })
    return null
  }
  if (!data) return null

  return buildPageDocument(data as SndPage)
}

/** Everything published in a category, in the order the editor chose. */
export async function loadPagesInCategory(
  supabase: SupabaseClient,
  category: PageCategory
): Promise<SndPageSummary[]> {
  const { data, error } = await supabase
    .from('pages')
    .select(SUMMARY_COLUMNS)
    .eq('category', category)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    console.error('[pages] category load failed', { category, error })
    return []
  }

  return (data ?? []) as SndPageSummary[]
}

/** Every published page, for generateStaticParams and the sitemap. */
export async function loadAllPageSlugs(
  supabase: SupabaseClient
): Promise<Array<{ slug: string; category: PageCategory; published_at: string }>> {
  const { data, error } = await supabase
    .from('pages')
    .select('slug, category, published_at')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[pages] slug load failed', error)
    return []
  }

  return (data ?? []) as Array<{ slug: string; category: PageCategory; published_at: string }>
}
