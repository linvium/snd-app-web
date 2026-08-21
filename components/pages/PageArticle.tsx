import { formatPageDate } from '@/lib/pages/pages.helpers'
import { cn } from '@/lib/utils'
import type { SndPageDocument } from '@/types/page'

/**
 * One editorial page, rendered the same way in both places it appears: as the
 * whole document at /support/[slug], and inside the support sheet.
 *
 * Sharing the markup is the point — a reader who lands on the guarantee page
 * from Google and a reader who opened it from a booking should be reading the
 * identical thing, not two drifting versions of it.
 */
export default function PageArticle({
  page,
  className,
}: {
  page: SndPageDocument
  className?: string
}) {
  const date = formatPageDate(page.published_at)

  return (
    <article className={cn('mx-auto w-full max-w-[720px]', className)}>
      <h1 className="mt-0 mb-2 text-[28px] leading-tight font-semibold text-foreground sm:text-[32px]">
        {page.title}
      </h1>

      {page.summary ? (
        <p className="mt-0 mb-4 text-[17px] leading-7 text-muted-foreground">{page.summary}</p>
      ) : null}

      {date ? (
        <p className="mt-0 mb-6 text-[13px] text-zinc-500">Poslednja izmena: {date}</p>
      ) : null}

      {/* `details` rather than a toggle in state: the contents list has to work
          on the server-rendered page before any JavaScript arrives, and this is
          the one control on the page that a crawler also benefits from. */}
      {page.toc.length > 1 ? (
        <details className="group mb-8 rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
            Sadržaj
            <span
              aria-hidden
              className="text-zinc-400 transition-transform group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>
          <ul className="m-0 list-none border-t border-border px-4 py-3">
            {page.toc.map((entry) => (
              <li key={entry.id} className="py-1">
                <a
                  href={`#${entry.id}`}
                  className="text-sm text-brand-700 no-underline hover:underline"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* The body is team-authored HTML from `pages.content` (see the migration):
          never user input, which is what makes this safe to inject. */}
      <div className="page-content" dangerouslySetInnerHTML={{ __html: page.html }} />
    </article>
  )
}
