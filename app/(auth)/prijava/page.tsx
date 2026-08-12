'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
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
      <h1 className="mb-7 text-2xl font-bold tracking-[-0.02em] text-card-foreground">
        Prijavi se
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
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
              className="text-[13px] font-medium text-brand-600"
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
          <p className="m-0 rounded-md bg-red-50 px-3.5 py-3 text-sm text-destructive">
            {formErrorMessage}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={signIn.isPending}>
          Prijavi se
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Nemaš nalog?{' '}
        <Link href="/registracija" className="font-semibold text-brand-600">
          Registruj se
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[200px]" />}>
      <LoginForm />
    </Suspense>
  )
}
