import { Suspense } from 'react'
import { notFound } from 'next/navigation'

import { PaymentPanel } from '@/components/payments/PaymentPanel'
import { getPaymentLinkSummary } from '@/lib/bookings/bookings.server'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Plaćanje rezervacije',
  robots: { index: false, follow: false },
}

const TOKEN_RE = /^[0-9a-f]{24,64}$/i

/**
 * The pay page.
 *
 * Rendered on the server from the token alone, so the link works from the email
 * on any device - signing in is only required at the moment of confirming, when
 * we have to know it is the renter pressing the button.
 */
export default async function PaymentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!TOKEN_RE.test(token)) notFound()

  const supabase = await createClient()
  const [summary, { data: auth }] = await Promise.all([
    getPaymentLinkSummary(supabase, token),
    supabase.auth.getUser(),
  ])

  if (!summary) notFound()

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-8">
      {/* The panel reads `?status=` from the provider's redirect. */}
      <Suspense fallback={null}>
        <PaymentPanel summary={summary} isSignedIn={Boolean(auth.user)} />
      </Suspense>
    </main>
  )
}
