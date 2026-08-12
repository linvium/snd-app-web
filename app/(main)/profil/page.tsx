'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useSignOut } from '@/hooks/auth/useAuth'
import { useCurrentUser } from '@/hooks/user/useUser'
import { useLocations } from '@/hooks/user/useLocation'
import { calculateProfileCompleteness } from '@/lib/profileCompleteness'
import {
  colorFromUserId,
  dismissCompletenessCard,
  formatMemberSince,
  getProfileInitials,
  isCompletenessCardDismissed,
} from '@/lib/profileHelpers'
import { cn } from '@/lib/utils'
import { getDisplayName } from '@/types'

const NAV_LINKS = [
  { name: 'Izmeni profil', href: '/profil/izmeni' },
  { name: 'Moje lokacije', href: '/profil/lokacije' },
  { name: 'Moji oglasi', href: '/profil/oglasi' },
  { name: 'Omiljeni', href: '/profil/omiljeni' },
  { name: 'Podešavanja', href: '/profil/podesavanja' },
]

function CompletenessCard({
  percentage,
  missingItems,
  onDismiss,
}: {
  percentage: number
  missingItems: { name: string; link: string }[]
  onDismiss: () => void
}) {
  const actionLabel = (name: string) => {
    if (name === 'Ime i prezime') return 'Dodaj ime i prezime'
    if (name === 'Profilna slika') return 'Dodaj profilnu sliku'
    if (name === 'Broj telefona') return 'Dodaj broj telefona'
    if (name === 'Lokacija') return 'Dodaj lokaciju'
    if (name === 'O meni') return 'Dopuni o meni'
    if (name === 'KYC verifikacija') return 'Započni KYC verifikaciju'
    return name
  }

  return (
    <section className="relative rounded-xl border border-border bg-card p-4 shadow-sm">
      <button
        type="button"
        aria-label="Zatvori"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 size-8 cursor-pointer border-0 bg-transparent text-lg leading-none text-muted-foreground"
      >
        ✕
      </button>

      <p className="mr-10 mb-2.5 text-[15px] font-semibold text-foreground">
        Tvoj profil je {percentage}% popunjen
      </p>

      <svg
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('block h-2 w-full', missingItems.length ? 'mb-3.5' : 'mb-0')}
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
      >
        <rect width="100" height="8" rx="4" className="fill-muted" />
        <rect width={percentage} height="8" rx="4" className="fill-brand-500" />
      </svg>

      {missingItems.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {missingItems.map((item) => (
            <li key={item.name}>
              <Link href={item.link} className="text-sm font-medium text-brand-600">
                → {actionLabel(item.name)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const signOut = useSignOut()
  const [cardHidden, setCardHidden] = useState(true)

  useEffect(() => {
    setCardHidden(isCompletenessCardDismissed())
  }, [])

  if (userLoading || locationsLoading) {
    return <div className="py-6 text-sm text-muted-foreground">Učitavanje profila…</div>
  }

  if (!user) {
    return <div className="py-6 text-sm text-muted-foreground">Nije moguće učitati profil.</div>
  }

  const profile = user.user_profiles
  const displayName = getDisplayName(profile, user.email)
  const initials = getProfileInitials(profile?.first_name, profile?.last_name, user.email)
  const completeness = calculateProfileCompleteness(user, locations)
  const showCompleteness = !cardHidden && completeness.percentage < 100

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card px-5 py-6 text-center shadow-sm">
        <div
          aria-hidden
          className="relative mx-auto mb-3.5 grid size-[72px] place-items-center overflow-hidden rounded-full text-2xl font-bold text-white"
        >
          <svg className="absolute inset-0 size-full" viewBox="0 0 72 72" aria-hidden>
            <circle cx="36" cy="36" r="36" fill={colorFromUserId(user.id)} />
          </svg>
          <span className="relative z-[1]">{initials}</span>
        </div>
        <h1 className="mb-1 text-[22px] font-normal text-foreground">{displayName}</h1>
        <p className="mb-1 text-sm text-muted-foreground">{user.email}</p>
        {user.created_at ? (
          <p className="mb-[18px] text-[13px] text-muted-foreground/80">
            {formatMemberSince(user.created_at)}
          </p>
        ) : (
          <div className="mb-[18px] h-[18px]" />
        )}
        <Link href="/profil/izmeni" className="inline-block">
          <Button variant="secondary">Izmeni profil</Button>
        </Link>
      </section>

      {showCompleteness ? (
        <CompletenessCard
          percentage={completeness.percentage}
          missingItems={completeness.items}
          onDismiss={() => {
            dismissCompletenessCard()
            setCardHidden(true)
          }}
        />
      ) : null}

      <nav
        aria-label="Profil stavke"
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        {NAV_LINKS.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-between p-4 text-[15px] font-medium text-foreground',
              index > 0 && 'border-t border-border'
            )}
          >
            <span>{item.name}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className={cn(
          'mt-2 cursor-pointer border-0 bg-transparent p-3.5 text-[15px] font-semibold text-destructive',
          signOut.isPending && 'cursor-not-allowed opacity-60'
        )}
      >
        {signOut.isPending ? 'Odjavljivanje…' : 'Odjavi se'}
      </button>
    </div>
  )
}
