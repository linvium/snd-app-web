-- Owner accept / decline of a requested booking, with a system row in the
-- same conversation so both sides see the decision in the thread.

create or replace function public.snd_respond_to_rental_request(
  p_booking_id uuid,
  p_action text
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
  v_next_status text;
  v_message_type text;
  v_preview varchar(160);
  v_body text;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_action is null or p_action not in ('accept', 'decline') then
    raise exception 'VALIDATION_FAILED';
  end if;

  select id, owner_id, status
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

  if p_action = 'accept' then
    v_next_status := 'accepted';
    v_message_type := 'booking_accepted';
    v_preview := 'Zahtev je prihvaćen.';
    v_body := 'Zahtev je prihvaćen.';
  else
    v_next_status := 'declined';
    v_message_type := 'booking_declined';
    v_preview := 'Zahtev je odbijen.';
    v_body := 'Zahtev je odbijen.';
  end if;

  update public.bookings
     set status = v_next_status
   where id = p_booking_id
     and status = 'requested';

  if not found then
    raise exception 'CONFLICT';
  end if;

  insert into public.messages (conversation_id, sender_id, type, body, metadata)
  values (
    v_conversation.id,
    null,
    v_message_type,
    v_body,
    jsonb_build_object('booking_id', p_booking_id, 'action', p_action)
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

revoke all on function public.snd_respond_to_rental_request(uuid, text) from public;
grant execute on function public.snd_respond_to_rental_request(uuid, text) to authenticated;
