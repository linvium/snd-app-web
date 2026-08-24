import {
  formatCount,
  formatPercent,
  formatRating,
  formatResponseTime,
} from '@/lib/dashboard'
import type { DashboardTotals } from '@/types'

interface Stat {
  key: string
  label: string
  value: string
  hint: string | null
}

/**
 * Only counters the database keeps. There is no month-over-month arrow here
 * because nothing snapshots these numbers over time yet — an arrow would be a
 * decoration, not a measurement.
 */
export function statsFromTotals(totals: DashboardTotals): Stat[] {
  const responseTime = formatResponseTime(totals.avg_response_minutes)

  return [
    {
      key: 'listings',
      label: 'Aktivni oglasi',
      value: formatCount(totals.listings_published),
      hint:
        totals.listings_draft > 0
          ? `${formatCount(totals.listings_draft)} u nacrtu`
          : totals.listings_paused > 0
            ? `${formatCount(totals.listings_paused)} pauzirano`
            : null,
    },
    {
      key: 'views',
      label: 'Pregledi oglasa',
      value: formatCount(totals.views),
      hint: 'ukupno',
    },
    {
      key: 'requests',
      label: 'Otvoreni zahtevi',
      value: formatCount(totals.open_requests),
      hint:
        totals.unread_messages > 0
          ? `${formatCount(totals.unread_messages)} nepročitanih poruka`
          : null,
    },
    {
      key: 'saves',
      label: 'Sačuvano',
      value: formatCount(totals.saves),
      hint: 'puta u omiljenima',
    },
    {
      key: 'response',
      label: 'Stopa odgovora',
      value: formatPercent(totals.response_rate),
      hint: responseTime ? `prosek ${responseTime}` : 'računa se svake noći',
    },
    {
      key: 'rating',
      label: 'Ocena',
      value: formatRating(totals.rating_avg),
      hint:
        totals.rating_count > 0
          ? `${formatCount(totals.rating_count)} ocena`
          : 'još nema ocena',
    },
  ]
}

export function StatGrid({ totals }: { totals: DashboardTotals }) {
  const stats = statsFromTotals(totals)

  return (
    <dl
      data-testid="dashboard-stats"
      className="m-0 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6"
    >
      {stats.map((stat) => (
        <div
          key={stat.key}
          data-testid={`stat-${stat.key}`}
          className="rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <dt className="m-0 text-[12px] text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1 mb-0 text-[24px] leading-tight font-bold tracking-[-0.03em] text-card-foreground">
            {stat.value}
          </dd>
          {stat.hint ? (
            <p className="mt-1 mb-0 text-[11.5px] font-medium text-muted-foreground">{stat.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
