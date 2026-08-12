'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { TextField } from '@/components/ui/text-field'
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
      <h1 className="mb-2 text-2xl font-normal tracking-[-0.02em] text-card-foreground">
        Napravi nalog
      </h1>
      <p className="mb-7 text-[15px] text-muted-foreground">
        Treba ti samo email i lozinka. Ostalo možeš kasnije.
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
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="accepted-terms"
              checked={acceptedTerms}
              aria-invalid={termsError ? true : undefined}
              className="mt-0.5 size-[18px]"
              onCheckedChange={(checked) => {
                const nextAccepted = checked === true
                setAcceptedTerms(nextAccepted)
                if (showErrors || termsError) {
                  setTermsError(nextAccepted ? '' : 'Moraš prihvatiti uslove korišćenja.')
                }
              }}
            />
            <Label
              htmlFor="accepted-terms"
              className="cursor-pointer text-sm leading-[1.45] font-normal text-foreground"
            >
              Prihvatam{' '}
              <Link href="/terms" className="font-medium text-brand-600">
                Uslove korišćenja
              </Link>{' '}
              i{' '}
              <Link href="/privacy" className="font-medium text-brand-600">
                Politiku privatnosti
              </Link>
            </Label>
          </div>
          {termsError ? (
            <p className="mt-1.5 mb-0 text-[13px] text-destructive">{termsError}</p>
          ) : null}
        </div>

        {formErrorMessage ? (
          <p className="m-0 rounded-md bg-red-50 px-3.5 py-3 text-sm text-destructive">
            {formErrorMessage}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={signUp.isPending} disabled={!acceptedTerms}>
          Napravi nalog
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Već imaš nalog?{' '}
        <Link href="/auth/login" className="font-semibold text-brand-600">
          Prijavi se
        </Link>
      </p>
    </div>
  )
}
