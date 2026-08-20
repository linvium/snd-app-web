import Link from 'next/link'
import { BadgeCheckIcon, ShieldAlertIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { kycStatusLabel } from '@/lib/kyc/kyc.helpers'
import { SETTINGS_VERIFICATION } from '@/lib/profiles'
import { cn } from '@/lib/utils'
import type { KycDbStatus } from '@/types/kyc'

function copyFor(status: KycDbStatus | null): { title: string; body: string; cta: string } {
  switch (status) {
    case 'in_progress':
      return {
        title: 'Verifikacija je u toku',
        body: 'Provera je pokrenuta. Javićemo ti čim bude gotova.',
        cta: 'Vidi status',
      }
    case 'rejected':
      return {
        title: 'Verifikacija je odbijena',
        body: 'Pokušaj ponovo sa jasnijom slikom dokumenta.',
        cta: 'Pokušaj ponovo',
      }
    case 'expired':
      return {
        title: 'Verifikacija je istekla',
        body: 'Obnovi je da bi ti profil ponovo nosio oznaku potvrđenog identiteta.',
        cta: 'Obnovi verifikaciju',
      }
    case 'pending_payment':
      return {
        title: 'Verifikacija čeka plaćanje',
        body: 'Dovrši korak plaćanja da bi provera krenula.',
        cta: 'Nastavi',
      }
    default:
      return {
        title: 'Identitet nije potvrđen',
        body: 'Potvrđen identitet nosi oznaku na profilu i vidno podiže broj prihvaćenih zahteva.',
        cta: 'Potvrdi identitet',
      }
  }
}

/**
 * One box, two states — the badge when the identity is confirmed, the call to
 * action when it is not. Shown on the manager home and on the profile page so
 * the answer is in the same place in both.
 */
export function VerificationBox({
  status,
  className,
}: {
  status: KycDbStatus | null
  className?: string
}) {
  const verified = status === 'verified'

  if (verified) {
    return (
      <section
        data-testid="verification-box"
        data-state="verified"
        className={cn(
          'flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4',
          className
        )}
      >
        <BadgeCheckIcon className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-brand-700">Identitet potvrđen</p>
          <p className="mt-0.5 mb-0 text-[13px] leading-relaxed text-brand-700/80">
            Tvoj profil nosi oznaku verifikovanog korisnika.
          </p>
        </div>
      </section>
    )
  }

  const copy = copyFor(status)

  return (
    <section
      data-testid="verification-box"
      data-state="unverified"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 sm:flex-row sm:items-center',
        className
      )}
    >
      <ShieldAlertIcon className="size-5 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-amber-900">{copy.title}</p>
        <p className="mt-0.5 mb-0 text-[13px] leading-relaxed text-amber-900/80">
          {status && status !== 'not_started' ? `${kycStatusLabel(status)} · ` : ''}
          {copy.body}
        </p>
      </div>
      <Button size="sm" asChild className="shrink-0">
        <Link href={SETTINGS_VERIFICATION}>{copy.cta}</Link>
      </Button>
    </section>
  )
}
