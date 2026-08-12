'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
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
    <section
      style={{
        position: 'relative',
        padding: '16px',
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-gray-200)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        type="button"
        aria-label="Zatvori"
        onClick={onDismiss}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '32px',
          height: '32px',
          border: 'none',
          background: 'transparent',
          color: 'var(--color-gray-500)',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      <p
        style={{
          margin: '0 40px 10px 0',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--color-gray-900)',
        }}
      >
        Tvoj profil je {percentage}% popunjen
      </p>

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '8px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-gray-200)',
          overflow: 'hidden',
          marginBottom: missingItems.length ? '14px' : 0,
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: 'var(--color-brand-500)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {missingItems.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {missingItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.link}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-brand-600)',
                }}
              >
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
    return (
      <div style={{ padding: '24px 0', color: 'var(--color-gray-500)', fontSize: '14px' }}>
        Učitavanje profila…
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ padding: '24px 0', color: 'var(--color-gray-500)', fontSize: '14px' }}>
        Nije moguće učitati profil.
      </div>
    )
  }

  const profile = user.user_profiles
  const displayName = getDisplayName(profile, user.email)
  const initials = getProfileInitials(profile?.first_name, profile?.last_name, user.email)
  const completeness = calculateProfileCompleteness(user, locations)
  const showCompleteness = !cardHidden && completeness.percentage < 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <section
        style={{
          padding: '24px 20px',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 14px',
            borderRadius: 'var(--radius-full)',
            background: colorFromUserId(user.id),
            color: 'var(--color-white)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: '24px',
          }}
        >
          {initials}
        </div>
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--color-gray-900)',
          }}
        >
          {displayName}
        </h1>
        <p style={{ margin: '0 0 4px', color: 'var(--color-gray-500)', fontSize: '14px' }}>{user.email}</p>
        {user.created_at ? (
          <p style={{ margin: '0 0 18px', color: 'var(--color-gray-400)', fontSize: '13px' }}>
            {formatMemberSince(user.created_at)}
          </p>
        ) : (
          <div style={{ height: '18px', marginBottom: '18px' }} />
        )}
        <Link href="/profil/izmeni" style={{ display: 'inline-block' }}>
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
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-gray-200)',
          overflow: 'hidden',
        }}
      >
        {NAV_LINKS.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--color-gray-900)',
              borderTop: index === 0 ? 'none' : '1px solid var(--color-gray-200)',
            }}
          >
            <span>{item.name}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="2"
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
        style={{
          marginTop: '8px',
          padding: '14px',
          border: 'none',
          background: 'transparent',
          color: 'var(--color-error)',
          fontSize: '15px',
          fontWeight: 600,
          cursor: signOut.isPending ? 'not-allowed' : 'pointer',
          opacity: signOut.isPending ? 0.6 : 1,
        }}
      >
        {signOut.isPending ? 'Odjavljivanje…' : 'Odjavi se'}
      </button>
    </div>
  )
}
