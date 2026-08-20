'use client'

import { useState } from 'react'
import { CircleCheckBigIcon, ShieldCheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/page-loading'
import { Checkbox } from '@/components/ui/checkbox'
import { useKycVerification, useStartKyc } from '@/hooks/kyc'
import { kycStatusLabel } from '@/lib/kyc/kyc.helpers'
import { cn } from '@/lib/utils'
import type { KycDbStatus } from '@/types/kyc'

function statusTone(status: KycDbStatus): 'ok' | 'danger' | 'pending' {
  if (status === 'verified') return 'ok'
  if (status === 'rejected' || status === 'expired') return 'danger'
  return 'pending'
}

function canStart(status: KycDbStatus | undefined): boolean {
  return status !== 'verified'
}

export default function ProfileVerificationPage() {
  const { data: kyc, isLoading } = useKycVerification()
  const startKyc = useStartKyc()
  const [consentChecked, setConsentChecked] = useState(false)
  const [formError, setFormError] = useState('')

  const status = kyc?.status
  const verified = status === 'verified'

  const handleStart = async () => {
    setFormError('')
    try {
      const result = await startKyc.mutateAsync()
      if ('alreadyVerified' in result && result.alreadyVerified) {
        return
      }
      if ('url' in result && result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Došlo je do greške.')
    }
  }

  if (isLoading) {
    return <PageLoading>Učitavanje verifikacije…</PageLoading>
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-600">
            <ShieldCheckIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="m-0 text-xl font-normal tracking-[-0.02em] text-foreground">
              Verifikacija identiteta
            </h1>
            <p className="mt-1 mb-0 text-sm leading-relaxed text-muted-foreground">
              Potreban ti je važeći lični dokument i pristup kameri radi provere lica
              (liveness). Proces traje samo nekoliko minuta.
            </p>
          </div>
        </div>

        {status ? (
          <p
            className={cn(
              'mb-0 rounded-md px-3 py-2 text-sm font-medium',
              statusTone(status) === 'ok' && 'bg-success-soft text-success',
              statusTone(status) === 'danger' && 'bg-red-50 text-destructive',
              statusTone(status) === 'pending' && 'bg-muted text-foreground'
            )}
          >
            {kycStatusLabel(status)}
          </p>
        ) : null}
      </section>

      {verified ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CircleCheckBigIcon className="mt-0.5 size-6 text-brand-600" aria-hidden />
            <div>
              <p className="m-0 text-[15px] font-semibold text-foreground">Identitet je potvrđen</p>
              <p className="mt-1 mb-0 text-sm text-muted-foreground">
                Možeš da iznajmljuješ i objavljuješ predmete bez ponovne provere.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mt-0 mb-3 text-base font-semibold text-foreground">Priprema</h2>
          <ul className="m-0 mb-5 list-disc space-y-1.5 pl-5 text-sm text-foreground">
            <li>Lična karta, pasoš ili vozačka dozvola</li>
            <li>Dobra osvetljenost i stabilna kamera</li>
            <li>Preusmerenje na Didit, našeg partnera za KYC</li>
          </ul>

          <h2 className="mt-0 mb-2 text-base font-semibold text-foreground">Saglasnost</h2>
          <p className="mt-0 mb-4 text-sm leading-relaxed text-muted-foreground">
            Klikom na dugme ispod bićeš preusmeren na Didit. Tokom procesa obrađuju se podaci sa
            dokumenta i biometrijski podaci (snimak lica) radi poređenja sa dokumentom. Podaci se
            koriste isključivo u svrhu verifikacije identiteta i sprečavanja prevara.
          </p>

          <label className="mb-5 flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <Checkbox
              checked={consentChecked}
              onCheckedChange={(value) => setConsentChecked(value === true)}
              className="mt-0.5"
            />
            <span>
              Slažem se sa obradom mojih ličnih i biometrijskih podataka u svrhu verifikacije
              identiteta.
            </span>
          </label>

          {formError ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <Button
            type="button"
            fullWidth
            size="lg"
            loading={startKyc.isPending}
            disabled={!consentChecked || startKyc.isPending || !canStart(status)}
            onClick={handleStart}
          >
            Pokreni verifikaciju
          </Button>
        </section>
      )}
    </div>
  )
}
