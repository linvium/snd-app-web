-- Durable webhook idempotency; service role only (RLS on, no policies).
create table public.kyc_webhook_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);

alter table public.kyc_webhook_events enable row level security;

-- Users may read their own KYC row. All writes go through the service role.
drop policy if exists "kyc: insert own" on public.kyc_verifications;
drop policy if exists "kyc: update own" on public.kyc_verifications;
