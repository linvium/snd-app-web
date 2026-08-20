'use client'

import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'

import { VerificationBox } from '@/components/profile/VerificationBox'
import { useKycVerification } from '@/hooks/kyc'
import { useSignOut } from '@/hooks/auth'
import { SETTINGS_NAV } from '@/lib/profiles'
import { cn } from '@/lib/utils'

export default function SettingsIndexPage() {
  const { data: kyc } = useKycVerification()
  const signOut = useSignOut()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 hidden text-[22px] font-normal text-foreground lg:block">Podešavanja</h1>

      <VerificationBox status={kyc?.status ?? null} />

      <nav
        aria-label="Podešavanja"
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        {SETTINGS_NAV.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-between gap-3 p-4 no-underline hover:bg-muted/50',
              index > 0 && 'border-t border-border'
            )}
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-card-foreground">
                {item.label}
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                {item.description}
              </span>
            </span>
            <ChevronRightIcon
              className="size-[18px] shrink-0 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
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
