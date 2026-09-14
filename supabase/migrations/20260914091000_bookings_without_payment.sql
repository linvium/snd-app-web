-- Renting is no longer paid through the platform.
--
-- SND does not charge per rental: no renter service fee, no owner commission,
-- no payment link, no payout. The renter pays the owner directly, however the
-- two of them agree. What this removes:
--
--   * the payment step - an owner's "yes" is the reservation, so a request goes
--     straight from `requested` to `booked`;
--   * `accepted` and `payment_failed`, which only existed around that step;
--   * payment links, payouts and payout accounts, and the booking payments;
--   * the fee and payout columns on bookings, and the quote that filled them.
--
-- The rental price itself stays: it is what the two people agree to exchange,
-- and the thread still shows it.

-- 1. Payment links and everything that settled them.

drop function if exists public.snd_confirm_booking_payment(text, text);
drop function if exists public.snd_record_payment_failure(text, text, text);
drop function if exists public.snd_start_payment_checkout(text, text, text, text);
drop function if exists public.snd_payment_link_summary(text);

drop table if exists public.booking_payment_links;
drop type if exists public.payment_link_status;

drop table if exists public.payouts;
drop table if exists public.payout_accounts;

-- Booking payments were sandbox rows for a flow that no longer exists. The
-- table stays for what the platform does charge for (billing migration next).
delete from public.payments where purpose = 'booking';
alter table public.payments drop column if exists booking_id;
alter table public.payments drop constraint if exists payments_purpose_check;
alter table public.payments
  add constraint payments_purpose_check check (purpose in ('kyc_package'));

-- 2. The lifecycle without the payment step.

update public.bookings
   set status = 'booked',
       booked_at = coalesce(booked_at, accepted_at, now())
 where status = 'accepted';

update public.bookings
   set status = 'cancelled_by_renter',
       cancelled_at = coalesce(cancelled_at, now()),
       cancelled_by = 'renter'
 where status = 'payment_failed';

-- A policy, a partial index and a column-scoped trigger read the column, and
-- Postgres refuses to retype a column anything depends on. All three come back
-- below, with the new values.
drop policy if exists "locations: select for paid renter" on public.locations;
drop index if exists public.idx_bookings_blocking;
drop trigger if exists bookings_sync_blocked_dates on public.bookings;

alter type public.booking_status rename to booking_status_old;

create type public.booking_status as enum (
  'requested',
  'booked',
  'picked_up',
  'returned',
  'rated',
  'declined',
  'expired',
  'cancelled_by_renter',
  'cancelled_by_owner'
);

comment on type public.booking_status is
  'Booking lifecycle. requested -> booked -> picked_up -> returned -> rated, plus the early endings.';

alter table public.bookings alter column status drop default;
alter table public.bookings
  alter column status type public.booking_status
  using status::text::public.booking_status;
alter table public.bookings
  alter column status set default 'requested'::public.booking_status;

drop type public.booking_status_old;

create index idx_bookings_blocking
  on public.bookings (listing_id, start_date, end_date)
  where status in ('booked', 'picked_up');

-- The street is shown once the owner has confirmed, which is now the moment
-- the reservation exists.
create policy "locations: select for booked renter" on public.locations
  for select
  using (
    exists (
      select 1
      from public.bookings b
      where b.pickup_location_id = locations.id
        and b.renter_id = auth.uid()
        and b.status in ('booked', 'picked_up')
    )
  );

create or replace function public.snd_sync_booking_blocked_dates()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_blocks boolean;
begin
  v_blocks := new.status in ('booked', 'picked_up');

  if tg_op = 'UPDATE'
     and old.status is not distinct from new.status
     and old.start_date is not distinct from new.start_date
     and old.end_date is not distinct from new.end_date then
    return null;
  end if;

  delete from public.blocked_dates where booking_id = new.id;

  if v_blocks and new.start_date is not null and new.end_date is not null then
    insert into public.blocked_dates (listing_id, date, reason, booking_id)
    select new.listing_id, d::date, 'booking', new.id
    from generate_series(new.start_date, new.end_date, interval '1 day') d
    on conflict (listing_id, date) do nothing;
  end if;

  return null;
end;
$function$;

create trigger bookings_sync_blocked_dates
  after insert or update of status, start_date, end_date on public.bookings
  for each row execute function public.snd_sync_booking_blocked_dates();

-- A `language sql` body is checked against the enum when it is created, so the
-- search filter has to be rebuilt after the type, not before.
create or replace function public.snd_filter_listings(
  p_query text default null::text,
  p_category_slug text default null::text,
  p_lat double precision default null::double precision,
  p_lng double precision default null::double precision,
  p_radius_km integer default null::integer,
  p_price_min_minor bigint default null::bigint,
  p_price_max_minor bigint default null::bigint,
  p_date_from date default null::date,
  p_date_to date default null::date,
  p_fuzzy boolean default false
)
returns table(listing_id uuid, distance_m double precision, rank real)
language sql
stable parallel safe security definer
set search_path to 'public', 'extensions'
as $function$
  with q as (
    select public.snd_build_tsquery(p_query) as ts
  ),
  category_ids as (
    select id from public.snd_category_subtree(p_category_slug)
    where p_category_slug is not null
  ),
  nearest as (
    select
      ll.listing_id,
      min(
        case when p_lat is null or p_lng is null then null
             else public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
        end
      ) as distance_m,
      count(*) filter (
        where p_lat is null or p_lng is null
           or p_radius_km is null or p_radius_km <= 0
           or (
             earth_box(ll_to_earth(p_lat, p_lng), p_radius_km * 1000.0)
               @> ll_to_earth(loc.approx_latitude, loc.approx_longitude)
             and public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
                   <= p_radius_km * 1000.0
           )
      ) as in_radius
    from public.listing_locations ll
    join public.locations loc on loc.id = ll.location_id and loc.deleted_at is null
    join public.listings pl on pl.id = ll.listing_id
      and pl.status = 'published' and pl.deleted_at is null
    group by ll.listing_id
  )
  select
    l.id,
    n.distance_m,
    case
      when (select ts from q) is not null then ts_rank(l.search_vector, (select ts from q))
      when p_fuzzy and p_query is not null
        then word_similarity(public.snd_unaccent(p_query), public.snd_unaccent(l.title))
      else 0::real
    end
  from public.listings l
  join nearest n on n.listing_id = l.id
  where l.status = 'published'
    and l.deleted_at is null
    and (p_category_slug is null or l.category_id in (select id from category_ids))
    and n.in_radius > 0
    and (p_price_min_minor is null or l.price_1_day_minor >= p_price_min_minor)
    and (p_price_max_minor is null or l.price_1_day_minor <= p_price_max_minor)
    and (
      p_date_from is null or p_date_to is null
      or (
        not exists (
          select 1 from public.blocked_dates bd
          where bd.listing_id = l.id and bd.date between p_date_from and p_date_to
        )
        and not exists (
          select 1 from public.bookings b
          where b.listing_id = l.id
            and b.status in ('booked', 'picked_up')
            and b.start_date <= p_date_to
            and b.end_date >= p_date_from
        )
      )
    )
    and (
      p_query is null or btrim(p_query) = ''
      or case
           when p_fuzzy
             then word_similarity(public.snd_unaccent(p_query), public.snd_unaccent(l.title)) >= 0.3
           else l.search_vector @@ (select ts from q)
         end
    );
$function$;

-- 3. Money on the booking: the rental price and nothing on top of it.

create or replace function public.snd_price_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_listing record;
begin
  -- Once the owner has answered, the price is what was agreed; a listing whose
  -- price changes afterwards must not silently change the reservation.
  if tg_op = 'UPDATE' and old.status <> 'requested' then
    return new;
  end if;

  if new.start_date is null or new.end_date is null then
    new.days_count := null;
    new.rental_price_minor := 0;
    return new;
  end if;

  new.days_count := ((new.end_date - new.start_date) + 1)::smallint;

  select price_1_day_minor, price_3_days_minor, price_7_days_minor
    into v_listing
  from public.listings
  where id = new.listing_id;

  new.rental_price_minor := case
    when v_listing.price_1_day_minor is null then 0
    else public.snd_rental_price_minor(
      new.days_count,
      v_listing.price_1_day_minor,
      v_listing.price_3_days_minor,
      v_listing.price_7_days_minor
    )
  end;

  return new;
end;
$function$;

drop function if exists public.snd_quote_booking(uuid, integer);

create or replace function public.snd_booking_email_vars(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v record;
  v_range text;
begin
  select
    b.id,
    b.reference,
    b.start_date,
    b.end_date,
    b.rental_price_minor,
    l.title as listing_title,
    coalesce(
      op.display_name,
      nullif(btrim(coalesce(op.first_name, '') || ' ' || left(coalesce(op.last_name, ''), 1)), ''),
      'Korisnik'
    ) as owner_name,
    coalesce(
      rp.display_name,
      nullif(btrim(coalesce(rp.first_name, '') || ' ' || left(coalesce(rp.last_name, ''), 1)), ''),
      'Korisnik'
    ) as renter_name,
    (
      select c.id from public.conversations c
      where c.booking_id = b.id
      order by c.last_message_at desc nulls last
      limit 1
    ) as conversation_id
  into v
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  left join public.user_profiles op on op.user_id = b.owner_id
  left join public.user_profiles rp on rp.user_id = b.renter_id
  where b.id = p_booking_id;

  if v.id is null then
    return '{}'::jsonb;
  end if;

  v_range := case
    when v.start_date is null or v.end_date is null then 'nije dogovoreno'
    else to_char(v.start_date, 'DD.MM.YYYY.') || ' - ' || to_char(v.end_date, 'DD.MM.YYYY.')
  end;

  return jsonb_build_object(
    'listing_title', v.listing_title,
    'owner_name', v.owner_name,
    'renter_name', v.renter_name,
    'booking_reference', v.reference,
    'date_range', v_range,
    'start_date', case when v.start_date is null then '' else to_char(v.start_date, 'DD.MM.YYYY.') end,
    'end_date', case when v.end_date is null then '' else to_char(v.end_date, 'DD.MM.YYYY.') end,
    'rental_amount', public.snd_format_minor(v.rental_price_minor),
    'thread_path', case when v.conversation_id is null then '/profile/requests'
                        else '/profile/requests/' || v.conversation_id::text end
  );
end;
$function$;

revoke all on function public.snd_booking_email_vars(uuid) from public;

create or replace function public.snd_create_rental_request(
  p_listing_id uuid,
  p_body text,
  p_start_date date default null,
  p_end_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_renter_id uuid := auth.uid();
  v_listing record;
  v_location_id uuid;
  v_days smallint;
  v_reference varchar(12);
  v_booking_id uuid;
  v_conversation_id uuid;
  v_today date := (timezone('utc', now()))::date;
  v_preview varchar(160);
begin
  if v_renter_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_body is null or char_length(btrim(p_body)) < 1 or char_length(p_body) > 2000 then
    raise exception 'VALIDATION_FAILED';
  end if;

  if (p_start_date is null) <> (p_end_date is null) then
    raise exception 'VALIDATION_FAILED';
  end if;

  if p_start_date is not null then
    if p_end_date < p_start_date or p_start_date < v_today then
      raise exception 'VALIDATION_FAILED';
    end if;
    v_days := (p_end_date - p_start_date) + 1;
  end if;

  select id, owner_id, status, deleted_at, cancellation_policy, item_value_minor
    into v_listing
  from public.listings
  where id = p_listing_id;

  if v_listing.id is null or v_listing.status <> 'published' or v_listing.deleted_at is not null then
    raise exception 'NOT_FOUND';
  end if;

  if v_listing.owner_id = v_renter_id then
    raise exception 'FORBIDDEN';
  end if;

  select ll.location_id
    into v_location_id
  from public.listing_locations ll
  where ll.listing_id = p_listing_id
  limit 1;

  if v_location_id is null then
    raise exception 'VALIDATION_FAILED';
  end if;

  loop
    v_reference := 'SND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9));
    exit when not exists (select 1 from public.bookings where reference = v_reference);
  end loop;

  -- The rental price is a placeholder; the pricing trigger fills it in before
  -- the row lands.
  insert into public.bookings (
    reference,
    listing_id,
    renter_id,
    owner_id,
    pickup_location_id,
    start_date,
    end_date,
    days_count,
    status,
    rental_price_minor,
    cancellation_policy,
    item_value_minor
  ) values (
    v_reference,
    p_listing_id,
    v_renter_id,
    v_listing.owner_id,
    v_location_id,
    p_start_date,
    p_end_date,
    v_days,
    'requested',
    0,
    v_listing.cancellation_policy,
    coalesce(v_listing.item_value_minor, 0)
  )
  returning id into v_booking_id;

  v_preview := left(btrim(p_body), 160);

  insert into public.conversations (
    listing_id,
    renter_id,
    owner_id,
    booking_id,
    last_message_at,
    last_message_preview,
    renter_unread_count,
    owner_unread_count
  ) values (
    p_listing_id,
    v_renter_id,
    v_listing.owner_id,
    v_booking_id,
    timezone('utc', now()),
    v_preview,
    0,
    2
  )
  on conflict (listing_id, renter_id) do update set
    booking_id = excluded.booking_id,
    last_message_at = excluded.last_message_at,
    last_message_preview = excluded.last_message_preview,
    renter_unread_count = 0,
    owner_unread_count = conversations.owner_unread_count + 2
  returning id into v_conversation_id;

  insert into public.messages (conversation_id, sender_id, type, body, metadata)
  values (
    v_conversation_id,
    null,
    'system_booking_requested',
    null,
    jsonb_build_object(
      'booking_id', v_booking_id,
      'start_date', p_start_date,
      'end_date', p_end_date
    )
  );

  insert into public.messages (conversation_id, sender_id, type, body)
  values (v_conversation_id, v_renter_id, 'text', btrim(p_body));

  perform public.snd_queue_email(
    'booking_request_received',
    v_listing.owner_id,
    public.snd_booking_email_vars(v_booking_id),
    v_booking_id
  );

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'conversation_id', v_conversation_id,
    'reference', v_reference
  );
end;
$function$;

revoke all on function public.snd_create_rental_request(uuid, text, date, date) from public;
grant execute on function public.snd_create_rental_request(uuid, text, date, date) to authenticated;

/**
 * Owner answers a request: accept, decline, or propose other dates.
 *
 * Accepting books the term. There is nothing to pay through the platform, so
 * the owner's answer is the last step before the handover - the dates block,
 * the renter is told, and the exact pickup address unlocks.
 */
create or replace function public.snd_respond_to_rental_request(
  p_booking_id uuid,
  p_action text,
  p_start_date date default null,
  p_end_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_booking record;
  v_conversation record;
  v_next_status public.booking_status;
  v_message_type text;
  v_preview varchar(160);
  v_body text;
  v_today date := (timezone('utc', now()))::date;
  v_metadata jsonb;
  v_vars jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_action is null or p_action not in ('accept', 'decline', 'propose') then
    raise exception 'VALIDATION_FAILED';
  end if;

  select id, owner_id, renter_id, status, listing_id, start_date, end_date
    into v_booking
    from public.bookings
   where id = p_booking_id
   for update;

  if v_booking.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_booking.owner_id <> v_user_id then
    raise exception 'FORBIDDEN';
  end if;

  if v_booking.status <> 'requested' then
    raise exception 'CONFLICT';
  end if;

  select id, renter_id, owner_id
    into v_conversation
    from public.conversations
   where booking_id = p_booking_id
   order by last_message_at desc nulls last
   limit 1;

  if v_conversation.id is null then
    raise exception 'NOT_FOUND';
  end if;

  v_metadata := jsonb_build_object('booking_id', p_booking_id, 'action', p_action);

  if p_action = 'propose' then
    if p_start_date is null or p_end_date is null or p_end_date < p_start_date or p_start_date < v_today then
      raise exception 'VALIDATION_FAILED';
    end if;

    update public.bookings
       set start_date = p_start_date,
           end_date = p_end_date
     where id = p_booking_id
       and status = 'requested';

    if not found then
      raise exception 'CONFLICT';
    end if;

    v_next_status := 'requested';
    v_message_type := 'system';
    v_preview := 'Predloženi su drugi datumi.';
    v_body := 'Predlažem druge datume: ' || to_char(p_start_date, 'DD.MM.YYYY.') || ' - ' || to_char(p_end_date, 'DD.MM.YYYY.');
    v_metadata := v_metadata || jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date);

  elsif p_action = 'accept' then
    -- No agreed term, nothing to reserve: the owner proposes dates first.
    if v_booking.start_date is null or v_booking.end_date is null then
      raise exception 'VALIDATION_FAILED';
    end if;

    v_next_status := 'booked';
    v_message_type := 'booking_accepted';
    v_preview := 'Zahtev je prihvaćen. Termin je rezervisan.';
    v_body := 'Zahtev je prihvaćen. Termin je rezervisan.';

    update public.bookings
       set status = 'booked',
           accepted_at = now(),
           booked_at = now()
     where id = p_booking_id
       and status = 'requested';

    if not found then
      raise exception 'CONFLICT';
    end if;

  else
    v_next_status := 'declined';
    v_message_type := 'booking_declined';
    v_preview := 'Zahtev je odbijen.';
    v_body := 'Zahtev je odbijen.';

    update public.bookings
       set status = v_next_status,
           declined_at = now()
     where id = p_booking_id
       and status = 'requested';

    if not found then
      raise exception 'CONFLICT';
    end if;
  end if;

  insert into public.messages (conversation_id, sender_id, type, body, metadata)
  values (v_conversation.id, v_user_id, v_message_type, v_body, v_metadata);

  update public.conversations
     set last_message_at = timezone('utc', now()),
         last_message_preview = v_preview,
         renter_unread_count = renter_unread_count + 1,
         owner_unread_count = 0
   where id = v_conversation.id;

  if p_action in ('accept', 'decline') then
    v_vars := public.snd_booking_email_vars(p_booking_id);
    perform public.snd_queue_email(
      case when p_action = 'accept' then 'booking_accepted' else 'booking_declined' end,
      v_booking.renter_id,
      v_vars,
      p_booking_id
    );
  end if;

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'status', v_next_status,
    'conversation_id', v_conversation.id
  );
end;
$function$;

revoke all on function public.snd_respond_to_rental_request(uuid, text, date, date) from public;
grant execute on function public.snd_respond_to_rental_request(uuid, text, date, date) to authenticated;

alter table public.bookings
  drop column if exists service_fee_minor,
  drop column if exists owner_payout_minor,
  drop column if exists total_minor,
  drop column if exists paid_at,
  drop column if exists refund_amount_minor;

-- 4. What the thread and the outbox still say about paying.

update public.messages
   set type = 'booking_accepted',
       body = 'Zahtev je prihvaćen. Termin je rezervisan.',
       metadata = coalesce(metadata, '{}'::jsonb) - 'token' - 'payment_path' - 'amount_minor' - 'expires_at'
 where type = 'booking_payment_link';

update public.messages
   set type = 'booking_booked'
 where type = 'booking_paid';

update public.messages
   set body = 'Termin je rezervisan.',
       metadata = coalesce(metadata, '{}'::jsonb) - 'payment_id'
 where type = 'booking_booked';

update public.conversations
   set last_message_preview = 'Termin je rezervisan.'
 where last_message_preview in (
   'Plaćanje je potvrđeno. Termin je rezervisan.',
   'Zahtev je prihvaćen - na redu je plaćanje.'
 );

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages
  add constraint messages_type_check check (
    type in (
      'text',
      'system',
      'system_booking_requested',
      'booking_request',
      'booking_accepted',
      'booking_declined',
      'booking_booked',
      'booking_picked_up',
      'booking_returned',
      'booking_rated',
      'booking_cancelled',
      'review_request'
    )
  );

delete from public.email_messages
 where template_key in ('booking_accepted_payment_link', 'booking_paid_owner', 'booking_paid_renter');

delete from public.email_templates
 where key in ('booking_accepted_payment_link', 'booking_paid_owner', 'booking_paid_renter');

insert into public.email_templates (key, name, description, subject, html_body, text_body, variables)
values (
  'booking_accepted',
  'Zahtev prihvaćen - termin rezervisan',
  'Zakupcu, kada vlasnik prihvati zahtev. Prihvatanjem je termin rezervisan.',
  'Rezervisano: {{listing_title}}',
  '<p>Zdravo {{renter_name}},</p>'
    || '<p><strong>{{owner_name}}</strong> je prihvatio/la tvoj zahtev za <strong>{{listing_title}}</strong>. Termin je rezervisan.</p>'
    || '<p>Termin: {{date_range}}<br />Cena najma: {{rental_amount}}<br />Broj rezervacije: {{booking_reference}}</p>'
    || '<p>Cenu najma plaćaš direktno vlasniku, kako se dogovorite. SND ne naplaćuje iznajmljivanje.</p>'
    || '<p><a href="{{thread_url}}">Otvori rezervaciju</a></p>',
  'Zdravo {{renter_name}}, {{owner_name}} je prihvatio/la zahtev za {{listing_title}} ({{date_range}}). Termin je rezervisan. Cena najma: {{rental_amount}}, plaća se direktno vlasniku. Otvori: {{thread_url}}',
  '["renter_name","owner_name","listing_title","date_range","rental_amount","booking_reference","thread_url","app_url"]'::jsonb
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  html_body = excluded.html_body,
  text_body = excluded.text_body,
  variables = excluded.variables,
  is_active = true;
