'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/context/AuthContext'
import { useSignOut } from '@/hooks/auth/useAuth'
import { useCurrentUser } from '@/hooks/user/useUser'
import { cn } from '@/lib/utils'
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
      className="flex flex-col gap-2.5 rounded-lg border border-border bg-card px-4 py-5 text-[15px] font-semibold text-foreground no-underline shadow-sm"
    >
      <span className="text-[22px]" aria-hidden>
        {icon}
      </span>
      {title}
    </Link>
  )
}

function HomeSkeleton() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-6">
      <div className="mb-4 h-[100px] rounded-xl bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
    </main>
  )
}

export function GuestHome() {
  return (
    <main className="mx-auto flex max-w-[720px] flex-col items-center px-5 pt-12 pb-8 text-center">
      <h1 className="mb-3 text-[clamp(28px,7vw,40px)] leading-[1.15] font-normal tracking-[-0.03em] text-foreground">
        Iznajmi umesto da kupuješ
      </h1>
      <p className="mb-7 max-w-[420px] text-[17px] leading-normal text-muted-foreground">
        Stvari od ljudi iz tvog kraja. Jeftino, sigurno, garantovano.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
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
    <main className="mx-auto flex max-w-[720px] flex-col gap-5 px-4 pt-6 pb-10">
      <section className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h1 className="mb-1 text-[22px] font-normal text-foreground">Zdravo, {displayName}!</h1>
          <p className="m-0 text-sm text-muted-foreground">{email}</p>
        </div>
        <div
          aria-hidden
          className="grid size-[52px] shrink-0 place-items-center rounded-full bg-brand-500 text-lg font-bold text-white"
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-normal text-foreground">Status naloga</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap justify-between gap-3">
            <span className="text-muted-foreground">Email</span>
            <span
              className={cn(
                'font-medium',
                emailVerified ? 'text-success' : 'text-warning'
              )}
            >
              {emailVerified ? '✓ Potvrđen' : '⚠ Nije potvrđen'}
            </span>
          </div>
          {!emailVerified ? (
            <Link href="/verifikacija" className="text-sm font-semibold text-brand-600">
              Potvrdi email
            </Link>
          ) : null}
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">KYC</span>
            <span className="font-medium">Nije verifikovan</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Nalog kreiran</span>
            <span className="font-medium">{createdAt ? formatDate(createdAt) : '—'}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
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
