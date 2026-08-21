import Link from 'next/link'

import PageArticle from '@/components/pages/PageArticle'
import { PAGE_CATEGORY_LABELS } from '@/lib/pages/pages.paths'
import type { SndPageDocument } from '@/types/page'

/**
 * The standalone route rendering of a page — the version Google indexes and a
 * shared link opens. Same article as the sheet shows, with the page chrome the
 * sheet does not need: a breadcrumb back to the category index.
 */
export default function PageDocumentView({ page }: { page: SndPageDocument }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:py-12">
      <nav aria-label="Putanja" className="mb-6 text-[13px] text-muted-foreground">
        {/* data-page-sheet="off": on the pages' own routes a link to a page is
            navigation, not a question asked from somewhere else. */}
        <span data-page-sheet="off">
          <Link href="/" className="text-muted-foreground no-underline hover:underline">
            Početna
          </Link>
          <span className="mx-1.5 text-zinc-300">/</span>
          <Link
            href={`/${page.category}`}
            className="text-muted-foreground no-underline hover:underline"
          >
            {PAGE_CATEGORY_LABELS[page.category]}
          </Link>
        </span>
      </nav>

      <PageArticle page={page} />
    </div>
  )
}
