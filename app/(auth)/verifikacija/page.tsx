'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import OtpInput from '@/components/auth/OtpInput'
import { useResendOtp, useVerifyOtp } from '@/hooks/auth/useAuth'

function StatusBanner({
  tone,
  children,
}: {
  tone: 'info' | 'success' | 'error'
  children: React.ReactNode
}) {
  const styles = {
    info: {
      background: 'var(--color-info-soft)',
      color: 'var(--color-info)',
    },
    success: {
      background: 'var(--color-success-soft)',
      color: 'var(--color-success)',
    },
    error: {
      background: 'var(--color-error-soft)',
      color: 'var(--color-error)',
    },
  }[tone]

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        margin: 0,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: '14px',
        fontWeight: 500,
        ...styles,
      }}
    >
      {tone !== 'error' ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{ animation: tone === 'info' ? 'spin 0.8s linear infinite' : undefined, flexShrink: 0 }}
        >
          {tone === 'info' ? (
            <>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <path
              d="M20 6 9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
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
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 20px',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-brand-50)',
          color: 'var(--color-brand-600)',
        }}
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>

      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
          letterSpacing: '-0.02em',
        }}
      >
        Proveri sanduče
      </h1>
      <p style={{ margin: '0 0 28px', color: 'var(--color-gray-500)', fontSize: '15px', lineHeight: 1.5 }}>
        Poslali smo 6-cifreni kod na <strong style={{ color: 'var(--color-gray-900)' }}>{email}</strong>.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleVerify()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div style={{ opacity: isBusy ? 0.55 : 1, pointerEvents: isBusy ? 'none' : 'auto' }}>
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

      <div
        style={{
          margin: '24px 0',
          height: '1px',
          background: 'var(--color-gray-200)',
        }}
      />

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
        style={{
          margin: '20px 0 0',
          fontSize: '14px',
          color: 'var(--color-gray-500)',
          opacity: isBusy ? 0.5 : 1,
          pointerEvents: isBusy ? 'none' : 'auto',
        }}
      >
        Pogrešna adresa?{' '}
        <Link href={backHref} style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>
          Idi nazad
        </Link>
      </p>
    </div>
  )
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '240px' }} />}>
      <VerificationForm />
    </Suspense>
  )
}
