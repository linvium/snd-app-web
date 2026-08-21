-- The rest of the reservation, as transactions.
--
-- Each step is one RPC that moves the status, writes the message the thread
-- shows, and queues the mail - in a single transaction, so a booking can never
-- be `booked` with nobody told about it.
--
--   accept   -> accepted + payment link in the chat + mail to the renter
--   pay      -> booked   + mail to both sides            (service role only)
--   pick up  -> picked_up                                (owner)
--   return   -> returned + review request                (owner)
--   review   -> rated                                    (either side)
--
-- Absolute URLs are deliberately absent: the database stores paths and the
-- send-email function prefixes them with APP_URL, so the domain lives in one
-- place and staging never mails production links.

/** "1.234 RSD" from minor units. Dinar has no practical subunit in use. */
create or replace function public.snd_format_minor(p_minor bigint)
returns text
language sql
immutable
as $function$
  select replace(
    to_char(round(coalesce(p_minor, 0) / 100.0)::bigint, 'FM999,999,999,999'),
    ',', '.'
  ) || ' RSD';
$function$;

/** Names, title, dates and money for the lifecycle mails, in one lookup. */
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
    b.total_minor,
    b.owner_payout_minor,
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
    'total_amount', public.snd_format_minor(v.total_minor),
    'payout_amount', public.snd_format_minor(v.owner_payout_minor),
    'thread_path', case when v.conversation_id is null then '/profile/requests'
                        else '/profile/requests/' || v.conversation_id::text end
  );
end;
$function$;

revoke all on function public.snd_booking_email_vars(uuid) from public;

/**
 * Owner answers a request: accept, decline, or propose other dates.
 *
 * Accepting now does more than flip a status - it mints the payment link and
 * drops it in the thread, because acceptance without a way to pay leaves the
 * renter holding a promise. A request with no dates cannot be accepted at all:
 * there is no term to reserve and no amount to charge, so the owner has to
 * propose dates first.
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
  v_listing record;
  v_conversation record;
  v_next_status public.booking_status;
  v_message_type text;
  v_preview varchar(160);
  v_body text;
  v_days smallint;
  v_rental_price bigint := 0;
  v_today date := (timezone('utc', now()))::date;
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

    select price_1_day_minor into v_listing from public.listings where id = v_booking.listing_id;
    v_days := (p_end_date - p_start_date) + 1;
    v_rental_price := v_days * coalesce(v_listing.price_1_day_minor, 0);

    update public.bookings
       set start_date = p_start_date,
           end_date = p_end_date,
           days_count = v_days,
           rental_price_minor = v_rental_price,
           total_minor = v_rental_price
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
       and status = 'requested';

    if not found then
      raise exception 'CONFLICT';
    end if;

    -- One live link per booking; anything older is history, not an option.
    update public.booking_payment_links
       set status = 'cancelled'
     where booking_id = p_booking_id
       and status = 'pending';

    v_token := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    v_expires := now() + interval '72 hours';

    insert into public.booking_payment_links (booking_id, token, amount_minor, expires_at)
    values (p_booking_id, v_token, coalesce(v_booking.total_minor, 0), v_expires);

    v_body := 'Zahtev je prihvaćen. Plati da rezervišeš termin.';
    v_metadata := v_metadata || jsonb_build_object(
      'token', v_token,
      'payment_path', '/pay/' || v_token,
      'amount_minor', coalesce(v_booking.total_minor, 0),
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

/**
 * Payment confirmed - the reservation is real.
 *
 * Only the service role may call this: the caller is the payment provider's
 * webhook (through the `payment-confirm` edge function), never a browser. The
 * token identifies the order, so no user context is needed or trusted.
 */
create or replace function public.snd_confirm_booking_payment(
  p_token text,
  p_provider_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link record;
  v_booking record;
  v_conversation record;
  v_payment_id uuid;
  v_vars jsonb;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'VALIDATION_FAILED';
  end if;

  select * into v_link
    from public.booking_payment_links
   where token = btrim(p_token)
   for update;

  if v_link.id is null then
    raise exception 'NOT_FOUND';
  end if;

  -- Paying twice is the failure mode that costs real money, so a settled link
  -- answers with what already happened instead of doing it again.
  if v_link.status = 'paid' then
    return jsonb_build_object(
      'booking_id', v_link.booking_id,
      'status', 'booked',
      'already_paid', true
    );
  end if;

  if v_link.status <> 'pending' then
    raise exception 'CONFLICT';
  end if;

  if v_link.expires_at <= now() then
    update public.booking_payment_links set status = 'expired' where id = v_link.id;
    raise exception 'EXPIRED';
  end if;

  select id, renter_id, owner_id, status, total_minor
    into v_booking
    from public.bookings
   where id = v_link.booking_id
   for update;

  if v_booking.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_booking.status <> 'accepted' then
    raise exception 'CONFLICT';
  end if;

  insert into public.payments (booking_id, user_id, purpose, amount_minor, currency, status)
  values (v_booking.id, v_booking.renter_id, 'booking', v_link.amount_minor, v_link.currency, 'succeeded')
  returning id into v_payment_id;

  update public.booking_payment_links
     set status = 'paid',
         paid_at = now(),
         payment_id = v_payment_id,
         provider_reference = p_provider_reference
   where id = v_link.id;

  update public.bookings
     set status = 'booked',
         paid_at = now(),
         booked_at = now()
   where id = v_booking.id
     and status = 'accepted';

  if not found then
    raise exception 'CONFLICT';
  end if;

  select id into v_conversation
    from public.conversations
   where booking_id = v_booking.id
   order by last_message_at desc nulls last
   limit 1;

  if v_conversation.id is not null then
    insert into public.messages (conversation_id, sender_id, type, body, metadata)
    values (
      v_conversation.id,
      null,
      'booking_booked',
      'Plaćanje je potvrđeno. Termin je rezervisan.',
      jsonb_build_object('booking_id', v_booking.id, 'payment_id', v_payment_id)
    );

    update public.conversations
       set last_message_at = timezone('utc', now()),
           last_message_preview = 'Plaćanje je potvrđeno. Termin je rezervisan.',
           renter_unread_count = renter_unread_count + 1,
           owner_unread_count = owner_unread_count + 1
     where id = v_conversation.id;
  end if;

  v_vars := public.snd_booking_email_vars(v_booking.id);
  perform public.snd_queue_email('booking_paid_owner', v_booking.owner_id, v_vars, v_booking.id);
  perform public.snd_queue_email('booking_paid_renter', v_booking.renter_id, v_vars, v_booking.id);

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', 'booked',
    'payment_id', v_payment_id,
    'already_paid', false
  );
end;
$function$;

revoke all on function public.snd_confirm_booking_payment(text, text) from public;
grant execute on function public.snd_confirm_booking_payment(text, text) to service_role;

/** Owner hands the item over. */
create or replace function public.snd_mark_booking_picked_up(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_booking record;
  v_conversation record;
  v_vars jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select id, owner_id, renter_id, status into v_booking
    from public.bookings where id = p_booking_id for update;

  if v_booking.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_booking.owner_id <> v_user_id then
    raise exception 'FORBIDDEN';
  end if;

  if v_booking.status <> 'booked' then
    raise exception 'CONFLICT';
  end if;

  update public.bookings
     set status = 'picked_up',
         picked_up_at = now()
   where id = p_booking_id
     and status = 'booked';

  if not found then
    raise exception 'CONFLICT';
  end if;

  select id into v_conversation from public.conversations
   where booking_id = p_booking_id
   order by last_message_at desc nulls last limit 1;

  if v_conversation.id is not null then
    insert into public.messages (conversation_id, sender_id, type, body, metadata)
    values (
      v_conversation.id, null, 'booking_picked_up',
      'Predmet je preuzet.',
      jsonb_build_object('booking_id', p_booking_id)
    );

    update public.conversations
       set last_message_at = timezone('utc', now()),
           last_message_preview = 'Predmet je preuzet.',
           renter_unread_count = renter_unread_count + 1
     where id = v_conversation.id;
  end if;

  v_vars := public.snd_booking_email_vars(p_booking_id);
  perform public.snd_queue_email('booking_picked_up', v_booking.renter_id, v_vars, p_booking_id);

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'status', 'picked_up',
    'conversation_id', v_conversation.id
  );
end;
$function$;

revoke all on function public.snd_mark_booking_picked_up(uuid) from public;
grant execute on function public.snd_mark_booking_picked_up(uuid) to authenticated;

/**
 * Owner has the item back.
 *
 * Reachable from `booked` as well as `picked_up`, because plenty of handovers
 * never get marked and refusing to close the rental over a missing click would
 * strand the booking short of its review.
 */
create or replace function public.snd_mark_booking_returned(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_booking record;
  v_conversation record;
  v_vars jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select id, owner_id, renter_id, status into v_booking
    from public.bookings where id = p_booking_id for update;

  if v_booking.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_booking.owner_id <> v_user_id then
    raise exception 'FORBIDDEN';
  end if;

  if v_booking.status not in ('booked', 'picked_up') then
    raise exception 'CONFLICT';
  end if;

  update public.bookings
     set status = 'returned',
         returned_at = now(),
         completed_at = now(),
         picked_up_at = coalesce(picked_up_at, now())
   where id = p_booking_id
     and status in ('booked', 'picked_up');

  if not found then
    raise exception 'CONFLICT';
  end if;

  select id into v_conversation from public.conversations
   where booking_id = p_booking_id
   order by last_message_at desc nulls last limit 1;

  if v_conversation.id is not null then
    insert into public.messages (conversation_id, sender_id, type, body, metadata)
    values (
      v_conversation.id, null, 'booking_returned',
      'Predmet je vraćen. Iznajmljivanje je završeno - ostavite ocene.',
      jsonb_build_object('booking_id', p_booking_id)
    );

    update public.conversations
       set last_message_at = timezone('utc', now()),
           last_message_preview = 'Predmet je vraćen. Ostavite ocene.',
           renter_unread_count = renter_unread_count + 1,
           owner_unread_count = owner_unread_count + 1
     where id = v_conversation.id;
  end if;

  v_vars := public.snd_booking_email_vars(p_booking_id);

  perform public.snd_queue_email(
    'booking_returned_review_request',
    v_booking.renter_id,
    v_vars || jsonb_build_object(
      'recipient_name', v_vars ->> 'renter_name',
      'other_party_name', v_vars ->> 'owner_name'
    ),
    p_booking_id
  );
  perform public.snd_queue_email(
    'booking_returned_review_request',
    v_booking.owner_id,
    v_vars || jsonb_build_object(
      'recipient_name', v_vars ->> 'owner_name',
      'other_party_name', v_vars ->> 'renter_name'
    ),
    p_booking_id
  );

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'status', 'returned',
    'conversation_id', v_conversation.id
  );
end;
$function$;

revoke all on function public.snd_mark_booking_returned(uuid) from public;
grant execute on function public.snd_mark_booking_returned(uuid) to authenticated;

/**
 * A review closes the reservation.
 *
 * Either side may write one, and the booking reaches `rated` on the first of
 * them - the step in the interface says the rental has been rated, not that
 * both people got around to it. Publication stays double-blind: the text
 * appears only once both sides have written, so nobody answers a rating they
 * have already read.
 */
create or replace function public.snd_submit_booking_review(
  p_booking_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_booking record;
  v_direction text;
  v_subject uuid;
  v_review_id uuid;
  v_conversation record;
  v_both boolean;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'VALIDATION_FAILED';
  end if;

  if p_comment is not null and char_length(p_comment) > 1000 then
    raise exception 'VALIDATION_FAILED';
  end if;

  select id, owner_id, renter_id, listing_id, status into v_booking
    from public.bookings where id = p_booking_id for update;

  if v_booking.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_user_id not in (v_booking.owner_id, v_booking.renter_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_booking.status not in ('returned', 'rated') then
    raise exception 'CONFLICT';
  end if;

  if v_user_id = v_booking.renter_id then
    v_direction := 'renter_to_owner';
    v_subject := v_booking.owner_id;
  else
    v_direction := 'owner_to_renter';
    v_subject := v_booking.renter_id;
  end if;

  if exists (
    select 1 from public.reviews
    where booking_id = p_booking_id and author_id = v_user_id
  ) then
    raise exception 'CONFLICT';
  end if;

  insert into public.reviews (
    booking_id, author_id, subject_user_id, listing_id, direction, rating, comment, is_published
  ) values (
    p_booking_id, v_user_id, v_subject, v_booking.listing_id, v_direction, p_rating,
    nullif(btrim(coalesce(p_comment, '')), ''), false
  )
  returning id into v_review_id;

  v_both := (
    select count(distinct author_id) from public.reviews where booking_id = p_booking_id
  ) >= 2;

  if v_both then
    update public.reviews
       set is_published = true,
           published_at = coalesce(published_at, now())
     where booking_id = p_booking_id
       and is_published = false;
  end if;

  update public.bookings
     set status = 'rated',
         rated_at = coalesce(rated_at, now())
   where id = p_booking_id
     and status = 'returned';

  select id into v_conversation from public.conversations
   where booking_id = p_booking_id
   order by last_message_at desc nulls last limit 1;

  if v_conversation.id is not null then
    insert into public.messages (conversation_id, sender_id, type, body, metadata)
    values (
      v_conversation.id, null, 'booking_rated',
      case when v_both then 'Obe ocene su objavljene.' else 'Ocena je ostavljena.' end,
      jsonb_build_object('booking_id', p_booking_id, 'published', v_both)
    );

    update public.conversations
       set last_message_at = timezone('utc', now()),
           last_message_preview = case when v_both then 'Obe ocene su objavljene.' else 'Ocena je ostavljena.' end,
           renter_unread_count = case when v_user_id = v_booking.renter_id then renter_unread_count else renter_unread_count + 1 end,
           owner_unread_count = case when v_user_id = v_booking.owner_id then owner_unread_count else owner_unread_count + 1 end
     where id = v_conversation.id;
  end if;

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'review_id', v_review_id,
    'status', 'rated',
    'published', v_both,
    'conversation_id', v_conversation.id
  );
end;
$function$;

revoke all on function public.snd_submit_booking_review(uuid, smallint, text) from public;
grant execute on function public.snd_submit_booking_review(uuid, smallint, text) to authenticated;
