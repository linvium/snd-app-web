'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/auth/PasswordInput'
import PasswordStrength from '@/components/auth/PasswordStrength'
import { useSignUp } from '@/hooks/auth/useAuth'
import { validateEmail, validatePassword } from '@/lib/auth-validation'

export default function RegisterPage() {
  const signUp = useSignUp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [termsError, setTermsError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowErrors(true)

    const nextEmailError = validateEmail(email)
    const nextPasswordError = validatePassword(password)
    const nextTermsError = acceptedTerms ? '' : 'Moraš prihvatiti uslove korišćenja.'
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    setTermsError(nextTermsError)
    if (nextEmailError || nextPasswordError || nextTermsError) return

    signUp.mutate({ email, password })
  }

  const formErrorMessage = (() => {
    if (!signUp.isError || !signUp.error) return ''
    const msg = (signUp.error as Error).message?.toLowerCase() || ''
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return 'Nalog sa ovim emailom već postoji. Prijavi se ili resetuj lozinku.'
    }
    return 'Registracija nije uspela. Pokušaj ponovo.'
  })()

  return (
    <div>
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        Napravi nalog
      </h1>
      <p
        style={{
          margin: '0 0 28px',
          color: 'var(--color-gray-500)',
          fontSize: '15px',
          textAlign: 'center',
        }}
      >
        Treba ti samo email i lozinka. Ostalo možeš kasnije.
      </p>

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
          autoComplete="new-password"
          value={password}
          error={passwordError}
          indicator={<PasswordStrength password={password} />}
          onChange={(e) => {
            setPassword(e.target.value)
            if (showErrors || passwordError) setPasswordError(validatePassword(e.target.value))
          }}
          onBlur={() => setPasswordError(validatePassword(password))}
        />

        <div>
          <label
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '14px',
              lineHeight: 1.45,
              cursor: 'pointer',
              color: 'var(--color-gray-700)',
            }}
          >
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked)
                if (showErrors || termsError) {
                  setTermsError(e.target.checked ? '' : 'Moraš prihvatiti uslove korišćenja.')
                }
              }}
              style={{
                marginTop: '2px',
                width: '18px',
                height: '18px',
                accentColor: 'var(--color-brand-500)',
                flexShrink: 0,
              }}
            />
            <span>
              Prihvatam{' '}
              <Link href="/uslovi" style={{ color: 'var(--color-brand-600)', fontWeight: 500 }}>
                Uslove korišćenja
              </Link>{' '}
              i{' '}
              <Link href="/privatnost" style={{ color: 'var(--color-brand-600)', fontWeight: 500 }}>
                Politiku privatnosti
              </Link>
            </span>
          </label>
          {termsError ? (
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-error)' }}>
              {termsError}
            </p>
          ) : null}
        </div>

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

        <Button type="submit" fullWidth loading={signUp.isPending} disabled={!acceptedTerms}>
          Napravi nalog
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
        Već imaš nalog?{' '}
        <Link href="/prijava" style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>
          Prijavi se
        </Link>
      </p>
    </div>
  )
}
