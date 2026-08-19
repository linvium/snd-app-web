import Link from 'next/link'
import { ShieldCheckIcon } from 'lucide-react'

import { formatPriceMinor } from '@/lib/search'

/**
 * Guarantee (doc 04 §10).
 *
 * The cover figure is the category's cap held down to the item's own value, so
 * the number shown is one the platform would actually pay — a 200.000 RSD
 * headline over a 25.000 RSD drill would be a promise about someone else's
 * property.
 */
export default function GuaranteeCard({ capMinor }: { capMinor: number | null }) {
  if (capMinor == null) return null

  return (
    <section className="flex gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
      <ShieldCheckIcon className="mt-0.5 size-6 flex-none text-brand-600" strokeWidth={1.8} aria-hidden />

      <div>
        <h2 className="mt-0 mb-1 text-base font-semibold text-brand-700">
          Pokriveno garancijom do {formatPriceMinor(capMinor)}
        </h2>
        <p className="m-0 text-sm text-zinc-700">
          Ako se predmetu nešto desi tokom iznajmljivanja, mi to rešavamo.
        </p>
        <Link
          href="/guarantee"
          className="mt-2 inline-block text-sm font-semibold text-brand-700 no-underline hover:underline"
        >
          Kako radi garancija →
        </Link>
      </div>
    </section>
  )
}
