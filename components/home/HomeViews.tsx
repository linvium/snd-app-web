'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import { useAuthSession } from '@/context/AuthContext'
import { useSignOut } from '@/hooks/auth/useAuth'
import { useCurrentUser } from '@/hooks/user/useUser'
import { getDisplayName, type SndUser } from '@/types'

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('sr-Latn-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function QuickActionCard({
  href,
  icon,
  title,
}: {
  href: string
  icon: string
  title: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '20px 16px',
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-gray-200)',
        boxShadow: 'var(--shadow-sm)',
        textDecoration: 'none',
        color: 'var(--color-gray-900)',
        fontWeight: 600,
        fontSize: '15px',
      }}
    >
      <span style={{ fontSize: '22px' }} aria-hidden>
        {icon}
      </span>
      {title}
    </Link>
  )
}

function HomeSkeleton() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
      <div
        style={{
          height: '100px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-gray-100)',
          marginBottom: '16px',
        }}
      />
      <div
        style={{
          height: '160px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-gray-100)',
        }}
      />
    </main>
  )
}

export function GuestHome() {
  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 20px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          margin: '0 0 12px',
          fontSize: 'clamp(28px, 7vw, 40px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--color-gray-900)',
          lineHeight: 1.15,
        }}
      >
        Iznajmi umesto da kupuješ
      </h1>
      <p
        style={{
          margin: '0 0 28px',
          fontSize: '17px',
          color: 'var(--color-gray-500)',
          maxWidth: '420px',
          lineHeight: 1.5,
        }}
      >
        Stvari od ljudi iz tvog kraja. Jeftino, sigurno, garantovano.
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
        }}
      >
        <Link href="/prijava">
          <Button size="lg">Prijavi se</Button>
        </Link>
        <Link href="/registracija">
          <Button variant="secondary" size="lg">
            Napravi nalog
          </Button>
        </Link>
      </div>
    </main>
  )
}

export function LoggedInHome({ userData }: { userData: SndUser | null }) {
  const { user } = useAuthSession()
  const signOut = useSignOut()
  const email = userData?.email || user?.email || ''
  const profile = userData?.user_profiles ?? null
  const displayName = getDisplayName(profile, email)
  const emailVerified = !!userData?.email_verified_at || !!user?.email_confirmed_at
  const createdAt = userData?.created_at || user?.created_at || ''

  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '24px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '20px',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 4px',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-gray-900)',
            }}
          >
            Zdravo, {displayName}!
          </h1>
          <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '14px' }}>{email}</p>
        </div>
        <div
          aria-hidden
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-brand-500)',
            color: 'var(--color-white)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: '18px',
            flexShrink: 0,
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      </section>

      <section
        style={{
          padding: '20px',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2
          style={{
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-gray-900)',
          }}
        >
          Status naloga
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-gray-500)' }}>Email</span>
            <span
              style={{
                fontWeight: 500,
                color: emailVerified ? 'var(--color-success)' : 'var(--color-warning)',
              }}
            >
              {emailVerified ? '✓ Potvrđen' : '⚠ Nije potvrđen'}
            </span>
          </div>
          {!emailVerified ? (
            <Link
              href="/verifikacija"
              style={{ color: 'var(--color-brand-600)', fontWeight: 600, fontSize: '14px' }}
            >
              Potvrdi email
            </Link>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: 'var(--color-gray-500)' }}>KYC</span>
            <span style={{ fontWeight: 500 }}>Nije verifikovan</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: 'var(--color-gray-500)' }}>Nalog kreiran</span>
            <span style={{ fontWeight: 500 }}>{createdAt ? formatDate(createdAt) : '—'}</span>
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        <QuickActionCard href="/profil" icon="👤" title="Moj profil" />
        <QuickActionCard href="/moji-oglasi" icon="📦" title="Moji oglasi" />
        <QuickActionCard href="/rezervacije" icon="📅" title="Rezervacije" />
        <QuickActionCard href="/omiljeni" icon="❤️" title="Omiljeni" />
      </section>

      <Button variant="danger" fullWidth loading={signOut.isPending} onClick={() => signOut.mutate()}>
        Odjavi se
      </Button>
    </main>
  )
}

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuthSession()
  const { data: userData, isLoading: userLoading } = useCurrentUser(!!user)

  if (authLoading || (user && userLoading)) {
    return <HomeSkeleton />
  }

  if (!user) {
    return <GuestHome />
  }

  return <LoggedInHome userData={userData ?? null} />
}
