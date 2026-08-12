'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
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
      <h1 className="mb-2 text-2xl font-normal tracking-[-0.02em] text-card-foreground">
        Zaboravljena lozinka
      </h1>
      <p className="mb-7 text-[15px] text-muted-foreground">
        Unesi email adresu i poslaćemo ti kod za resetovanje.
      </p>

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

        <Button type="submit" fullWidth loading={resetPassword.isPending}>
          Pošalji kod
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Seti se lozinke?{' '}
        <Link href="/prijava" className="font-semibold text-brand-600">
          Prijavi se
        </Link>
      </p>
    </div>
  )
}
