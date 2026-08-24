-- One payment link per accepted booking.
--
-- Acceptance is not a reservation: the renter still has to pay. The link is the
-- thing that carries them there, and it is a row rather than a URL parameter so
-- it can expire, be looked up without a session (the token is the secret), and
-- be tied to exactly one booking and one amount.

create type public.payment_link_status as enum (
  'pending',
  'paid',
  'expired',
  'cancelled'
);

create table public.booking_payment_links (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  token varchar(64) not null unique,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'RSD',
  status public.payment_link_status not null default 'pending',
  expires_at timestamptz not null,
  paid_at timestamptz,
  payment_id uuid references public.payments(id),
  provider_reference varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.booking_payment_links is
  'Unique pay-by-link for an accepted booking. The token is the credential; anyone holding it may see the summary and pay.';

-- A booking can be re-accepted after an expired link, but never carry two live
-- links at once - two ways to pay the same reservation is two ways to pay twice.
create unique index booking_payment_links_one_pending
  on public.booking_payment_links (booking_id)
  where status = 'pending';

create index idx_booking_payment_links_booking on public.booking_payment_links (booking_id);

create trigger trg_booking_payment_links_updated_at
  before update on public.booking_payment_links
  for each row execute function public.set_updated_at();

alter table public.booking_payment_links enable row level security;

-- Both sides of the booking can see that a link exists and where it stands.
-- Nobody writes these from the client; the lifecycle RPCs do.
create policy "booking_payment_links: select own" on public.booking_payment_links
  for select
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_payment_links.booking_id
        and (b.renter_id = auth.uid() or b.owner_id = auth.uid())
    )
  );

/**
 * The link summary, by token, for the payment page.
 *
 * Deliberately readable without a session: the renter may open the link from an
 * email on a device they are not signed in on. The token is 128 bits of
 * randomness, and the payload carries no address, no phone, and no user id.
 */
create or replace function public.snd_payment_link_summary(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_link record;
  v_booking record;
  v_listing record;
  v_owner text;
  v_status text;
begin
  if p_token is null or char_length(btrim(p_token)) < 16 then
    return null;
  end if;

  select * into v_link
  from public.booking_payment_links
  where token = btrim(p_token);

  if v_link.id is null then
    return null;
  end if;

  select id, reference, listing_id, owner_id, start_date, end_date, days_count, status,
         rental_price_minor, service_fee_minor, total_minor
    into v_booking
  from public.bookings
  where id = v_link.booking_id;

  select title, slug into v_listing from public.listings where id = v_booking.listing_id;

  select coalesce(
           p.display_name,
           nullif(btrim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1)), ''),
           'Korisnik'
         )
    into v_owner
  from public.user_profiles p
  where p.user_id = v_booking.owner_id;

  v_status := v_link.status::text;
  if v_status = 'pending' and v_link.expires_at <= now() then
    v_status := 'expired';
  end if;

  return jsonb_build_object(
    'token', v_link.token,
    'status', v_status,
    'amount_minor', v_link.amount_minor,
    'currency', v_link.currency,
    'expires_at', v_link.expires_at,
    'paid_at', v_link.paid_at,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'reference', v_booking.reference,
      'status', v_booking.status,
      'start_date', v_booking.start_date,
      'end_date', v_booking.end_date,
      'days_count', v_booking.days_count,
      'rental_price_minor', v_booking.rental_price_minor,
      'service_fee_minor', v_booking.service_fee_minor,
      'total_minor', v_booking.total_minor
    ),
    'listing', jsonb_build_object(
      'title', coalesce(v_listing.title, 'Oglas'),
      'slug', v_listing.slug
    ),
    'owner_name', coalesce(v_owner, 'Korisnik')
  );
end;
$function$;

revoke all on function public.snd_payment_link_summary(text) from public;
grant execute on function public.snd_payment_link_summary(text) to anon, authenticated, service_role;
