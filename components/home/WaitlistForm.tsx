'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useJoinWaitlist } from '@/hooks/waitlist'
import { validateEmail } from '@/lib/waitlist'

export default function WaitlistForm() {
  const joinWaitlist = useJoinWaitlist()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const submitted = joinWaitlist.isSuccess

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setShowErrors(true)

    const nextEmailError = validateEmail(email)
    setEmailError(nextEmailError)
    if (nextEmailError) return

    joinWaitlist.mutate(email)
  }

  if (submitted) {
    return (
      <p className="m-0 text-[15px] font-medium text-brand-700" role="status">
        Super. Javićemo ti čim krenemo.
      </p>
    )
  }

  const formErrorMessage = (() => {
    if (!joinWaitlist.isError || !joinWaitlist.error) return ''
    return 'Prijava nije uspela. Pokušaj ponovo.'
  })()

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="waitlist-email" className="sr-only">
          Email
        </label>
        <Input
          id="waitlist-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tvoj@email.com"
          value={email}
          aria-invalid={emailError ? true : undefined}
          onChange={(event) => {
            setEmail(event.target.value)
            if (showErrors || emailError) setEmailError(validateEmail(event.target.value))
          }}
          onBlur={() => setEmailError(validateEmail(email))}
        />
        {emailError ? <p className="m-0 text-[13px] text-destructive">{emailError}</p> : null}
        {formErrorMessage ? (
          <p className="m-0 text-[13px] text-destructive">{formErrorMessage}</p>
        ) : null}
      </div>
      <Button
        type="submit"
        loading={joinWaitlist.isPending}
        className="h-11 border-transparent bg-[#f0b010] text-[#001a36] hover:bg-[#e0a40e] hover:text-[#001a36] sm:w-auto"
      >
        Prijavi me
      </Button>
    </form>
  )
}
