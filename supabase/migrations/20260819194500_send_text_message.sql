-- Atomic send so the other party's unread count always moves with the row.
-- A plain update from the sender can look successful while the recipient
-- still sees zero - this RPC writes both in one security-definer step.

create or replace function public.snd_send_text_message(
  p_conversation_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_conversation record;
  v_message record;
  v_preview varchar(160);
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_body is null or char_length(btrim(p_body)) < 1 or char_length(p_body) > 2000 then
    raise exception 'VALIDATION_FAILED';
  end if;

  select id, renter_id, owner_id
    into v_conversation
  from public.conversations
  where id = p_conversation_id;

  if v_conversation.id is null
     or (v_conversation.renter_id <> v_user_id and v_conversation.owner_id <> v_user_id) then
    raise exception 'NOT_FOUND';
  end if;

  v_preview := left(btrim(p_body), 160);

  insert into public.messages (conversation_id, sender_id, type, body)
  values (p_conversation_id, v_user_id, 'text', btrim(p_body))
  returning id, conversation_id, sender_id, type, body, metadata, created_at
  into v_message;

  update public.conversations
  set
    last_message_at = timezone('utc', now()),
    last_message_preview = v_preview,
    renter_unread_count = case
      when v_conversation.renter_id = v_user_id then 0
      else renter_unread_count + 1
    end,
    owner_unread_count = case
      when v_conversation.owner_id = v_user_id then 0
      else owner_unread_count + 1
    end
  where id = p_conversation_id;

  return jsonb_build_object(
    'id', v_message.id,
    'conversation_id', v_message.conversation_id,
    'sender_id', v_message.sender_id,
    'type', v_message.type,
    'body', v_message.body,
    'metadata', v_message.metadata,
    'created_at', v_message.created_at
  );
end;
$function$;

revoke all on function public.snd_send_text_message(uuid, text) from public;
grant execute on function public.snd_send_text_message(uuid, text) to authenticated;
