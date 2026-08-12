'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useResetPassword } from '@/hooks/auth/useAuth'
import { validateEmail } from '@/lib/auth-validation'

export default function ForgotPasswordPage() {
  const resetPassword = useResetPassword()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowErrors(true)

    const nextEmailError = validateEmail(email)
    setEmailError(nextEmailError)
    if (nextEmailError) return

    resetPassword.mutate({ email })
  }

  return (
    <div>
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
          letterSpacing: '-0.02em',
        }}
      >
        Zaboravljena lozinka
      </h1>
      <p style={{ margin: '0 0 28px', color: 'var(--color-gray-500)', fontSize: '15px' }}>
        Unesi email adresu i poslaćemo ti kod za resetovanje.
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

        <Button type="submit" fullWidth loading={resetPassword.isPending}>
          Pošalji kod
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
        Seti se lozinke?{' '}
        <Link href="/prijava" style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>
          Prijavi se
        </Link>
      </p>
    </div>
  )
}
