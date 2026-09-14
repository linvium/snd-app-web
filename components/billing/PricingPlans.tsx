'use client'

import Link from 'next/link'
import { CheckIcon, CoinsIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/context/AuthContext'
import { useBillingSummary, useStartBillingCheckout } from '@/hooks/billing'
import {
  creditPackSavingsPercent,
  creditUnitPriceMinor,
  formatCreditCount,
  formatListingCount,
  planPricePerListingMinor,
} from '@/lib/billing'
import { ApiError } from '@/lib/search'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import { cn } from '@/lib/utils'
import type { BillingOrderKind, BillingPlan, CreditPack } from '@/types/billing'

/** The plan the page leans towards: room to matter, without being the biggest. */
const FEATURED_PLAN = 'standard'

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-600" strokeWidth={2.2} aria-hidden />
      <span>{children}</span>
    </li>
  )
}

/**
 * The price list: the subscription plans and the credit packs.
 *
 * Shown on the public /pricing page and inside the manager's billing page, so
 * it decides for itself what a button does - a guest is sent to sign in and
 * back, a signed-in owner goes straight to checkout. An owner with a current
 * plan cannot start a second one: switching is cancel, then choose again once
 * the paid period is over.
 */
export function PricingPlans({
  plans,
  packs,
  loginNext,
}: {
  plans: BillingPlan[]
  packs: CreditPack[]
  loginNext: string
}) {
  const { user } = useAuthSession()
  const summary = useBillingSummary(Boolean(user))
  const checkout = useStartBillingCheckout()

  const currentPlanKey = summary.data?.subscription?.plan_key ?? null
  const pendingKey = checkout.isPending ? (checkout.variables?.itemKey ?? null) : null
  const loginHref = `/auth/login?next=${encodeURIComponent(loginNext)}`
  const sortedPacks = [...packs].sort((a, b) => a.credits - b.credits)

  const buy = (kind: BillingOrderKind, itemKey: string) => {
    checkout.mutate(
      { kind, itemKey },
      {
        onError: (error) => {
          toast.error(
            error instanceof ApiError
              ? error.message
              : 'Plaćanje nije moglo da se otvori. Pokušaj ponovo.'
          )
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-12">
      <section id="plans" aria-labelledby="plans-heading" data-testid="pricing-plans" className="scroll-mt-24">
        <h2 id="plans-heading" className="m-0 text-xl font-semibold tracking-[-0.01em] text-foreground">
          Pretplata
        </h2>
        <p className="mt-1 mb-5 max-w-[640px] text-sm leading-relaxed text-muted-foreground">
          Mesečni paket sa ograničenim brojem oglasa koji mogu biti objavljeni u isto vreme.
          Arhiviran oglas ne zauzima mesto, a pretplatu otkazuješ kad hoćeš.
        </p>

        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.key === FEATURED_PLAN
            const current = plan.key === currentPlanKey
            const label = `Izaberi ${plan.name}`

            return (
              <li
                key={plan.key}
                data-testid="plan-card"
                data-plan={plan.key}
                className={cn(
                  'relative flex flex-col rounded-xl border bg-card p-5',
                  featured
                    ? 'border-brand-500 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_14px_32px_-20px_rgba(24,24,27,0.35)]'
                    : 'border-border'
                )}
              >
                {featured ? (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    Najčešći izbor
                  </span>
                ) : null}

                <h3 className="m-0 text-base font-semibold text-card-foreground">{plan.name}</h3>
                {plan.description ? (
                  <p className="mt-1 mb-0 text-[13px] text-muted-foreground">{plan.description}</p>
                ) : null}

                <p className="mt-4 mb-0 flex items-baseline gap-1.5">
                  <span className="text-[28px] leading-none font-semibold tracking-tight text-card-foreground">
                    {formatPriceMinor(plan.price_minor)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ mesec</span>
                </p>

                <ul className="mt-4 mb-5 list-none space-y-2 p-0 text-sm text-foreground">
                  <Feature>
                    Do {formatListingCount(plan.listing_limit)} objavljenih u isto vreme
                  </Feature>
                  <Feature>
                    Oko {formatPriceMinor(planPricePerListingMinor(plan))} po oglasu mesečno
                  </Feature>
                  <Feature>Bez provizije na iznajmljivanje</Feature>
                </ul>

                <div className="mt-auto">
                  {current ? (
                    <p
                      data-testid="plan-current"
                      className="m-0 rounded-md bg-brand-50 px-3 py-2.5 text-center text-sm font-semibold text-brand-700"
                    >
                      Tvoj trenutni paket
                    </p>
                  ) : user ? (
                    <Button
                      fullWidth
                      data-testid="plan-buy"
                      variant={featured ? undefined : 'secondary'}
                      loading={pendingKey === plan.key}
                      disabled={checkout.isPending || Boolean(currentPlanKey)}
                      onClick={() => buy('subscription', plan.key)}
                      className={featured ? 'bg-brand-500 hover:bg-brand-600' : undefined}
                    >
                      {label}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      fullWidth
                      variant={featured ? undefined : 'secondary'}
                      className={featured ? 'bg-brand-500 hover:bg-brand-600' : undefined}
                    >
                      <Link href={loginHref}>{label}</Link>
                    </Button>
                  )}
                  {currentPlanKey && !current ? (
                    <p className="mt-2 mb-0 text-[12px] text-muted-foreground">
                      Drugi paket biraš kada trenutna pretplata istekne.
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section id="credits" aria-labelledby="credits-heading" data-testid="pricing-packs" className="scroll-mt-24">
        <h2 id="credits-heading" className="m-0 text-xl font-semibold tracking-[-0.01em] text-foreground">
          Krediti
        </h2>
        <p className="mt-1 mb-5 max-w-[640px] text-sm leading-relaxed text-muted-foreground">
          Jedan kredit je jedan oglas. Kredit se troši pri objavi, a oglas zatim ostaje otključan -
          možeš ga arhivirati i vratiti bez novog kredita. Krediti ne ističu, a veći paket je
          jeftiniji po kreditu.
        </p>

        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {sortedPacks.map((pack) => {
            const unitPrice = creditUnitPriceMinor(pack)
            const savings = creditPackSavingsPercent(pack, sortedPacks)

            return (
              <li
                key={pack.key}
                data-testid="credit-pack-card"
                data-pack={pack.key}
                data-unit-price-minor={unitPrice}
                className="flex flex-col rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden
                    className="grid size-9 place-items-center rounded-lg bg-warning-soft text-accent-orange-600"
                  >
                    <CoinsIcon className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  {savings ? (
                    <span
                      data-testid="credit-pack-savings"
                      className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700"
                    >
                      Ušteda {savings}%
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 mb-0 text-base font-semibold text-card-foreground">
                  {formatCreditCount(pack.credits)}
                </h3>
                <p className="mt-1 mb-0 text-[22px] leading-tight font-semibold tracking-tight text-card-foreground">
                  {formatPriceMinor(pack.price_minor)}
                </p>
                <p className="mt-0.5 mb-4 text-[13px] text-muted-foreground">
                  {formatPriceMinor(unitPrice)} po kreditu
                </p>

                <div className="mt-auto">
                  {user ? (
                    <Button
                      fullWidth
                      variant="secondary"
                      data-testid="credit-pack-buy"
                      loading={pendingKey === pack.key}
                      disabled={checkout.isPending}
                      onClick={() => buy('credits', pack.key)}
                    >
                      Kupi
                    </Button>
                  ) : (
                    <Button asChild fullWidth variant="secondary">
                      <Link href={loginHref}>Kupi</Link>
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
