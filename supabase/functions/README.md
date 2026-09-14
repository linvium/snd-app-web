# Edge functions

## Secrets

Set these on the project (`supabase secrets set NAME=value`, or Dashboard →
Project Settings → Edge Functions → Secrets). `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform
and do not need setting.

| Secret | Used by | What happens without it |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `payment-checkout`, `subscription-cancel`, `stripe-webhook` | Buying a plan or credits answers 503 "Plaćanje trenutno nije dostupno". Nothing is charged and no order is consumed. Cancelling a Stripe-billed plan also answers 503 and marks nothing. |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Every delivery is rejected 400, so orders are paid and never delivered. Set this before taking a single live payment. |
| `PAYMENT_PROVIDER` | all three | Defaults to `stripe`. Only affects orders created from now on - an existing order or plan settles, renews and cancels through the provider it was created with. |
| `RESEND_API_KEY` | `send-email` | Mail stays queued in `email_messages` with `last_error = 'RESEND_API_KEY is not set'`. Nothing is lost, nothing is delivered. |
| `EMAIL_FROM` | `send-email` | Falls back to `Stvar na dan <noreply@stvarnadan.rs>`. Must be a domain verified with Resend. |
| `APP_URL` | `send-email`, `payment-checkout` | Falls back to `https://stvarnadan.rs`. Every `{{thread_url}}` and `{{billing_url}}` in a mail and both Stripe return URLs are built from it, so a staging project must set its own or its owners land on production. |
| `PSP_WEBHOOK_SECRET` | `payment-confirm` | The generic webhook path is closed. Only needed for a PSP that has no adapter yet; send it in `x-psp-signature`. |
| `PAYMENT_MANUAL_CONFIRM` | `payment-confirm` | The sandbox "mark as paid" path is closed, which is the correct state anywhere Stripe is configured. Setting it to `true` lets a signed-in owner settle their own order without paying - pair it with `NEXT_PUBLIC_PAYMENT_MANUAL_CONFIRM=true` on the web app, which skips Stripe and shows the button on `/profile/billing`. |

## Billing

SND does not charge for renting: the renter pays the owner directly, and there
is no payment link, fee or payout anywhere in a booking. What the platform
charges for is listing, in one of two ways:

- **a subscription** - a monthly plan (`billing_plans`) with a cap on how many
  listings may be published at the same time;
- **listing credits** - one credit publishes one listing, bought in packs
  (`credit_packs`) where a bigger pack is cheaper per credit. A trigger on
  `credit_packs` refuses any price edit that breaks that ladder.

The core is provider-neutral. An order (`billing_orders`) is a row with a token
and an amount; `snd_settle_billing_order` is the only way it turns into credits
or a current plan, and it knows nothing about who collected the money. A
provider is an adapter in `_shared/payments/` implementing three methods - open
a checkout, interpret a webhook, stop a subscription - plus an entry in the
registry in `_shared/payments/index.ts`.

```
owner picks a plan or a credit pack on /pricing or /profile/billing
  → POST /api/v1/billing/orders              (Next, requires a session)
  → snd_create_billing_order                  (order row + token)
  → payment-checkout                          (checks the caller owns the order)
  → adapter.createCheckout                    → provider-hosted page
  → owner pays, returns to /profile/billing?order=<token>&status=success
  → provider calls stripe-webhook             (signature verified)
  → snd_settle_billing_order                  → credits on the ledger, or a current plan + mail
```

The return from the provider is treated as a hint, never as proof: the billing
page shows "Potvrđujemo uplatu" and polls the order until the webhook has
settled it.

Later periods of a plan arrive as `invoice.paid` → `snd_renew_subscription`,
which moves the period end forward. Cancelling from the billing page goes
through `subscription-cancel`, which tells the provider to stop at the end of
the period and only then marks the plan; when the provider finally ends it,
`customer.subscription.deleted` → `snd_end_subscription` expires the plan and
pauses whatever no longer fits.

### Listing limits

Publishing is metered in the database, not the API: owners can update their
own `listings` row under RLS, so a check in a route would be skippable. The
trigger `snd_enforce_listing_entitlement` lets a listing become `published` if
it is already unlocked, or if the current plan has a free slot, or by spending
one credit (which unlocks it for good). Otherwise the update fails with
`LISTING_LIMIT_REACHED`, which the API returns as 402. The service role and
SQL run without a request JWT (migrations, seed scripts) are not metered.

Plans without a provider subscription (the sandbox path) only end by the clock.
Schedule the sweep that expires them and pauses listings above the limit:

```sql
select cron.schedule('snd-enforce-listing-limits', '7 * * * *',
  'select public.snd_enforce_listing_limits()');
```

### Stripe setup

1. Set `STRIPE_SECRET_KEY` (start with the test key).
2. Add an endpoint at `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   subscribed to `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `payment_intent.payment_failed`, `invoice.paid` and
   `customer.subscription.deleted`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
3. Leave `PAYMENT_MANUAL_CONFIRM` unset.

Checkout is hosted and card-only, so no card data and no publishable key ever
reach an SND page. Plans use an inline recurring price, so nothing has to be
created in the Stripe dashboard. Sessions are clamped to the order's own
two-hour deadline.

RSD works: Stripe treats it as a two-decimal currency, so `amount_minor` (para)
passes straight through - `49000` is charged as РСД490,00. Still confirm Stripe
supports your billing entity before going live. The cheapest item on the price
list (one credit, 150 RSD) is above Stripe's card minimum of roughly $0.50.

A refused card does not end the order: `snd_record_billing_failure` records the
attempt, clears the session so a retry opens a fresh one, and leaves the order
`pending`.

## send-email

Drains the `email_messages` outbox: claims a row, renders its
`email_templates` row (`{{variable}}` substitution), hands it to Resend, and
records the outcome. The queue is the only input - a caller cannot choose a
recipient or a body - so it is safe to call from anywhere with a valid JWT.

The web app calls it after every lifecycle mutation for immediate delivery. A
failed send goes back to `queued` and is retried on the next drain, up to five
attempts. **Nothing retries on its own yet**: add a schedule (pg_cron + pg_net,
or any external scheduler) that POSTs to `/functions/v1/send-email` with the
service role key every few minutes, or a provider outage will leave mail sitting
in the queue until the next booking happens to trigger a drain.

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-email" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' -d '{}'
```

Editing copy is a database edit, not a deploy: update `subject`, `html_body` or
`text_body` on the `email_templates` row. The available `{{variables}}` are
listed on the row itself.
