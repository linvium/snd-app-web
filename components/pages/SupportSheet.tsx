'use client'

import { useQuery } from '@tanstack/react-query'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { ChevronLeftIcon, ChevronUpIcon, MinimizeIcon, XIcon } from 'lucide-react'

import PageArticle from '@/components/pages/PageArticle'
import { useSupportSheet } from '@/components/pages/SupportSheetProvider'
import { Skeleton } from '@/components/ui/skeleton'
import { pageKeys } from '@/lib/pages/pages.query'
import { pagesService } from '@/lib/pages/pages.service'
import { pagePath } from '@/lib/pages/pages.paths'
import { cn } from '@/lib/utils'
import type { SndPageDocument, SndPageSummary } from '@/types/page'

function SheetSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <Skeleton className="mb-3 h-8 w-3/4" />
      <Skeleton className="mb-2 h-5 w-full" />
      <Skeleton className="mb-8 h-5 w-2/3" />
      <Skeleton className="mb-4 h-12 w-full" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

/** The rest of the category, so the sheet answers the next question too. */
function RelatedPages({ page }: { page: SndPageDocument }) {
  const { open } = useSupportSheet()
  const { data } = useQuery<SndPageSummary[]>({
    queryKey: pageKeys.category(page.category),
    queryFn: ({ signal }) => pagesService.getCategory(page.category, signal),
    staleTime: 5 * 60 * 1000,
  })

  const others = (data ?? []).filter((entry) => entry.slug !== page.slug)
  if (others.length === 0) return null

  return (
    <nav
      aria-label="Ostale teme"
      className="mx-auto mt-10 w-full max-w-[720px] border-t border-border pt-6"
    >
      <h2 className="mt-0 mb-3 text-sm font-semibold text-foreground">Ostale teme</h2>
      <ul className="m-0 grid list-none gap-2 sm:grid-cols-2">
        {others.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => open(entry.slug)}
              className="w-full cursor-pointer rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-foreground hover:border-brand-200 hover:bg-brand-50"
            >
              {entry.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The reading surface for help content opened from anywhere in the app.
 *
 * It is a modal sheet rather than a route so the page underneath survives: a
 * half-filled publish form or a booking in progress is still there when the
 * sheet closes. Minimising goes one step further and parks it as a pill, for
 * the case where the answer has to be read *while* filling something in.
 */
export default function SupportSheet() {
  const { slug, minimised, canGoBack, close, back, minimise, restore } = useSupportSheet()

  const query = useQuery<SndPageDocument>({
    queryKey: pageKeys.detail(slug ?? ''),
    queryFn: ({ signal }) => pagesService.getPage(slug as string, signal),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  })

  if (!slug) return null

  const page = query.data

  if (minimised) {
    return (
      <div className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 md:bottom-6">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-4 shadow-lg">
          <button
            type="button"
            onClick={restore}
            className="cursor-pointer border-none bg-transparent p-0 text-sm font-medium text-foreground"
          >
            {page?.title ?? 'Pomoć'}
          </button>
          <button
            type="button"
            onClick={restore}
            aria-label="Vrati pomoć"
            className="grid size-8 cursor-pointer place-items-center rounded-full border-none bg-brand-500 text-white"
          >
            <ChevronUpIcon className="size-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Zatvori pomoć"
            className="grid size-8 cursor-pointer place-items-center rounded-full border-none bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-testid="support-sheet"
          aria-describedby={undefined}
          className={cn(
            'fixed inset-0 z-50 flex flex-col bg-card outline-none',
            'sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[min(760px,calc(100vw-2rem))] sm:rounded-2xl sm:shadow-2xl',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:slide-in-from-right-4 sm:data-[state=open]:slide-in-from-bottom-0'
          )}
        >
          {/* The title is the article's own h1 below; the dialog needs one of
              its own for screen readers, and two visible titles would be one
              title too many. */}
          <DialogPrimitive.Title className="sr-only">
            {page?.title ?? 'Pomoć'}
          </DialogPrimitive.Title>

          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={back}
              disabled={!canGoBack}
              aria-label="Nazad"
              className={cn(
                'grid size-9 place-items-center rounded-full border-none bg-transparent text-muted-foreground',
                canGoBack
                  ? 'cursor-pointer hover:bg-muted hover:text-foreground'
                  : 'invisible pointer-events-none'
              )}
            >
              <ChevronLeftIcon className="size-5" strokeWidth={1.8} aria-hidden />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={minimise}
                aria-label="Umanji"
                className="grid size-9 cursor-pointer place-items-center rounded-full border-none bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MinimizeIcon className="size-[18px]" strokeWidth={1.8} aria-hidden />
              </button>
              <DialogPrimitive.Close
                aria-label="Zatvori"
                className="grid size-9 cursor-pointer place-items-center rounded-full border-none bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-5" strokeWidth={1.8} aria-hidden />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* `key` on the scroller: opening a second page from a link inside the
              first must start at its top, not wherever the previous one was
              scrolled to. */}
          <div
            key={slug}
            className="flex-1 overflow-y-auto px-4 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:pb-10"
          >
            {query.isPending ? <SheetSkeleton /> : null}

            {query.isError ? (
              <div className="mx-auto w-full max-w-[720px] py-10 text-center">
                <p className="mt-0 mb-3 text-[15px] text-muted-foreground">
                  Ovu stranu trenutno ne možemo da učitamo.
                </p>
                <a
                  href={pagePath('support', slug)}
                  data-page-sheet="off"
                  className="text-sm font-semibold text-brand-700 no-underline hover:underline"
                >
                  Otvori stranu →
                </a>
              </div>
            ) : null}

            {page ? (
              <>
                <PageArticle page={page} />
                <RelatedPages page={page} />
                <p className="mx-auto mt-8 w-full max-w-[720px] text-[13px] text-zinc-500">
                  <a
                    href={pagePath(page.category, page.slug)}
                    data-page-sheet="off"
                    className="text-brand-700 no-underline hover:underline"
                  >
                    Otvori kao zasebnu stranu →
                  </a>
                </p>
              </>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
