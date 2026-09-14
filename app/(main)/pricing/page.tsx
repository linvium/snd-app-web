import type { Metadata } from 'next'

import { PricingPlans } from '@/components/billing/PricingPlans'
import { PRICING_PATH } from '@/lib/billing/billing.helpers'
import { loadBillingCatalog } from '@/lib/billing/billing.server'
import { createPublicClient } from '@/lib/supabase/public'

const DESCRIPTION =
  'Iznajmljivanje na SND-u je besplatno. Plaća se samo objavljivanje oglasa - mesečnom pretplatom ili kreditima.'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Pretplata i krediti | SND',
  description: DESCRIPTION,
  alternates: { canonical: PRICING_PATH },
}

/**
 * The public price list.
 *
 * Rendered on the server from the catalogue tables, so a price edit in the
 * database is live within the revalidation window without a deploy. The buy
 * buttons are the only client part.
 */
export default async function PricingPage() {
  const catalog = await loadBillingCatalog(createPublicClient())

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:py-12">
      <header className="mb-10 max-w-[680px]">
        <p className="m-0 text-[12px] font-semibold tracking-[0.09em] text-brand-700 uppercase">
          Cenovnik
        </p>
        <h1 className="mt-2 mb-0 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-foreground md:text-[34px]">
          Pretplata i krediti
        </h1>
        <p className="mt-3 mb-0 text-base leading-relaxed text-muted-foreground">
          {DESCRIPTION} Zakupci ne plaćaju ništa platformi, a cenu najma dogovaraju direktno sa
          vlasnikom.
        </p>
      </header>

      <PricingPlans plans={catalog.plans} packs={catalog.packs} loginNext={PRICING_PATH} />
    </div>
  )
}
