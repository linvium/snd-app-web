import type { MetadataRoute } from 'next'

import { pagePath } from '@/lib/pages/pages.paths'
import { loadAllPageSlugs } from '@/lib/pages/pages.server'
import { createPublicClient } from '@/lib/supabase/public'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const revalidate = 3600

/**
 * Help and legal pages, listed for crawlers.
 *
 * They are reached through a sheet almost everywhere in the app, which leaves
 * no URL for a crawler to follow — the sitemap is what keeps them findable.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await loadAllPageSlugs(createPublicClient())

  return [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/support`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/legal`, changeFrequency: 'yearly', priority: 0.3 },
    ...pages.map((page) => ({
      url: `${siteUrl}${pagePath(page.category, page.slug)}`,
      lastModified: new Date(page.published_at),
      changeFrequency: 'monthly' as const,
      priority: page.category === 'support' ? 0.6 : 0.3,
    })),
  ]
}
