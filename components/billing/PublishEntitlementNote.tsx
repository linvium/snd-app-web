'use client'

import Link from 'next/link'

import { useBillingSummary } from '@/hooks/billing'
import { PRICING_PATH, publishEntitlement, publishEntitlementCopy } from '@/lib/billing'
import { cn } from '@/lib/utils'

/**
 * What publishing this listing will use - a plan slot, a credit, or nothing.
 *
 * Shown before the owner confirms, so the database refusing the publish is
 * never the first they hear of the limit.
 */
export function PublishEntitlementNote({ className }: { className?: string }) {
  const summary = useBillingSummary()

  if (!summary.data) return null

  const entitlement = publishEntitlement(summary.data)
  const blocked = entitlement.kind === 'none'

  return (
    <div
      data-testid="publish-entitlement"
      data-kind={entitlement.kind}
      className={cn(
        'rounded-lg px-3 py-2.5 text-[13px] leading-5',
        blocked ? 'bg-warning-soft text-amber-900' : 'bg-muted text-muted-foreground',
        className
      )}
    >
      <p className="m-0">{publishEntitlementCopy(entitlement)}</p>
      {blocked ? (
        <Link href={PRICING_PATH} className="mt-1 inline-block font-semibold text-amber-900 underline">
          Pogledaj pakete
        </Link>
      ) : null}
    </div>
  )
}
