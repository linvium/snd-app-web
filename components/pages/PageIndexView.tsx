import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'

import { PAGE_CATEGORY_LABELS, pagePath } from '@/lib/pages/pages.paths'
import type { PageCategory, SndPageSummary } from '@/types/page'

/**
 * The category index: every page in it, as its own crawlable link.
 *
 * Sheet interception is off for this list. Someone standing on /support asked
 * for the help section; opening a sheet over the index of the thing they are
 * already looking at would be a modal on top of a menu.
 */
export default function PageIndexView({
  category,
  pages,
  intro,
}: {
  category: PageCategory
  pages: SndPageSummary[]
  intro: string
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:py-12" data-page-sheet="off">
      <h1 className="mt-0 mb-2 text-[28px] leading-tight font-semibold text-foreground sm:text-[32px]">
        {PAGE_CATEGORY_LABELS[category]}
      </h1>
      <p className="mt-0 mb-8 text-[17px] leading-7 text-muted-foreground">{intro}</p>

      {pages.length === 0 ? (
        <p className="m-0 text-[15px] text-muted-foreground">Sadržaj stiže uskoro.</p>
      ) : (
        <ul className="m-0 grid list-none gap-3">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={pagePath(page.category, page.slug)}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 no-underline hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">
                    {page.title}
                  </span>
                  {page.summary ? (
                    <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">
                      {page.summary}
                    </span>
                  ) : null}
                </span>
                <ArrowRightIcon
                  className="size-4 flex-none text-zinc-400"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
