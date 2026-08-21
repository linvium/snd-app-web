import type { Metadata } from 'next'

import { pageMetaDescription } from '@/lib/pages/pages.helpers'
import { pagePath } from '@/lib/pages/pages.paths'
import { loadPage } from '@/lib/pages/pages.server'
import { createPublicClient } from '@/lib/supabase/public'
import type { PageCategory } from '@/types/page'

/**
 * Metadata for an editorial route.
 *
 * The canonical is the page's own address even when it is being read inside the
 * support sheet somewhere else — the sheet never changes the URL, so there is
 * only ever one address per page and nothing to disambiguate for a crawler.
 */
export async function buildPageMetadata(
  category: PageCategory,
  slug: string
): Promise<Metadata> {
  const supabase = createPublicClient()
  const page = await loadPage(supabase, slug)

  if (!page || page.category !== category) {
    return { title: 'Strana nije pronađena | SND', robots: { index: false, follow: false } }
  }

  const description = pageMetaDescription(page)
  const canonical = pagePath(page.category, page.slug)

  return {
    title: `${page.title} | SND`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: page.title,
      description,
      url: canonical,
      siteName: 'SND',
      locale: 'sr_Latn_RS',
    },
  }
}
