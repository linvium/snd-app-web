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
 */
export default function PriceTable({ listing }: { listing: ListingDetail }) {
  const tiers = buildPriceTiers(listing)

  return (
    <section>
      <h2 className="mt-0 mb-3 text-lg font-semibold text-card-foreground">Cene</h2>

      <dl className="m-0 divide-y divide-border rounded-xl border border-border">
        {tiers.map((tier) => (
          <div key={tier.days} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="flex items-center gap-2 text-sm text-foreground">
              {tier.label}
              {tier.saving_percent ? (
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                  Ušteda {tier.saving_percent}%
                </span>
              ) : null}
            </dt>
            <dd className="m-0 flex items-baseline gap-2 text-right">
              <span className="text-sm font-semibold text-card-foreground">
                {formatPriceMinor(tier.amount_minor)}
              </span>
              {tier.days > 1 ? (
                <span className="text-[13px] text-muted-foreground">
                  ({formatPriceMinor(tier.per_day_minor)}/dan)
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {/* Shown because it is what sets the guarantee's ceiling (doc 04 §7). */}
      {listing.item_value_minor != null ? (
        <p className="mt-3 mb-0 text-[13px] text-muted-foreground">
          Vrednost predmeta:{' '}
          <span className="font-medium text-foreground">
            {formatPriceMinor(listing.item_value_minor)}
          </span>
        </p>
      ) : null}
    </section>
  )
}
