-- Email copy lives in the database, not in the edge function.
--
-- Every lifecycle mail (request received, payment link, payment confirmed,
-- picked up, returned) is a row in `email_templates` that anyone can edit
-- without a deploy. `email_messages` is the outbox: the database writes a row
-- inside the same transaction as the status change, and the `send-email` edge
-- function renders the template and hands it to the provider. A mail that
-- fails to send is a row with an error on it rather than a lost notification.

create type public.email_delivery_status as enum (
  'queued',
  'sending',
  'sent',
  'failed',
  'cancelled'
);

create table public.email_templates (
  key varchar(64) primary key,
  name varchar(120) not null,
  description text,
  locale char(2) not null default 'sr',
  subject text not null,
  html_body text not null,
  text_body text,
  -- Names the copy may use, so an editor knows what is available.
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.email_templates is
  'Editable transactional email copy. {{variable}} placeholders are filled by the send-email edge function.';

create trigger trg_email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  template_key varchar(64) not null references public.email_templates(key),
  to_email varchar(255) not null,
  to_user_id uuid references public.users(id),
  booking_id uuid references public.bookings(id) on delete set null,
  variables jsonb not null default '{}'::jsonb,
  status public.email_delivery_status not null default 'queued',
  attempts smallint not null default 0,
  last_error text,
  subject text,
  provider_message_id varchar(255),
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.email_messages is
  'Outbox. Written by lifecycle RPCs, drained by the send-email edge function.';

create index idx_email_messages_queued
  on public.email_messages (scheduled_at)
  where status = 'queued';

create index idx_email_messages_booking on public.email_messages (booking_id);

create trigger trg_email_messages_updated_at
  before update on public.email_messages
  for each row execute function public.set_updated_at();

-- No policies on purpose: only the service role (which bypasses RLS) reads or
-- writes these. Nothing a signed-in user does should let them read the outbox.
alter table public.email_templates enable row level security;
alter table public.email_messages enable row level security;

/**
 * Queue one mail. Called from lifecycle RPCs, which are `security definer`, so
 * the row lands in the same transaction as the status change it announces.
 * An unknown or deactivated template is skipped rather than raised: a missing
 * template must not roll back an accepted booking.
 */
create or replace function public.snd_queue_email(
  p_template_key text,
  p_to_user_id uuid,
  p_variables jsonb default '{}'::jsonb,
  p_booking_id uuid default null,
  p_to_email text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := p_to_email;
  v_id uuid;
begin
  if not exists (
    select 1 from public.email_templates
    where key = p_template_key and is_active = true
  ) then
    raise warning 'snd_queue_email: template % is missing or inactive', p_template_key;
    return null;
  end if;

  if v_email is null and p_to_user_id is not null then
    select email into v_email from public.users where id = p_to_user_id;
  end if;

  if v_email is null or btrim(v_email) = '' then
    raise warning 'snd_queue_email: no address for user %', p_to_user_id;
    return null;
  end if;

  insert into public.email_messages (template_key, to_email, to_user_id, booking_id, variables)
  values (p_template_key, btrim(v_email), p_to_user_id, p_booking_id, coalesce(p_variables, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.snd_queue_email(text, uuid, jsonb, uuid, text) from public;

insert into public.email_templates (key, name, description, subject, html_body, text_body, variables)
values
  (
    'booking_request_received',
    'Novi zahtev za iznajmljivanje',
    'Vlasniku, kada stigne novi zahtev.',
    '{{renter_name}} želi da pozajmi: {{listing_title}}',
    '<p>Zdravo {{owner_name}},</p>'
      || '<p><strong>{{renter_name}}</strong> je poslao/la zahtev za <strong>{{listing_title}}</strong>.</p>'
      || '<p>Termin: {{date_range}}<br />Broj zahteva: {{booking_reference}}</p>'
      || '<p><a href="{{thread_url}}">Otvori zahtev</a></p>'
      || '<p>Odgovori u roku od 24 sata da zahtev ne istekne.</p>',
    'Zdravo {{owner_name}}, {{renter_name}} je poslao/la zahtev za {{listing_title}} ({{date_range}}). Otvori zahtev: {{thread_url}}',
    '["owner_name","renter_name","listing_title","date_range","booking_reference","thread_url","app_url"]'::jsonb
  ),
  (
    'booking_accepted_payment_link',
    'Zahtev prihvaćen - link za plaćanje',
    'Zakupcu, kada vlasnik prihvati zahtev. Nosi jedinstveni link za plaćanje.',
    'Zahtev je prihvaćen - plati i rezerviši: {{listing_title}}',
    '<p>Zdravo {{renter_name}},</p>'
      || '<p><strong>{{owner_name}}</strong> je prihvatio/la tvoj zahtev za <strong>{{listing_title}}</strong>.</p>'
      || '<p>Termin: {{date_range}}<br />Iznos: {{total_amount}}</p>'
      || '<p><a href="{{payment_url}}">Plati i rezerviši</a></p>'
      || '<p>Link važi do {{expires_at}}. Rezervacija je tvoja tek kada plaćanje prođe.</p>',
    'Zdravo {{renter_name}}, {{owner_name}} je prihvatio/la zahtev za {{listing_title}} ({{date_range}}). Iznos: {{total_amount}}. Plati ovde: {{payment_url}} (link važi do {{expires_at}}).',
    '["renter_name","owner_name","listing_title","date_range","total_amount","payment_url","expires_at","booking_reference","thread_url","app_url"]'::jsonb
  ),
  (
    'booking_declined',
    'Zahtev odbijen',
    'Zakupcu, kada vlasnik odbije zahtev.',
    'Zahtev za {{listing_title}} nije prihvaćen',
    '<p>Zdravo {{renter_name}},</p>'
      || '<p>{{owner_name}} nije prihvatio/la zahtev za <strong>{{listing_title}}</strong>.</p>'
      || '<p><a href="{{app_url}}/search">Pronađi sličnu stvar</a></p>',
    'Zdravo {{renter_name}}, {{owner_name}} nije prihvatio/la zahtev za {{listing_title}}. Pronađi sličnu stvar: {{app_url}}/search',
    '["renter_name","owner_name","listing_title","booking_reference","app_url"]'::jsonb
  ),
  (
    'booking_paid_owner',
    'Plaćanje potvrđeno (vlasniku)',
    'Vlasniku, kada plaćanje prođe i rezervacija postane potvrđena.',
    'Plaćeno - rezervacija potvrđena: {{listing_title}}',
    '<p>Zdravo {{owner_name}},</p>'
      || '<p><strong>{{renter_name}}</strong> je platio/la rezervaciju za <strong>{{listing_title}}</strong>.</p>'
      || '<p>Termin: {{date_range}}<br />Broj rezervacije: {{booking_reference}}<br />Tvoja zarada: {{payout_amount}}</p>'
      || '<p><a href="{{thread_url}}">Otvori rezervaciju</a></p>'
      || '<p>Dogovorite preuzimanje kroz poruke i slikajte predmet pri predaji.</p>',
    'Zdravo {{owner_name}}, {{renter_name}} je platio/la rezervaciju za {{listing_title}} ({{date_range}}). Tvoja zarada: {{payout_amount}}. Otvori: {{thread_url}}',
    '["owner_name","renter_name","listing_title","date_range","booking_reference","total_amount","payout_amount","thread_url","app_url"]'::jsonb
  ),
  (
    'booking_paid_renter',
    'Plaćanje potvrđeno (zakupcu)',
    'Zakupcu, potvrda da je rezervacija plaćena.',
    'Rezervacija je potvrđena: {{listing_title}}',
    '<p>Zdravo {{renter_name}},</p>'
      || '<p>Plaćanje je prošlo - <strong>{{listing_title}}</strong> je rezervisan za tebe.</p>'
      || '<p>Termin: {{date_range}}<br />Broj rezervacije: {{booking_reference}}<br />Plaćeno: {{total_amount}}</p>'
      || '<p><a href="{{thread_url}}">Otvori rezervaciju</a></p>',
    'Zdravo {{renter_name}}, plaćanje je prošlo. {{listing_title}} je rezervisan ({{date_range}}), broj {{booking_reference}}. Otvori: {{thread_url}}',
    '["renter_name","owner_name","listing_title","date_range","booking_reference","total_amount","thread_url","app_url"]'::jsonb
  ),
  (
    'booking_picked_up',
    'Predmet preuzet',
    'Zakupcu, kada vlasnik označi da je predmet preuzet.',
    'Preuzeto: {{listing_title}}',
    '<p>Zdravo {{renter_name}},</p>'
      || '<p>{{owner_name}} je označio/la da si preuzeo/la <strong>{{listing_title}}</strong>.</p>'
      || '<p>Vraćanje: {{end_date}}</p>'
      || '<p><a href="{{thread_url}}">Otvori rezervaciju</a></p>',
    'Zdravo {{renter_name}}, {{owner_name}} je označio/la da si preuzeo/la {{listing_title}}. Vraćanje: {{end_date}}. Otvori: {{thread_url}}',
    '["renter_name","owner_name","listing_title","date_range","end_date","booking_reference","thread_url","app_url"]'::jsonb
  ),
  (
    'booking_returned_review_request',
    'Vraćeno - ostavi ocenu',
    'Obema stranama, kada vlasnik označi da je predmet vraćen.',
    'Vraćeno - ostavi ocenu za {{listing_title}}',
    '<p>Zdravo {{recipient_name}},</p>'
      || '<p><strong>{{listing_title}}</strong> je vraćen. Iznajmljivanje je završeno.</p>'
      || '<p>Ostavi ocenu za {{other_party_name}} - ocene se objavljuju kada obe strane ocene jedna drugu.</p>'
      || '<p><a href="{{thread_url}}">Ostavi ocenu</a></p>',
    'Zdravo {{recipient_name}}, {{listing_title}} je vraćen. Ostavi ocenu za {{other_party_name}}: {{thread_url}}',
    '["recipient_name","other_party_name","listing_title","date_range","booking_reference","thread_url","app_url"]'::jsonb
  );
