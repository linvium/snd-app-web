import Link from 'next/link'
import { BadgeCheckIcon, StarIcon } from 'lucide-react'

import { VerificationBox } from '@/components/profile/VerificationBox'
import { Button } from '@/components/ui/button'
import { formatCount, formatRating, profileActionTitle } from '@/lib/dashboard'
import { SETTINGS_EDIT, SETTINGS_PROFILE } from '@/lib/profiles'
import { colorFromUserId } from '@/lib/profiles/profile.helpers'
import type { DashboardIdentity, DashboardTotals, ProfileCompleteness } from '@/types'

export function ProfileSummaryCard({
  identity,
  totals,
  completeness,
}: {
  identity: DashboardIdentity
  totals: DashboardTotals
  completeness: ProfileCompleteness
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-4 pt-5 pb-4 text-center">
        <span
          aria-hidden
          className="relative mx-auto mb-3 grid size-16 place-items-center overflow-hidden rounded-full text-xl font-bold text-white"
        >
          {identity.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identity.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <>
              <span
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: colorFromUserId(identity.user_id) }}
              />
              <span className="relative">{identity.initials}</span>
            </>
          )}
        </span>

        <h2 className="m-0 flex items-center justify-center gap-1.5 text-[17px] font-semibold tracking-[-0.02em] text-card-foreground">
          {identity.display_name}
          {identity.is_verified ? (
            <BadgeCheckIcon
              className="size-[18px] shrink-0 text-brand-500"
              strokeWidth={2}
              aria-label="Identitet potvrđen"
            />
          ) : null}
        </h2>

        <p className="mt-1 mb-0 flex flex-wrap items-center justify-center gap-x-1.5 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <StarIcon className="size-3.5 fill-current" aria-hidden />
            {formatRating(totals.rating_avg)}
          </span>
          <span aria-hidden>·</span>
          <span>
            {totals.rating_count > 0 ? `${formatCount(totals.rating_count)} ocena` : 'bez ocena'}
          </span>
          {identity.member_since ? (
            <>
              <span aria-hidden>·</span>
              <span>{identity.member_since}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="px-4 pb-4">
        <VerificationBox status={identity.kyc_status} />
      </div>

      {completeness.percentage < 100 ? (
        <div className="border-t border-border px-4 py-4">
          <p className="m-0 flex items-baseline text-[12.5px] font-semibold text-card-foreground">
            Profil je popunjen
            <span className="ml-auto font-semibold text-muted-foreground">
              {completeness.percentage}%
            </span>
          </p>
          <div
            role="progressbar"
            aria-valuenow={completeness.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.min(100, Math.max(0, completeness.percentage))}%` }}
            />
          </div>

          {completeness.items.length > 0 ? (
            <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
              {completeness.items.slice(0, 3).map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.link}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[13px] text-foreground no-underline hover:bg-muted"
                  >
                    <span
                      aria-hidden
                      className="size-4 shrink-0 rounded-[5px] border-[1.8px] border-border"
                    />
                    {profileActionTitle(item.name)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2 border-t border-border px-4 py-4">
        <Button variant="secondary" size="sm" fullWidth asChild>
          <Link href={SETTINGS_PROFILE}>Pregled profila</Link>
        </Button>
        <Button variant="secondary" size="sm" fullWidth asChild>
          <Link href={SETTINGS_EDIT}>Izmeni profil</Link>
        </Button>
      </div>
    </section>
  )
}
