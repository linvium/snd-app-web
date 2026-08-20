import Link from 'next/link'

import { ActionQueue } from '@/components/dashboard/ActionQueue'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { DashboardListings } from '@/components/dashboard/DashboardListings'
import { ProfileSummaryCard } from '@/components/dashboard/ProfileSummaryCard'
import { RecentMessages } from '@/components/dashboard/RecentMessages'
import { StatGrid } from '@/components/dashboard/StatGrid'
import { VerificationBox } from '@/components/profile/VerificationBox'
import { Button } from '@/components/ui/button'
import { LISTING_NEW_PATH } from '@/lib/listings/listings.paths'
import { MANAGER_LISTINGS } from '@/lib/profiles'
import type { DashboardSummary } from '@/types'

export function DashboardView({ data }: { data: DashboardSummary }) {
  const { identity, totals, actions, completeness, listings } = data

  return (
    <div className="flex flex-col gap-7" data-testid="manager-dashboard">
      <div className="flex flex-wrap items-end gap-3">
        <DashboardGreeting name={identity.display_name} pendingCount={actions.length} />
        <div className="ml-auto flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={MANAGER_LISTINGS}>Moji oglasi</Link>
          </Button>
        </div>
      </div>

      {/* The verification prompt belongs above the fold on the dashboard too —
          the sidebar copy is below it on mobile, where the sidebar comes last. */}
      {identity.is_verified ? null : (
        <VerificationBox status={identity.kyc_status} className="lg:hidden" />
      )}

      <section>
        <div className="mb-3 flex items-baseline gap-2.5">
          <h2 className="m-0 text-[15.5px] font-semibold tracking-[-0.015em] text-foreground">
            Čeka tvoju akciju
          </h2>
          {actions.length > 0 ? (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11.5px] font-bold text-amber-700">
              {actions.length}
            </span>
          ) : null}
        </div>
        <ActionQueue actions={actions} />
      </section>

      <section>
        <h2 className="mt-0 mb-3 text-[15.5px] font-semibold tracking-[-0.015em] text-foreground">
          Tvoji brojevi
        </h2>
        <StatGrid totals={totals} />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <RecentMessages />
          <DashboardListings rows={listings} />
        </div>
        <div className="grid min-w-0 gap-5">
          <ProfileSummaryCard
            identity={identity}
            totals={totals}
            completeness={completeness}
          />
        </div>
      </div>
    </div>
  )
}
