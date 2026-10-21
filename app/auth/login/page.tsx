'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { AuthMethodTabs, type AuthMethod } from '@/components/auth/AuthMethodTabs'
import { PhoneField } from '@/components/auth/PhoneField'
import PasswordInput from '@/components/auth/PasswordInput'
import { useSignIn } from '@/hooks/auth'
import { validateEmail, validatePhone } from '@/lib/auth'
import { normalizePhone } from '@/lib/profiles'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const signIn = useSignIn()

  const [method, setMethod] = useState<AuthMethod>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [identifierError, setIdentifierError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const handleMethodChange = (nextMethod: AuthMethod) => {
    setMethod(nextMethod)
    setIdentifierError('')
    setShowErrors(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowErrors(true)

    const nextIdentifierError = method === 'phone' ? validatePhone(phone) : validateEmail(email)
    const nextPasswordError = password ? '' : 'Unesi lozinku.'
    setIdentifierError(nextIdentifierError)
    setPasswordError(nextPasswordError)
    if (nextIdentifierError || nextPasswordError) return

    signIn.mutate(
      method === 'phone'
        ? { method: 'phone', phone: normalizePhone(phone), password }
        : { method: 'email', email, password },
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
    return method === 'phone' ? 'Pogrešan broj telefona ili lozinka.' : 'Pogrešan email ili lozinka.'
  })()

  return (
    <div>
      <h1 className="mb-7 text-2xl font-normal tracking-[-0.02em] text-card-foreground">
        Prijavi se
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthMethodTabs value={method} onChange={handleMethodChange} disabled={signIn.isPending} />

        {method === 'phone' ? (
          <PhoneField
            value={phone}
            autoFocus
            error={identifierError}
            disabled={signIn.isPending}
            onChange={(next) => {
              setPhone(next)
              if (showErrors || identifierError) setIdentifierError(validatePhone(next))
            }}
            onBlur={() => setIdentifierError(validatePhone(phone))}
          />
        ) : (
          <TextField
            label="Email"
            type="email"
            name="email"
            autoFocus
            autoComplete="email"
            value={email}
            error={identifierError}
            disabled={signIn.isPending}
            onChange={(e) => {
              setEmail(e.target.value)
              if (showErrors || identifierError) setIdentifierError(validateEmail(e.target.value))
            }}
            onBlur={() => setIdentifierError(validateEmail(email))}
          />
        )}

        <PasswordInput
          label="Lozinka"
          name="password"
          autoComplete="current-password"
          value={password}
          error={passwordError}
          trailingLink={
            method === 'email' ? (
              <Link
                href="/auth/forgot-password"
                className="text-[13px] font-medium text-brand-600"
              >
                Zaboravljena lozinka?
              </Link>
            ) : undefined
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
        <Link href="/auth/register" className="font-semibold text-brand-600">
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
