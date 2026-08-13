-- Waitlist emails from the pre-launch landing page.
-- Anonymous visitors may insert; nobody can read rows through the Data API.

create table public.waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint waitlist_emails_email_key unique (email),
  constraint waitlist_emails_email_format check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

alter table public.waitlist_emails enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist_emails
  for insert
  to anon, authenticated
  with check (true);
