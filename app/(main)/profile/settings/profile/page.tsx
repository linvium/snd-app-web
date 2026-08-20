'use client'

import Link from 'next/link'
import { BadgeCheckIcon, MapPinIcon, PhoneIcon, StarIcon } from 'lucide-react'

import { VerificationBox } from '@/components/profile/VerificationBox'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/page-loading'
import { useKycVerification } from '@/hooks/kyc'
import { useCurrentUser, useLocations } from '@/hooks/user'
import { formatCount, formatRating, formatResponseTime, profileActionTitle } from '@/lib/dashboard'
import {
  SETTINGS_EDIT,
  SETTINGS_LOCATIONS,
  calculateProfileCompleteness,
  colorFromUserId,
  formatMemberSince,
  getProfileInitials,
} from '@/lib/profiles'
import { getDisplayName } from '@/types'

export default function SettingsProfilePage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const { data: kyc, isLoading: kycLoading } = useKycVerification()

  if (userLoading || locationsLoading || kycLoading) {
    return <PageLoading>Učitavanje profila…</PageLoading>
  }

  if (!user) {
    return <div className="py-6 text-sm text-muted-foreground">Nije moguće učitati profil.</div>
  }

  const profile = user.user_profiles
  const displayName = getDisplayName(profile, user.email)
  const initials = getProfileInitials(profile?.first_name, profile?.last_name, user.email)
  const completeness = calculateProfileCompleteness(user, locations, kyc?.status)
  const isVerified = kyc?.status === 'verified'
  const responseTime = formatResponseTime(profile?.avg_response_minutes ?? null)
  const defaultLocation = locations.find((location) => location.is_default) ?? locations[0] ?? null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 hidden text-[22px] font-normal text-foreground lg:block">Pregled profila</h1>

      <section className="rounded-xl border border-border bg-card px-5 py-6 text-center shadow-sm">
        <span
          aria-hidden
          className="relative mx-auto mb-3.5 grid size-[72px] place-items-center overflow-hidden rounded-full text-2xl font-bold text-white"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <>
              <span
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: colorFromUserId(user.id) }}
              />
              <span className="relative">{initials}</span>
            </>
          )}
        </span>

        <h2 className="mb-1 flex items-center justify-center gap-1.5 text-[22px] font-normal text-foreground">
          <span>{displayName}</span>
          {isVerified ? (
            <BadgeCheckIcon
              className="size-5 shrink-0 text-brand-500"
              strokeWidth={2}
              aria-label="Identitet potvrđen"
            />
          ) : null}
        </h2>

        <p className="mb-1 text-sm text-muted-foreground">{user.email}</p>
        {user.created_at ? (
          <p className="mb-4 text-[13px] text-muted-foreground/80">
            {formatMemberSince(user.created_at)}
          </p>
        ) : (
          <div className="mb-4 h-[18px]" />
        )}

        <Button variant="secondary" asChild>
          <Link href={SETTINGS_EDIT}>Izmeni profil</Link>
        </Button>
      </section>

      <VerificationBox status={kyc?.status ?? null} />

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3.5">
          <p className="m-0 text-[12px] text-muted-foreground">Ocena</p>
          <p className="mt-1 mb-0 flex items-center gap-1.5 text-xl font-bold text-card-foreground">
            <StarIcon className="size-4 fill-current text-warning" aria-hidden />
            {formatRating(profile?.rating_avg ?? null)}
          </p>
          <p className="mt-0.5 mb-0 text-[11.5px] text-muted-foreground">
            {profile?.rating_count
              ? `${formatCount(profile.rating_count)} ocena`
              : 'još nema ocena'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3.5">
          <p className="m-0 text-[12px] text-muted-foreground">Stopa odgovora</p>
          <p className="mt-1 mb-0 text-xl font-bold text-card-foreground">
            {profile?.response_rate == null ? '—' : `${Math.round(Number(profile.response_rate))}%`}
          </p>
          <p className="mt-0.5 mb-0 text-[11.5px] text-muted-foreground">
            {responseTime ? `prosek ${responseTime}` : 'računa se svake noći'}
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-border bg-card px-4 py-3.5 sm:col-span-1">
          <p className="m-0 text-[12px] text-muted-foreground">Kontakt</p>
          <p className="mt-1.5 mb-0 flex items-center gap-1.5 text-[13.5px] text-card-foreground">
            <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {profile?.phone ?? 'Nije unet'}
          </p>
          <p className="mt-1 mb-0 flex items-center gap-1.5 text-[13.5px] text-card-foreground">
            <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {defaultLocation ? `${defaultLocation.city}` : 'Nema lokacije'}
          </p>
        </div>
      </section>

      {profile?.about ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="mt-0 mb-2 text-sm font-semibold text-card-foreground">O meni</h3>
          <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {profile.about}
          </p>
        </section>
      ) : null}

      {completeness.percentage < 100 ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="m-0 flex items-baseline text-[15px] font-semibold text-foreground">
            Profil je popunjen
            <span className="ml-auto text-sm font-semibold text-muted-foreground">
              {completeness.percentage}%
            </span>
          </p>
          <div
            role="progressbar"
            aria-valuenow={completeness.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.min(100, Math.max(0, completeness.percentage))}%` }}
            />
          </div>
          {completeness.items.length > 0 ? (
            <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
              {completeness.items.map((item) => (
                <li key={item.name}>
                  <Link href={item.link} className="text-sm font-medium text-brand-600">
                    → {profileActionTitle(item.name)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {locations.length === 0 ? (
        <Link href={SETTINGS_LOCATIONS} className="text-sm font-medium text-brand-600">
          → Dodaj lokaciju preuzimanja
        </Link>
      ) : null}
    </div>
  )
}
