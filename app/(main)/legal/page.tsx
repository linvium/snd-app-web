import type { Metadata } from 'next'

import PageIndexView from '@/components/pages/PageIndexView'
import { loadPagesInCategory } from '@/lib/pages/pages.server'
import { createPublicClient } from '@/lib/supabase/public'

const INTRO = 'Uslovi korišćenja, politika privatnosti i ostali dokumenti koji važe na SND-u.'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Pravni dokumenti | SND',
  description: INTRO,
  alternates: { canonical: '/legal' },
}

export default async function LegalIndexPage() {
  const pages = await loadPagesInCategory(createPublicClient(), 'legal')
  return <PageIndexView category="legal" pages={pages} intro={INTRO} />
}
