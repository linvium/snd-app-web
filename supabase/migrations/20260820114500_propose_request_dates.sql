drop function if exists public.snd_respond_to_rental_request(uuid, text);

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
  v_next_status text;
  v_message_type text;
  v_preview varchar(160);
  v_body text;
  v_days smallint;
  v_rental_price bigint := 0;
  v_today date := (timezone('utc', now()))::date;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_action is null or p_action not in ('accept', 'decline', 'propose') then
    raise exception 'VALIDATION_FAILED';
  end if;

  select id, owner_id, status, listing_id, start_date, end_date
    into v_booking
    from public.bookings
   where id = p_booking_id;

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
  elsif p_action = 'accept' then
    v_next_status := 'accepted';
    v_message_type := 'booking_accepted';
    v_preview := 'Zahtev je prihvaćen.';
    v_body := 'Zahtev je prihvaćen.';

    update public.bookings
       set status = v_next_status
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
       set status = v_next_status
     where id = p_booking_id
       and status = 'requested';

    if not found then
      raise exception 'CONFLICT';
    end if;
  end if;

  insert into public.messages (conversation_id, sender_id, type, body, metadata)
  values (
    v_conversation.id,
    case when p_action = 'propose' then v_user_id else null end,
    v_message_type,
    v_body,
    jsonb_build_object(
      'booking_id', p_booking_id,
      'action', p_action,
      'start_date', p_start_date,
      'end_date', p_end_date
    )
  );

  update public.conversations
     set last_message_at = timezone('utc', now()),
         last_message_preview = v_preview,
         renter_unread_count = renter_unread_count + 1,
         owner_unread_count = 0
   where id = v_conversation.id;

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'status', v_next_status,
    'conversation_id', v_conversation.id
  );
end;
$function$;

revoke all on function public.snd_respond_to_rental_request(uuid, text, date, date) from public;
grant execute on function public.snd_respond_to_rental_request(uuid, text, date, date) to authenticated;
