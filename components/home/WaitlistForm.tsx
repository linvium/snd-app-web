'use client'

import { useState } from 'react'
import { CircleCheckBigIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useJoinWaitlist } from '@/hooks/waitlist'
import { validateEmail } from '@/lib/waitlist'
import { cn } from '@/lib/utils'

export default function WaitlistForm({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const joinWaitlist = useJoinWaitlist()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const isDark = tone === 'dark'

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
      <div className="flex w-full flex-col items-center gap-4" role="status">
        <CircleCheckBigIcon
          className={cn('size-20', isDark ? 'text-[#f0b010]' : 'text-[#209080]')}
          strokeWidth={1.75}
          aria-hidden
        />
        <p
          className={cn(
            'm-0 text-[22px] leading-snug font-medium tracking-[-0.03em]',
            isDark ? 'text-white' : 'text-[#001a36]'
          )}
        >
          Super. Javićemo ti pre 15. septembra.
        </p>
      </div>
    )
  }

  const formErrorMessage = (() => {
    if (!joinWaitlist.isError || !joinWaitlist.error) return ''
    return 'Prijava nije uspela. Pokušaj ponovo.'
  })()

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-start">
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
          className={cn(
            isDark &&
              'h-12 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-[#f0b010] focus-visible:ring-[#f0b010]/25'
          )}
        />
        {emailError ? (
          <p className={cn('m-0 text-[13px]', isDark ? 'text-red-300' : 'text-destructive')}>{emailError}</p>
        ) : null}
        {formErrorMessage ? (
          <p className={cn('m-0 text-[13px]', isDark ? 'text-red-300' : 'text-destructive')}>
            {formErrorMessage}
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        loading={joinWaitlist.isPending}
        className={cn(
          'h-11 border-transparent bg-[#f0b010] text-[#001a36] hover:bg-[#e0a40e] hover:text-[#001a36] sm:w-auto',
          isDark && 'h-12 px-6'
        )}
      >
        Prijavi me
      </Button>
    </form>
  )
}
