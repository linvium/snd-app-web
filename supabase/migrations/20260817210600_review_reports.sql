-- The "Prijavi" link beside each review (doc 04 §11.2).
--
-- Reports are write-only from the client's side: a reporter may file one and
-- see their own, but nobody browses the pile. Moderation reads it with the
-- service role.

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason varchar(40) not null,
  details text,
  status varchar(20) not null default 'submitted',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- One report per person per review; filing twice is not twice the signal.
  unique (review_id, reporter_id)
);

alter table public.review_reports enable row level security;

create policy "review_reports: insert own" on public.review_reports
  for insert to authenticated
  with check (auth.uid() = reporter_id);

create policy "review_reports: select own" on public.review_reports
  for select to authenticated
  using (auth.uid() = reporter_id);

create index if not exists review_reports_review_idx on public.review_reports (review_id);
create index if not exists review_reports_status_idx on public.review_reports (status, created_at);
