# Edge functions

## Secrets

Set these on the project (`supabase secrets set NAME=value`, or Dashboard →
Project Settings → Edge Functions → Secrets). `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform
and do not need setting.

| Secret | Used by | What happens without it |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `payment-checkout` | The pay page answers 503 "Plaćanje trenutno nije dostupno". Nothing is charged and no link is consumed. |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Every delivery is rejected 400, so payments are taken and never settled. Set this before taking a single live payment. |
| `PAYMENT_PROVIDER` | both | Defaults to `stripe`. Only affects links created from now on — an existing link settles through the provider it was created with. |
| `RESEND_API_KEY` | `send-email` | Mail stays queued in `email_messages` with `last_error = 'RESEND_API_KEY is not set'`. Nothing is lost, nothing is delivered. |
| `EMAIL_FROM` | `send-email` | Falls back to `Stvar na dan <noreply@stvarnadan.rs>`. Must be a domain verified with Resend. |
| `APP_URL` | `send-email`, `payment-checkout` | Falls back to `https://stvarnadan.rs`. Every `{{thread_url}}` in a mail and both Stripe return URLs are built from it, so a staging project must set its own or its renters land on production. |
| `PSP_WEBHOOK_SECRET` | `payment-confirm` | The generic webhook path is closed. Only needed for a PSP that has no adapter yet; send it in `x-psp-signature`. |
| `PAYMENT_MANUAL_CONFIRM` | `payment-confirm` | The sandbox "mark as paid" path is closed, which is the correct state anywhere Stripe is configured. Setting it to `true` lets a signed-in renter settle their own link without paying — pair it with `NEXT_PUBLIC_PAYMENT_MANUAL_CONFIRM=true` on the web app to show the button. |

## Payments

The core is provider-neutral. A payment link is a row with a token and an
amount; `snd_confirm_booking_payment` is the only way a booking becomes
`booked`, and it knows nothing about who collected the money. A provider is an
adapter in `_shared/payments/` implementing two methods — open a checkout,
interpret a webhook — plus an entry in the registry in `_shared/payments/index.ts`.

```
renter presses Plati
  → POST /api/v1/payments/[token]/checkout   (Next, requires a session)
  → payment-checkout                          (checks the caller is the renter)
  → adapter.createCheckout                    → provider-hosted page
  → renter pays, returns to /pay/[token]?status=success
  → provider calls stripe-webhook             (signature verified)
  → snd_confirm_booking_payment               → booked + 2 emails + thread message
```

The return from the provider is treated as a hint, never as proof: the pay page
shows "Potvrđujemo plaćanje" and polls the link until the webhook has settled
it. Nothing but a verified webhook moves a booking to `booked`.

### Stripe setup

1. Set `STRIPE_SECRET_KEY` (start with the test key).
2. Add an endpoint at `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   subscribed to `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   and `payment_intent.payment_failed`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
3. Leave `PAYMENT_MANUAL_CONFIRM` unset.

Checkout is hosted and card-only, so no card data and no publishable key ever
reach an SND page. Sessions are clamped to the payment link's own deadline,
which is why the link must have at least 30 minutes left for a checkout to open.

RSD works: Stripe treats it as a two-decimal currency, so `amount_minor` (para)
passes straight through — `176000` is charged as РСД1.760,00. Still confirm
Stripe supports your billing entity before going live.

**Card charges have a floor of roughly $0.50 equivalent**, about 55-60 RSD. A
booking under it comes back as `AMOUNT_TOO_SMALL` (422) and cannot be paid by
card at all — worth remembering when testing against cheap seed listings.

A refused card does not end the reservation: `snd_record_payment_failure`
records the attempt, clears the session so a retry opens a fresh one, and leaves
the link `pending` and the booking `accepted`.

## send-email

Drains the `email_messages` outbox: claims a row, renders its
`email_templates` row (`{{variable}}` substitution), hands it to Resend, and
records the outcome. The queue is the only input — a caller cannot choose a
recipient or a body — so it is safe to call from anywhere with a valid JWT.

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
