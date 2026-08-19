import Link from 'next/link'

import { CANCELLATION_COPY } from '@/lib/listings'
import type { CancellationPolicy } from '@/types/listing'

/**
 * Cancellation terms (doc 04 §8).
 *
 * The full table, not just the policy's name. "Strogo" tells a reader nothing
 * they can act on; three lines with days and percentages tell them exactly what
 * they are agreeing to, before they agree to it.
 */
export default function CancellationTerms({ policy }: { policy: CancellationPolicy }) {
  const copy = CANCELLATION_COPY[policy]

  return (
    <section>
      <h2 className="mt-0 mb-3 text-lg font-semibold text-card-foreground">
        Otkazivanje: {copy.label}
      </h2>

      <ul className="m-0 list-none space-y-2 rounded-xl border border-border p-4 text-sm text-foreground">
        {copy.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-brand-500" aria-hidden>
              →
            </span>
            {line}
          </li>
        ))}
      </ul>

      <Link
        href="/cancellation-policy"
        className="mt-3 inline-block text-sm font-semibold text-brand-700 no-underline hover:underline"
      >
        Više o pravilima otkazivanja →
      </Link>
    </section>
  )
}
