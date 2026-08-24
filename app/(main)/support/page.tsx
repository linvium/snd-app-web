import type { Metadata } from 'next'

import PageIndexView from '@/components/pages/PageIndexView'
import { loadPagesInCategory } from '@/lib/pages/pages.server'
import { createPublicClient } from '@/lib/supabase/public'

const INTRO =
  'Kako SND funkcioniše, šta pokriva garancija, kako se plaća i šta da radiš kada nešto pođe naopako.'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Pomoć i podrška | SND',
  description: INTRO,
  alternates: { canonical: '/support' },
}

export default async function SupportIndexPage() {
  const pages = await loadPagesInCategory(createPublicClient(), 'support')
  return <PageIndexView category="support" pages={pages} intro={INTRO} />
}
