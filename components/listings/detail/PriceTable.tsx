import { buildPriceTiers } from '@/lib/listings'
import { formatPriceMinor } from '@/lib/search'
import type { ListingDetail } from '@/types/listing-detail'

/**
 * The price tiers (doc 04 §7).
 *
 * The per-day figure in brackets is what makes the tiers comparable — "2.100
 * RSD" and "4.200 RSD" say nothing next to each other until they read as 700
 * and 600 a day. The platform fee is deliberately absent here; it belongs in
 * the booking card's total, where it applies to actual dates.
 *
 * This lives inside the booking card rather than in a section of its own. As a
 * section it restated the card's headline price a column away — the same number
 * twice, and a reader comparing packages had to do it in the wrong half of the
 * page. Here the ladder sits directly above the date picker it is an argument
 * for. A listing with a single tier renders nothing: the headline already said
 * it.
 */
export default function PriceTiers({ listing }: { listing: ListingDetail }) {
  const tiers = buildPriceTiers(listing)
  if (tiers.length < 2) return null

  return (
    <dl className="mt-4 mb-0 divide-y divide-border rounded-lg border border-border">
      {tiers.map((tier) => (
        <div key={tier.days} className="flex items-center justify-between gap-3 px-3 py-2">
          <dt className="flex items-center gap-2 text-[13px] text-foreground">
            {tier.label}
            {tier.saving_percent ? (
              <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-semibold text-success">
                −{tier.saving_percent}%
              </span>
            ) : null}
          </dt>
          <dd className="m-0 flex items-baseline gap-1.5 text-right">
            <span className="text-[13px] font-semibold text-card-foreground">
              {formatPriceMinor(tier.amount_minor)}
            </span>
            {tier.days > 1 ? (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatPriceMinor(tier.per_day_minor)}/dan
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
