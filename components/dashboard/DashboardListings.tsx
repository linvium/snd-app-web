import Link from 'next/link'
import { EyeIcon, HeartIcon, ImageIcon, MessageSquareIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LISTING_STATUS_LABEL, formatCount, rankDashboardListings } from '@/lib/dashboard'
import { LISTING_NEW_PATH, listingEditPath } from '@/lib/listings/listings.paths'
import { MANAGER_LISTINGS } from '@/lib/profiles'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import { cn } from '@/lib/utils'
import type { DashboardListingRow } from '@/types'

const STATUS_CLASS: Record<string, string> = {
  published: 'bg-brand-50 text-brand-600',
  draft: 'bg-muted text-muted-foreground',
  paused: 'bg-warning-soft text-amber-700',
  rejected: 'bg-red-50 text-destructive',
  deleted: 'bg-muted text-muted-foreground',
}

function listingHref(row: DashboardListingRow): string {
  if (row.status === 'published' && row.slug) return `/listings/${row.slug}`
  return listingEditPath(row.id)
}

export function DashboardListings({ rows }: { rows: DashboardListingRow[] }) {
  const visible = rankDashboardListings(rows)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <h2 className="m-0 flex-1 text-[14.5px] font-semibold tracking-[-0.015em] text-card-foreground">
          Moji oglasi
        </h2>
        <Link href={MANAGER_LISTINGS} className="text-[12.5px] font-semibold text-brand-600">
          Upravljaj oglasima
        </Link>
      </header>

      {visible.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="m-0 text-[15px] font-semibold text-foreground">Još nemaš oglasa.</p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Objavi prvu stvar da bi ovde počeli da se skupljaju pregledi i zahtevi.
          </p>
          <Button size="sm" asChild>
            <Link href={LISTING_NEW_PATH}>Objavi stvar</Link>
          </Button>
        </div>
      ) : (
        <>
          <div
            aria-hidden
            className="hidden grid-cols-[1fr_72px_72px_72px_96px] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase sm:grid"
          >
            <span>Predmet</span>
            <span className="text-right">Pregledi</span>
            <span className="text-right">Zahtevi</span>
            <span className="text-right">Sačuvano</span>
            <span>Status</span>
          </div>

          <ul className="m-0 list-none p-0" data-testid="dashboard-listings">
            {visible.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_72px_72px_72px_96px]"
              >
                <Link
                  href={listingHref(row)}
                  className="flex min-w-0 items-center gap-3 no-underline"
                >
                  {row.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.thumbnail_url}
                      alt=""
                      className="size-9 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"
                    >
                      <ImageIcon className="size-4 text-muted-foreground" strokeWidth={1.6} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-card-foreground">
                      {row.title}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {row.price_1_day_minor > 0
                        ? `${formatPriceMinor(row.price_1_day_minor)} / dan`
                        : 'Cena nije postavljena'}
                    </span>
                  </span>
                </Link>

                <span className="hidden text-right text-[13.5px] tabular-nums text-muted-foreground sm:block">
                  {formatCount(row.view_count)}
                </span>
                <span className="hidden text-right text-[13.5px] tabular-nums text-muted-foreground sm:block">
                  {formatCount(row.request_count)}
                </span>
                <span className="hidden text-right text-[13.5px] tabular-nums text-muted-foreground sm:block">
                  {formatCount(row.favorite_count)}
                </span>

                <span className="flex items-center justify-end gap-3 sm:justify-start">
                  <span className="flex items-center gap-2.5 text-[12px] text-muted-foreground sm:hidden">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="size-3.5" strokeWidth={1.8} aria-hidden />
                      {formatCount(row.view_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquareIcon className="size-3.5" strokeWidth={1.8} aria-hidden />
                      {formatCount(row.request_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HeartIcon className="size-3.5" strokeWidth={1.8} aria-hidden />
                      {formatCount(row.favorite_count)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      STATUS_CLASS[row.status] ?? STATUS_CLASS.draft
                    )}
                  >
                    {LISTING_STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
