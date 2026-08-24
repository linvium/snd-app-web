import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import PageDocumentView from '@/components/pages/PageDocumentView'
import { buildPageMetadata } from '@/lib/pages/pages.metadata'
import { pagePath } from '@/lib/pages/pages.paths'
import { loadAllPageSlugs, loadPage } from '@/lib/pages/pages.server'
import { createPublicClient } from '@/lib/supabase/public'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * One route for every help page: /support/faq, /support/guarantee, and whatever
 * the next one is called. Adding a page is an insert, not a file.
 */
export const revalidate = 300

export async function generateStaticParams() {
  const pages = await loadAllPageSlugs(createPublicClient())
  return pages.filter((page) => page.category === 'support').map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return buildPageMetadata('support', slug)
}

export default async function SupportPage({ params }: PageProps) {
  const { slug } = await params
  const page = await loadPage(createPublicClient(), slug)

  if (!page) notFound()
  // The page exists, under another namespace. That is a stale link rather than
  // a missing page, so it is worth a redirect instead of a 404.
  if (page.category !== 'support') redirect(pagePath(page.category, page.slug))

  return <PageDocumentView page={page} />
}
