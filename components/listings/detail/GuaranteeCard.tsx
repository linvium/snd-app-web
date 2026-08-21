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
 *
 * The item's value sits here rather than under the price table, because this is
 * the only place on the page where that number does any work: it is what the
 * cap is measured against.
 *
 * This is the page's one tinted block. Everything around it is white on grey,
 * which is what lets a single band of brand colour still mean something.
 */
export default function GuaranteeCard({
  capMinor,
  itemValueMinor,
}: {
  capMinor: number | null
  itemValueMinor?: number | null
}) {
  if (capMinor == null) return null

  return (
    <section className="flex gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
      <ShieldCheckIcon
        className="mt-0.5 size-6 flex-none text-brand-600"
        strokeWidth={1.8}
        aria-hidden
      />

      <div>
        <h2 className="mt-0 mb-1 text-base font-semibold text-brand-700">
          Pokriveno garancijom do {formatPriceMinor(capMinor)}
        </h2>
        <p className="m-0 text-sm text-zinc-700">
          Ako se predmetu nešto desi tokom iznajmljivanja, mi to rešavamo.
        </p>

        {itemValueMinor != null ? (
          <p className="mt-1 mb-0 text-[13px] text-zinc-600">
            Vrednost predmeta:{' '}
            <span className="font-medium text-zinc-700">{formatPriceMinor(itemValueMinor)}</span>
          </p>
        ) : null}

        <Link
          href="/support/guarantee"
          className="mt-2 inline-block text-sm font-semibold text-brand-700 no-underline hover:underline"
        >
          Kako radi garancija →
        </Link>
      </div>
    </section>
  )
}
