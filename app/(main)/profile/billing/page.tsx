import { Suspense } from 'react'

import { BillingOverview } from '@/components/billing/BillingOverview'

export const metadata = {
  title: 'Pretplata i krediti',
}

export default function ProfileBillingPage() {
  return (
    // The overview reads `?order=` from the provider's redirect.
    <Suspense fallback={null}>
      <BillingOverview />
    </Suspense>
  )
}
