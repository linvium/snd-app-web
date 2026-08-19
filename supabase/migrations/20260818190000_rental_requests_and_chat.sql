-- Optional dates on requested bookings, spec system message type, and an
-- atomic RPC so system rows can be inserted with sender_id NULL.

alter table public.bookings
  alter column start_date drop not null,
  alter column end_date drop not null,
  alter column days_count drop not null;

alter table public.bookings drop constraint if exists bookings_dates_check;
alter table public.bookings drop constraint if exists bookings_days_count_check;

alter table public.bookings
  add constraint bookings_optional_dates_check check (
    (start_date is null and end_date is null and days_count is null)
    or (
      start_date is not null
      and end_date is not null
      and days_count is not null
      and end_date >= start_date
      and days_count > 0
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
  v_blocks := new.status in ('accepted', 'paid', 'in_progress');

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

alter table public.messages
  alter column type type character varying(40);

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages
  add constraint messages_type_check check (
    (type)::text = any ((array[
      'text'::character varying,
      'system'::character varying,
      'system_booking_requested'::character varying,
      'booking_request'::character varying,
      'booking_accepted'::character varying,
      'booking_declined'::character varying,
      'booking_paid'::character varying,
      'booking_cancelled'::character varying,
      'review_request'::character varying
    ])::text[])
  );

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
  v_rental_price bigint := 0;
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

  select
    id,
    owner_id,
    status,
    deleted_at,
    price_1_day_minor,
    cancellation_policy,
    item_value_minor
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

  if v_days is not null then
    v_rental_price := v_days * coalesce(v_listing.price_1_day_minor, 0);
  end if;

  loop
    v_reference := 'SND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9));
    exit when not exists (select 1 from public.bookings where reference = v_reference);
  end loop;

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
    service_fee_minor,
    total_minor,
    owner_payout_minor,
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
    v_rental_price,
    0,
    v_rental_price,
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

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'conversation_id', v_conversation_id,
    'reference', v_reference
  );
end;
$function$;

revoke all on function public.snd_create_rental_request(uuid, text, date, date) from public;
grant execute on function public.snd_create_rental_request(uuid, text, date, date) to authenticated;
