import Link from 'next/link'
import { CalendarXIcon } from 'lucide-react'

import { CANCELLATION_COPY } from '@/lib/listings'
import type { CancellationPolicy } from '@/types/listing'

/**
 * Cancellation terms (doc 04 §8).
 *
 * The full table, not just the policy's name. "Strogo" tells a reader nothing
 * they can act on; three lines with days and percentages tell them exactly what
 * they are agreeing to, before they agree to it.
 *
 * The icon and the policy pill are here to make the section findable on a long
 * page — this is the one block a reader comes back for after they have decided.
 * Deliberately not tinted: a coloured panel would read as a warning, and these
 * are terms, not a problem.
 */
export default function CancellationTerms({ policy }: { policy: CancellationPolicy }) {
  const copy = CANCELLATION_COPY[policy]

  return (
    <section>
      <div className="mt-0 mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {/* The one glyph on the page that is not grey: of the three blocks in
            this sheet, this is the only one with money attached to it. */}
        <span
          aria-hidden
          className="grid size-9 flex-none place-items-center rounded-lg bg-warning-soft text-accent-orange-600"
        >
          <CalendarXIcon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <h2 className="m-0 text-base font-semibold text-card-foreground">Uslovi otkazivanja</h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {copy.label}
        </span>
      </div>

      {/* No border of its own: this sits inside the detail sheet, and a box
          drawn inside a box reads as two separate things. */}
      <ul className="m-0 list-none divide-y divide-border text-sm text-foreground">
        {copy.lines.map((line) => (
          <li key={line} className="flex gap-2 py-2 first:pt-0 last:pb-0">
            <span className="text-zinc-300" aria-hidden>
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
