'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2Icon,
  CoinsIcon,
  CreditCardIcon,
  Loader2Icon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { PricingPlans } from '@/components/billing/PricingPlans'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useBillingCatalog,
  useBillingOrder,
  useBillingSummary,
  useCancelSubscription,
  useConfirmBillingOrder,
} from '@/hooks/billing'
import {
  BILLING_PATH,
  BILLING_TOKEN_RE,
  MANUAL_BILLING_CONFIRM,
  creditTransactionLabel,
  formatBillingDate,
  formatCreditCount,
  formatCreditDelta,
  formatListingCount,
  slotUsage,
  subscriptionRenewalCopy,
} from '@/lib/billing'
import { ApiError } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { BillingSummary } from '@/types/billing'

/** How long to wait on the provider's webhook before saying so out loud. */
const CONFIRMATION_GRACE_MS = 60_000

type NoticeTone = 'ok' | 'wait' | 'late'

const NOTICE_TONE: Record<NoticeTone, string> = {
  ok: 'border-brand-200 bg-brand-50 text-brand-700',
  wait: 'border-border bg-card text-card-foreground',
  late: 'border-warning/40 bg-warning-soft text-amber-900',
}

function Notice({
  tone,
  icon: Icon,
  title,
  detail,
  action,
}: {
  tone: NoticeTone
  icon: LucideIcon
  title: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <section
      role="status"
      data-testid="billing-order-notice"
      data-tone={tone}
      className={cn('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', NOTICE_TONE[tone])}
    >
      <Icon className={cn('size-5 shrink-0', tone === 'wait' && 'animate-spin')} strokeWidth={1.9} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold">{title}</p>
        <p className="mt-0.5 mb-0 text-[13px] opacity-90">{detail}</p>
      </div>
      {action}
    </section>
  )
}

/**
 * What happened to the order the owner just came back from.
 *
 * The provider's redirect is a hint, not proof: the order is settled by the
 * webhook, so a return with `status=success` polls until the order itself says
 * it was paid rather than announcing a purchase that has not landed yet.
 */
function OrderNotice({ token, returned }: { token: string; returned: 'success' | 'cancelled' | null }) {
  const [waitedTooLong, setWaitedTooLong] = useState(false)
  const awaiting = returned === 'success' && !waitedTooLong
  const order = useBillingOrder(token, { awaitingConfirmation: awaiting })
  const confirm = useConfirmBillingOrder()

  useEffect(() => {
    if (returned !== 'success') return
    const timer = window.setTimeout(() => setWaitedTooLong(true), CONFIRMATION_GRACE_MS)
    return () => window.clearTimeout(timer)
  }, [returned])

  if (order.isPending) return <Skeleton className="h-16 w-full rounded-xl" />
  if (!order.data) return null

  const data = order.data

  if (data.status === 'paid') {
    return (
      <Notice
        tone="ok"
        icon={CheckCircle2Icon}
        title="Uplata je prošla"
        detail={
          data.kind === 'credits'
            ? `Na nalog je dodato ${formatCreditCount(data.credits ?? 0)}.`
            : `Pretplata ${data.item_name ?? ''} je aktivna.`
        }
      />
    )
  }

  if (awaiting && data.status === 'pending') {
    return (
      <Notice
        tone="wait"
        icon={Loader2Icon}
        title="Potvrđujemo uplatu"
        detail="Ovo traje nekoliko sekundi. Ne zatvaraj stranicu."
      />
    )
  }

  const detail =
    returned === 'cancelled'
      ? 'Plaćanje je prekinuto i ništa nije naplaćeno.'
      : waitedTooLong
        ? 'Nismo dobili potvrdu uplate. Ako je novac skinut, javi se podršci.'
        : data.status === 'expired' || data.status === 'cancelled'
          ? 'Porudžbina više ne važi. Izaberi paket ponovo.'
          : (data.last_error ?? 'Porudžbina čeka uplatu.')

  return (
    <Notice
      tone="late"
      icon={XCircleIcon}
      title={data.item_name ?? 'Porudžbina'}
      detail={detail}
      action={
        MANUAL_BILLING_CONFIRM && data.status === 'pending' ? (
          <Button
            size="sm"
            variant="secondary"
            data-testid="billing-confirm-order"
            loading={confirm.isPending}
            onClick={() =>
              confirm.mutate(token, {
                onError: (error) =>
                  toast.error(
                    error instanceof ApiError ? error.message : 'Uplata nije potvrđena. Pokušaj ponovo.'
                  ),
              })
            }
          >
            Označi kao plaćeno (test)
          </Button>
        ) : null
      }
    />
  )
}

function CardHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="m-0 flex items-center gap-2 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
      <Icon className="size-4" strokeWidth={1.9} aria-hidden />
      {children}
    </h2>
  )
}

function SubscriptionCard({ summary, onCancel }: { summary: BillingSummary; onCancel: () => void }) {
  const subscription = summary.subscription
  const usage = slotUsage(summary)

  if (!subscription || !usage) {
    return (
      <section
        data-testid="billing-subscription"
        data-state="none"
        className="flex flex-col rounded-xl border border-border bg-card p-5"
      >
        <CardHeading icon={CreditCardIcon}>Pretplata</CardHeading>
        <p className="mt-3 mb-0 text-base font-semibold text-card-foreground">Nemaš aktivnu pretplatu</p>
        <p className="mt-1 mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Pretplata pokriva više objavljenih oglasa odjednom za fiksnu mesečnu cenu.
        </p>
        <div className="mt-auto">
          <Button asChild size="sm" variant="secondary">
            <Link href="#plans">Pogledaj pakete</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      data-testid="billing-subscription"
      data-state={subscription.cancel_at_period_end ? 'cancelling' : 'active'}
      className="flex flex-col rounded-xl border border-border bg-card p-5"
    >
      <CardHeading icon={CreditCardIcon}>Pretplata</CardHeading>
      <p className="mt-3 mb-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-base font-semibold text-card-foreground" data-testid="billing-plan-name">
          {subscription.plan_name}
        </span>
        <span className="text-[13px] text-muted-foreground">{subscriptionRenewalCopy(subscription)}</span>
      </p>

      <div className="mt-4">
        <div className="flex justify-between gap-3 text-[13px]">
          <span className="text-muted-foreground">Objavljeni oglasi na pretplati</span>
          <span className="font-medium text-card-foreground" data-testid="billing-slot-usage">
            {usage.used} od {usage.limit}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Iskorišćena mesta u pretplati"
          aria-valuemin={0}
          aria-valuemax={usage.limit}
          aria-valuenow={usage.used}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn('h-full rounded-full', usage.remaining === 0 ? 'bg-warning' : 'bg-brand-500')}
            style={{ width: `${usage.percent}%` }}
          />
        </div>
        <p className="mt-1.5 mb-0 text-[12px] text-muted-foreground">
          {usage.remaining > 0
            ? `Slobodno još ${formatListingCount(usage.remaining)}.`
            : 'Sva mesta su popunjena - sledeći oglas troši kredit.'}
        </p>
      </div>

      {!subscription.cancel_at_period_end ? (
        <div className="mt-4">
          <Button size="sm" variant="outline" data-testid="billing-cancel-subscription" onClick={onCancel}>
            Otkaži pretplatu
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function CreditsCard({ summary }: { summary: BillingSummary }) {
  return (
    <section data-testid="billing-credits" className="flex flex-col rounded-xl border border-border bg-card p-5">
      <CardHeading icon={CoinsIcon}>Krediti</CardHeading>
      <p
        className="mt-3 mb-0 text-[28px] leading-none font-semibold tracking-tight text-card-foreground"
        data-testid="billing-credit-balance"
      >
        {formatCreditCount(summary.credit_balance)}
      </p>
      <p className="mt-2 mb-4 text-[13px] leading-relaxed text-muted-foreground">
        Jedan kredit je jedan objavljen oglas. Otključanih oglasa: {summary.unlocked_listings}.
      </p>
      <div className="mt-auto">
        <Button asChild size="sm" variant="secondary">
          <Link href="#credits">Kupi kredite</Link>
        </Button>
      </div>
    </section>
  )
}

function CreditHistory({ summary }: { summary: BillingSummary }) {
  if (summary.transactions.length === 0) return null

  return (
    <section data-testid="billing-history" className="overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="m-0 border-b border-border px-5 py-3 text-sm font-semibold text-card-foreground">
        Istorija kredita
      </h2>
      <ul className="m-0 list-none divide-y divide-border p-0">
        {summary.transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate text-card-foreground">{creditTransactionLabel(transaction)}</span>
              <span className="block text-[12px] text-muted-foreground">
                {formatBillingDate(transaction.created_at)}
              </span>
            </span>
            <span
              className={cn(
                'shrink-0 font-semibold tabular-nums',
                transaction.delta > 0 ? 'text-brand-700' : 'text-muted-foreground'
              )}
            >
              {formatCreditDelta(transaction.delta)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The owner's billing page: the plan they are on, how full it is, their
 * credits, what they spent them on, and the price list to buy more.
 */
export function BillingOverview() {
  const params = useSearchParams()
  const orderToken = params.get('order')
  const statusParam = params.get('status')
  const returned = statusParam === 'success' || statusParam === 'cancelled' ? statusParam : null

  const summary = useBillingSummary()
  const catalog = useBillingCatalog()
  const cancel = useCancelSubscription()
  const [cancelOpen, setCancelOpen] = useState(false)
  const periodEnd = formatBillingDate(summary.data?.subscription?.current_period_end)

  return (
    <div className="flex flex-col gap-6" data-testid="billing-overview">
      <div>
        <h1 className="m-0 hidden text-[22px] font-normal text-foreground lg:block">Pretplata i krediti</h1>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">
          Iznajmljivanje je besplatno - plaćaš samo objavljivanje oglasa.
        </p>
      </div>

      {orderToken && BILLING_TOKEN_RE.test(orderToken) ? (
        <OrderNotice key={orderToken} token={orderToken} returned={returned} />
      ) : null}

      {summary.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      ) : summary.isError || !summary.data ? (
        <p className="m-0 text-sm text-destructive">Nismo mogli da učitamo pretplatu i kredite. Pokušaj ponovo.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SubscriptionCard summary={summary.data} onCancel={() => setCancelOpen(true)} />
            <CreditsCard summary={summary.data} />
          </div>
          <CreditHistory summary={summary.data} />
        </>
      )}

      <div className="mt-2">
        {catalog.data ? (
          <PricingPlans plans={catalog.data.plans} packs={catalog.data.packs} loginNext={BILLING_PATH} />
        ) : catalog.isError ? (
          <p className="m-0 text-sm text-destructive">Cenovnik trenutno nije dostupan.</p>
        ) : (
          <Skeleton className="h-72 w-full rounded-xl" />
        )}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Otkazati pretplatu?</DialogTitle>
            <DialogDescription>
              Pretplata se neće obnoviti i važi do {periodEnd ?? 'kraja plaćenog perioda'}. Posle toga
              se oglasi preko limita arhiviraju, a krediti ostaju tvoji.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Zadrži pretplatu
            </Button>
            <Button
              type="button"
              variant="danger"
              data-testid="billing-cancel-confirm"
              loading={cancel.isPending}
              onClick={() =>
                cancel.mutate(undefined, {
                  onSuccess: () => {
                    setCancelOpen(false)
                    toast.success('Pretplata je otkazana.')
                  },
                  onError: (error) =>
                    toast.error(
                      error instanceof ApiError ? error.message : 'Pretplata nije otkazana. Pokušaj ponovo.'
                    ),
                })
              }
            >
              Otkaži pretplatu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
