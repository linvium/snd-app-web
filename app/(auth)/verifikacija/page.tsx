'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckIcon, Loader2Icon, MailIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import OtpInput from '@/components/auth/OtpInput'
import { useResendOtp, useVerifyOtp } from '@/hooks/auth/useAuth'
import { cn } from '@/lib/utils'

function StatusBanner({
  tone,
  children,
}: {
  tone: 'info' | 'success' | 'error'
  children: React.ReactNode
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'm-0 flex items-center justify-center gap-2.5 rounded-md px-3.5 py-3 text-sm font-medium',
        tone === 'info' && 'bg-info-soft text-info',
        tone === 'success' && 'bg-success-soft text-success',
        tone === 'error' && 'bg-red-50 text-destructive'
      )}
    >
      {tone === 'info' ? (
        <Loader2Icon className="size-[18px] shrink-0 animate-spin" aria-hidden />
      ) : null}
      {tone === 'success' ? (
        <CheckIcon className="size-[18px] shrink-0" aria-hidden />
      ) : null}
      {children}
    </div>
  )
}

function VerificationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const flowType = searchParams.get('tip') || 'registracija'
  const verifyOtp = useVerifyOtp()
  const resendOtp = useResendOtp()

  const [otp, setOtp] = useState('')
  const [seconds, setSeconds] = useState(60)
  const autoSubmittedRef = useRef(false)

  const backHref =
    flowType === 'reset'
      ? '/zaboravljena-lozinka'
      : flowType === 'registracija'
        ? '/registracija'
        : '/prijava'

  const isVerifying = verifyOtp.isPending
  const isRedirecting = verifyOtp.isSuccess
  const isBusy = isVerifying || isRedirecting

  useEffect(() => {
    if (!email) router.replace(backHref)
  }, [email, backHref, router])

  useEffect(() => {
    if (seconds <= 0) return
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  const handleVerify = (token = otp) => {
    if (token.length !== 6 || isBusy) return

    verifyOtp.mutate({
      email,
      token,
      type: flowType === 'reset' ? 'recovery' : 'email',
    })
  }

  useEffect(() => {
    if (otp.length === 6 && !autoSubmittedRef.current && !isBusy && !verifyOtp.isError) {
      autoSubmittedRef.current = true
      handleVerify(otp)
    }
    if (otp.length < 6) {
      autoSubmittedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submit only when otp completes
  }, [otp])

  const handleResend = () => {
    if (seconds > 0 || !email || isBusy) return
    resendOtp.mutate(
      {
        email,
        flowType: flowType === 'reset' ? 'reset' : 'registracija',
      },
      {
        onSuccess: () => setSeconds(60),
      }
    )
  }

  if (!email) return null

  const errorMessage =
    verifyOtp.isError || resendOtp.isError
      ? verifyOtp.isError
        ? 'Kod nije ispravan ili je istekao.'
        : 'Slanje koda nije uspelo. Pokušaj ponovo.'
      : ''

  const successLabel =
    flowType === 'reset' ? 'Kod je ispravan. Preusmeravamo te…' : 'Nalog je potvrđen. Preusmeravamo te…'

  return (
    <div className="text-center">
      <div
        className="mx-auto mb-5 grid size-12 place-items-center rounded-lg bg-brand-50 text-brand-600"
        aria-hidden
      >
        <MailIcon className="size-7" strokeWidth={1.8} />
      </div>

      <h1 className="mb-2 text-2xl font-normal tracking-[-0.02em] text-card-foreground">
        Proveri sanduče
      </h1>
      <p className="mb-7 text-[15px] leading-normal text-muted-foreground">
        Poslali smo 6-cifreni kod na{' '}
        <strong className="font-semibold text-card-foreground">{email}</strong>.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleVerify()
        }}
        className="flex flex-col gap-4"
      >
        <div className={cn(isBusy && 'pointer-events-none opacity-55')}>
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value)
              verifyOtp.reset()
              resendOtp.reset()
            }}
            error={!!errorMessage && !isBusy}
            disabled={isBusy}
          />
        </div>

        {isVerifying ? <StatusBanner tone="info">Proveravamo kod…</StatusBanner> : null}
        {isRedirecting ? <StatusBanner tone="success">{successLabel}</StatusBanner> : null}
        {errorMessage && !isBusy ? <StatusBanner tone="error">{errorMessage}</StatusBanner> : null}

        <Button type="submit" fullWidth loading={isBusy} disabled={otp.length !== 6 || isBusy}>
          {isRedirecting ? 'Preusmeravanje…' : isVerifying ? 'Provera…' : 'Potvrdi'}
        </Button>
      </form>

      <div className="my-6 h-px bg-border" />

      <Button
        type="button"
        variant="secondary"
        fullWidth
        loading={resendOtp.isPending}
        disabled={seconds > 0 || isBusy}
        onClick={handleResend}
      >
        {seconds > 0 ? `Pošalji ponovo (${seconds}s)` : 'Pošalji ponovo'}
      </Button>

      <p
        className={cn(
          'mt-5 text-sm text-muted-foreground',
          isBusy && 'pointer-events-none opacity-50'
        )}
      >
        Pogrešna adresa?{' '}
        <Link href={backHref} className="font-semibold text-brand-600">
          Idi nazad
        </Link>
      </p>
    </div>
  )
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-[240px]" />}>
      <VerificationForm />
    </Suspense>
  )
}
