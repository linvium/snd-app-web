'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/auth/PasswordInput'
import { useSignIn } from '@/hooks/auth/useAuth'
import { validateEmail } from '@/lib/auth-validation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const signIn = useSignIn()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowErrors(true)

    const nextEmailError = validateEmail(email)
    const nextPasswordError = password ? '' : 'Unesi lozinku.'
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError || nextPasswordError) return

    signIn.mutate(
      { email, password },
      {
        onSuccess: () => {
          router.push(next)
          router.refresh()
        },
      }
    )
  }

  const formErrorMessage = (() => {
    if (!signIn.isError || !signIn.error) return ''
    const msg = (signIn.error as Error).message?.toLowerCase() || ''
    if (msg.includes('banned') || msg.includes('suspended') || msg.includes('disabled')) {
      return 'Nalog je privremeno blokiran.'
    }
    return 'Pogrešan email ili lozinka.'
  })()

  return (
    <div>
      <h1
        style={{
          margin: '0 0 28px',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
          letterSpacing: '-0.02em',
        }}
      >
        Prijavi se
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Input
          label="Email"
          type="email"
          name="email"
          autoFocus
          autoComplete="email"
          value={email}
          error={emailError}
          onChange={(e) => {
            setEmail(e.target.value)
            if (showErrors || emailError) setEmailError(validateEmail(e.target.value))
          }}
          onBlur={() => setEmailError(validateEmail(email))}
        />

        <PasswordInput
          label="Lozinka"
          name="password"
          autoComplete="current-password"
          value={password}
          error={passwordError}
          trailingLink={
            <Link
              href="/zaboravljena-lozinka"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-brand-600)',
              }}
            >
              Zaboravljena lozinka?
            </Link>
          }
          onChange={(e) => {
            setPassword(e.target.value)
            if (showErrors || passwordError) {
              setPasswordError(e.target.value ? '' : 'Unesi lozinku.')
            }
          }}
          onBlur={() => setPasswordError(password ? '' : 'Unesi lozinku.')}
        />

        {formErrorMessage ? (
          <p
            style={{
              margin: 0,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error-soft)',
              color: 'var(--color-error)',
              fontSize: '14px',
            }}
          >
            {formErrorMessage}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={signIn.isPending}>
          Prijavi se
        </Button>
      </form>

      <p
        style={{
          margin: '24px 0 0',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--color-gray-500)',
        }}
      >
        Nemaš nalog?{' '}
        <Link href="/registracija" style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>
          Registruj se
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '200px' }} />}>
      <LoginForm />
    </Suspense>
  )
}
