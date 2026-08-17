import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Logo from '@/components/ui/Logo'
import { isTerminalKycStatus, kycStatusLabel } from '@/lib/kyc/kyc.helpers'
import { cn } from '@/lib/utils'
import type { SessionStatus } from '@/types/didit'
import type { KycDbStatus, KycVerificationRecord } from '@/types/kyc'
import { KycDoneFollowUp } from './KycDoneFollowUp'

export const dynamic = 'force-dynamic'

interface DoneSearchParams {
  verificationSessionId?: string
  status?: string
}

function statusTone(status: KycDbStatus): 'ok' | 'danger' | 'pending' {
  if (status === 'verified') return 'ok'
  if (status === 'rejected' || status === 'expired') return 'danger'
  return 'pending'
}

const DIDIT_STATUSES: SessionStatus[] = [
  'Not Started',
  'In Progress',
  'Awaiting User',
  'In Review',
  'Approved',
  'Declined',
  'Resubmitted',
  'Abandoned',
  'Expired',
  'Kyc Expired',
]

function isSessionStatus(value: string): value is SessionStatus {
  return DIDIT_STATUSES.includes(value as SessionStatus)
}

function leadCopy(status: KycDbStatus | undefined): string {
  if (status === 'verified') {
    return 'Identitet je potvrđen. Za trenutak te vraćamo na profil.'
  }
  if (status === 'rejected') {
    return 'Verifikacija nije prihvaćena. Možeš da pokušaš ponovo sa profila.'
  }
  if (status === 'expired') {
    return 'Verifikacija je istekla. Možeš da je pokreneš ponovo sa profila.'
  }
  return 'Još uvek obrađujemo verifikaciju. Ostani na stranici - čim bude gotovo, vraćamo te na profil.'
}

async function loadRecord(sessionId: string): Promise<KycVerificationRecord | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
    return null
  }

  const res = await fetch(
    `${url}/functions/v1/kyc-sync?session_id=${encodeURIComponent(sessionId)}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: 'no-store',
    }
  )
  if (!res.ok) return null
  return res.json() as Promise<KycVerificationRecord>
}

export default async function KycDonePage({
  searchParams,
}: {
  searchParams: Promise<DoneSearchParams>
}) {
  const params = await searchParams
  const sessionId = params.verificationSessionId
  const unverifiedStatusHint = params.status

  const record = sessionId ? await loadRecord(sessionId) : null
  const displayStatus = record?.status
  const tone = displayStatus ? statusTone(displayStatus) : 'pending'
  const title = displayStatus ? kycStatusLabel(displayStatus) : 'Još uvek obrađujemo'
  const pending = !record || !isTerminalKycStatus(record.status)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {displayStatus === 'verified' ? <KycDoneFollowUp mode="redirect" /> : null}
      {pending ? <KycDoneFollowUp mode="reload" /> : null}

      <header className="h-16 border-b border-border bg-card">
        <div className="mx-auto flex h-full max-w-[720px] items-center px-4">
          <Link href="/" aria-label="SND početna">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col px-5 py-10">
        <p className="mb-2 text-sm font-medium text-brand-600">Verifikacija</p>
        <h1 className="m-0 text-[clamp(24px,5vw,32px)] font-normal tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        <p className="mt-3 mb-6 text-[15px] leading-relaxed text-muted-foreground">
          {leadCopy(displayStatus)}
        </p>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="m-0 text-[13px] font-medium text-muted-foreground">Status</p>
          <p
            className={cn(
              'mt-2 mb-0 text-lg font-semibold',
              tone === 'ok' && 'text-success',
              tone === 'danger' && 'text-destructive',
              tone === 'pending' && 'text-foreground'
            )}
          >
            {displayStatus ? kycStatusLabel(displayStatus) : 'U toku'}
          </p>
        </section>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/profile">
            <Button size="lg" fullWidth>
              {displayStatus === 'verified' ? 'Nastavi na profil' : 'Nazad na profil'}
            </Button>
          </Link>
          {sessionId && pending ? (
            <Link
              href={`/kyc/done?verificationSessionId=${encodeURIComponent(sessionId)}${
                unverifiedStatusHint && isSessionStatus(unverifiedStatusHint)
                  ? `&status=${encodeURIComponent(unverifiedStatusHint)}`
                  : ''
              }`}
            >
              <Button variant="ghost" fullWidth>
                Osveži
              </Button>
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  )
}
