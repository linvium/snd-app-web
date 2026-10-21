'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MobileBackLink } from '@/components/layout/MobileBackLink'
import { useResendOtp } from '@/hooks/auth'
import { useAuthSession } from '@/context/AuthContext'
import { toast } from 'sonner'

export function EmailUnverifiedGate() {
  const { user } = useAuthSession()
  const resend = useResendOtp()
  const [sent, setSent] = useState(false)

  // Phone-only accounts have no email at all - verify the phone instead.
  const isPhoneAccount = !user?.email && Boolean(user?.phone)

  const handleResend = () => {
    if (isPhoneAccount) {
      if (!user?.phone) return
      resend.mutate(
        { phone: user.phone, flowType: 'register' },
        {
          onSuccess: () => {
            setSent(true)
            toast.success('Poslali smo novi kod na tvoj broj.')
          },
          onError: () => {
            toast.error('Nismo mogli da pošaljemo kod. Pokušaj ponovo.')
          },
        }
      )
      return
    }

    if (!user?.email) return
    resend.mutate(
      { email: user.email, flowType: 'register' },
      {
        onSuccess: () => {
          setSent(true)
          toast.success('Poslali smo novi kod na tvoj email.')
        },
        onError: () => {
          toast.error('Nismo mogli da pošaljemo kod. Pokušaj ponovo.')
        },
      }
    )
  }

  return (
    <section className="mx-auto max-w-[640px] rounded-xl border border-border bg-card p-6" data-testid="email-gate">
      <div className="mb-2 flex items-center gap-1">
        <MobileBackLink href="/profile" />
        <h1 className="m-0 text-xl font-semibold text-card-foreground">
          {isPhoneAccount ? 'Potvrdi telefon pre objave' : 'Potvrdi email pre objave'}
        </h1>
      </div>
      <p className="mt-2 mb-5 text-base text-muted-foreground">
        {isPhoneAccount
          ? 'Moraš potvrditi broj telefona pre objave.'
          : 'Moraš potvrditi email adresu pre objave.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleResend} loading={resend.isPending}>
          {sent ? 'Pošalji ponovo' : 'Pošalji ponovo'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link
            href={
              isPhoneAccount
                ? `/auth/verify?identifier=${encodeURIComponent(user?.phone ?? '')}&channel=phone&type=register`
                : `/auth/verify?identifier=${encodeURIComponent(user?.email ?? '')}&channel=email&type=register`
            }
          >
            Unesi kod
          </Link>
        </Button>
      </div>
    </section>
  )
}
