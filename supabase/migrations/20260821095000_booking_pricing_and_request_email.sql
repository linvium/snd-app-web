-- One owner for the money on a booking.
--
-- Until the link was chargeable it hardly mattered that the RPCs stored
-- `days * price_1_day` with a zero fee and a zero payout - nothing read those
-- numbers. Now the payment link bills `total_minor` and the owner's mail quotes
-- `owner_payout_minor`, so the figures have to be the ones the item page
-- quotes: cheapest package combination, renter fee on top, commission off the
-- payout (doc 00 §6.1-6.2).
--
-- It is a trigger rather than a line in each RPC because there were already two
-- writers and the next one would have been the one that forgot.

/**
 * Cheapest combination of 1/3/7-day packages covering `p_days`.
 *
 * Mirrors calculateRentalPrice in lib/pricing/pricing.helpers.ts, including the
 * part that makes it non-obvious: a package may run past the last day when that
 * costs less than filling the remainder a day at a time.
 */
create or replace function public.snd_rental_price_minor(
  p_days integer,
  p_price_1 bigint,
  p_price_3 bigint,
  p_price_7 bigint
)
returns bigint
language plpgsql
immutable
as $function$
declare
  n integer := greatest(1, coalesce(p_days, 1));
  c1 bigint := coalesce(p_price_1, 0);
  c3 bigint;
  c7 bigint;
  best bigint[];
  d integer;
  candidate bigint;
begin
  c3 := coalesce(p_price_3, c1 * 3);
  c7 := coalesce(p_price_7, least(c1 * 7, c3 * 3 + c1));

  -- best[i] is the cheapest cover for (i - 1) days; best[1] is zero days.
  best := array_fill(null::bigint, array[n + 1]);
  best[1] := 0;

  for d in 1..n loop
    candidate := best[d] + c1;
    if best[d + 1] is null or candidate < best[d + 1] then best[d + 1] := candidate; end if;

    if d >= 3 and best[d - 2] is not null then
      candidate := best[d - 2] + c3;
      if best[d + 1] is null or candidate < best[d + 1] then best[d + 1] := candidate; end if;
    end if;

    if d >= 7 and best[d - 6] is not null then
      candidate := best[d - 6] + c7;
      if best[d + 1] is null or candidate < best[d + 1] then best[d + 1] := candidate; end if;
    end if;

    if d < 3 then
      candidate := c3;
      if best[d + 1] is null or candidate < best[d + 1] then best[d + 1] := candidate; end if;
    end if;

    if d < 7 then
      candidate := c7;
      if best[d + 1] is null or candidate < best[d + 1] then best[d + 1] := candidate; end if;
    end if;
  end loop;

  return coalesce(best[n + 1], c1 * n);
end;
$function$;

/**
 * The whole sum for a listing over a number of days.
 *
 * The two rates mirror NEXT_PUBLIC_RENTER_FEE_PERCENT / OWNER_FEE_PERCENT and
 * their documented defaults. They live here as well because the database is
 * where the amount that gets charged is written.
 */
create or replace function public.snd_quote_booking(p_listing_id uuid, p_days integer)
returns table (
  rental_price_minor bigint,
  service_fee_minor bigint,
  total_minor bigint,
  owner_payout_minor bigint
)
language plpgsql
stable
as $function$
declare
  v_renter_fee numeric := 0.10;
  v_owner_fee numeric := 0.05;
  v_listing record;
  v_rental bigint;
  v_fee bigint;
begin
  select price_1_day_minor, price_3_days_minor, price_7_days_minor
    into v_listing
  from public.listings
  where id = p_listing_id;

  if v_listing.price_1_day_minor is null or p_days is null or p_days <= 0 then
    return query select 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  v_rental := public.snd_rental_price_minor(
    p_days,
    v_listing.price_1_day_minor,
    v_listing.price_3_days_minor,
    v_listing.price_7_days_minor
  );
  v_fee := round(v_rental * v_renter_fee)::bigint;

  return query select
    v_rental,
    v_fee,
    v_rental + v_fee,
    v_rental - round(v_rental * v_owner_fee)::bigint;
end;
$function$;

/**
 * Prices a booking from its dates.
 *
 * Only while the request is still open: once the owner has answered, the figure
 * on the payment link is what was agreed, and a listing whose price changed
 * afterwards must not silently change what somebody owes.
 */
create or replace function public.snd_price_booking()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_quote record;
begin
  if tg_op = 'UPDATE' and old.status <> 'requested' then
    return new;
  end if;

  if new.start_date is null or new.end_date is null then
    new.days_count := null;
    new.rental_price_minor := 0;
    new.service_fee_minor := 0;
    new.total_minor := 0;
    new.owner_payout_minor := 0;
    return new;
  end if;

  new.days_count := ((new.end_date - new.start_date) + 1)::smallint;

  select * into v_quote from public.snd_quote_booking(new.listing_id, new.days_count);

  new.rental_price_minor := v_quote.rental_price_minor;
  new.service_fee_minor := v_quote.service_fee_minor;
  new.total_minor := v_quote.total_minor;
  new.owner_payout_minor := v_quote.owner_payout_minor;

  return new;
end;
$function$;

drop trigger if exists bookings_price on public.bookings;
create trigger bookings_price
  before insert or update of start_date, end_date on public.bookings
  for each row execute function public.snd_price_booking();

-- Open requests only. Anything already answered keeps the figure it was
-- answered with.
update public.bookings
   set start_date = start_date
 where status = 'requested'
   and start_date is not null;

/**
 * Creating a request now also tells the owner by email.
 *
 * The price arithmetic that used to be here is gone: the trigger owns it, and
 * this function only has to say which dates were asked for.
 */
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

  loop
    v_reference := 'SND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9));
    exit when not exists (select 1 from public.bookings where reference = v_reference);
  end loop;

  -- The four money columns are placeholders; the pricing trigger fills them in
  -- before the row lands.
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
    0,
    0,
    0,
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
 * Same owner response as before, with the payment link taking its amount from
 * the row after the pricing trigger has had its say rather than from the copy
 * read at the top of the function.
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
  v_amount bigint := 0;
  v_token text;
  v_expires timestamptz;
  v_metadata jsonb;
  v_vars jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_action is null or p_action not in ('accept', 'decline', 'propose') then
    raise exception 'VALIDATION_FAILED';
  end if;

  select id, owner_id, renter_id, status, listing_id, start_date, end_date, total_minor
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
    if v_booking.start_date is null or v_booking.end_date is null then
      raise exception 'VALIDATION_FAILED';
    end if;

    v_next_status := 'accepted';
    v_message_type := 'booking_payment_link';
    v_preview := 'Zahtev je prihvaćen - na redu je plaćanje.';

    update public.bookings
       set status = v_next_status,
           accepted_at = now()
     where id = p_booking_id
       and status = 'requested'
    returning total_minor into v_amount;

    if v_amount is null then
      raise exception 'CONFLICT';
    end if;

    update public.booking_payment_links
       set status = 'cancelled'
     where booking_id = p_booking_id
       and status = 'pending';

    v_token := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    v_expires := now() + interval '72 hours';

    insert into public.booking_payment_links (booking_id, token, amount_minor, expires_at)
    values (p_booking_id, v_token, v_amount, v_expires);

    v_body := 'Zahtev je prihvaćen. Plati da rezervišeš termin.';
    v_metadata := v_metadata || jsonb_build_object(
      'token', v_token,
      'payment_path', '/pay/' || v_token,
      'amount_minor', v_amount,
      'expires_at', v_expires
    );

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
  values (
    v_conversation.id,
    case when p_action = 'accept' then null else v_user_id end,
    v_message_type,
    v_body,
    v_metadata
  );

  update public.conversations
     set last_message_at = timezone('utc', now()),
         last_message_preview = v_preview,
         renter_unread_count = renter_unread_count + 1,
         owner_unread_count = 0
   where id = v_conversation.id;

  if p_action in ('accept', 'decline') then
    v_vars := public.snd_booking_email_vars(p_booking_id);

    if p_action = 'accept' then
      perform public.snd_queue_email(
        'booking_accepted_payment_link',
        v_booking.renter_id,
        v_vars || jsonb_build_object(
          'payment_path', '/pay/' || v_token,
          'expires_at', to_char(v_expires at time zone 'Europe/Belgrade', 'DD.MM.YYYY. HH24:MI')
        ),
        p_booking_id
      );
    else
      perform public.snd_queue_email('booking_declined', v_booking.renter_id, v_vars, p_booking_id);
    end if;
  end if;

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'status', v_next_status,
    'conversation_id', v_conversation.id,
    'payment_token', v_token
  );
end;
$function$;

revoke all on function public.snd_respond_to_rental_request(uuid, text, date, date) from public;
grant execute on function public.snd_respond_to_rental_request(uuid, text, date, date) to authenticated;
