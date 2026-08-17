'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useResendOtp } from '@/hooks/auth'
import { useAuthSession } from '@/context/AuthContext'
import { toast } from 'sonner'

export function EmailUnverifiedGate() {
  const { user } = useAuthSession()
  const resend = useResendOtp()
  const [sent, setSent] = useState(false)

  const handleResend = () => {
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
      <h1 className="m-0 text-xl font-semibold text-card-foreground">Potvrdi email pre objave</h1>
      <p className="mt-2 mb-5 text-base text-muted-foreground">
        Moraš potvrditi email adresu pre objave.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleResend} loading={resend.isPending}>
          {sent ? 'Pošalji ponovo' : 'Pošalji ponovo'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/auth/verify">Unesi kod</Link>
        </Button>
      </div>
    </section>
  )
}
