-- Own text messages can be edited or soft-deleted within 15 minutes of send.
-- Security-definer RPCs (same pattern as snd_send_text_message) keep preview
-- in sync when the last row in the thread changes. No UPDATE/DELETE RLS.

alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

create or replace function public.snd_message_payload(p_message public.messages)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_message.id,
    'conversation_id', p_message.conversation_id,
    'sender_id', p_message.sender_id,
    'type', p_message.type,
    'body', p_message.body,
    'metadata', p_message.metadata,
    'created_at', p_message.created_at,
    'edited_at', p_message.edited_at,
    'deleted_at', p_message.deleted_at
  );
$$;

revoke all on function public.snd_message_payload(public.messages) from public;

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
  v_message public.messages;
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
  returning * into v_message;

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

  return public.snd_message_payload(v_message);
end;
$function$;

revoke all on function public.snd_send_text_message(uuid, text) from public;
grant execute on function public.snd_send_text_message(uuid, text) to authenticated;

create or replace function public.snd_refresh_last_message_preview(
  p_conversation_id uuid,
  p_message_id uuid,
  p_preview varchar(160)
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if exists (
    select 1
      from public.messages as newer
     where newer.conversation_id = p_conversation_id
       and newer.created_at > (
         select created_at from public.messages where id = p_message_id
       )
  ) then
    return;
  end if;

  update public.conversations
     set last_message_preview = p_preview
   where id = p_conversation_id;
end;
$function$;

revoke all on function public.snd_refresh_last_message_preview(uuid, uuid, varchar) from public;

create or replace function public.snd_edit_text_message(
  p_conversation_id uuid,
  p_message_id uuid,
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
  v_message public.messages;
  v_trimmed text;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_body is null or char_length(btrim(p_body)) < 1 or char_length(p_body) > 2000 then
    raise exception 'VALIDATION_FAILED';
  end if;

  v_trimmed := btrim(p_body);

  select id, renter_id, owner_id
    into v_conversation
    from public.conversations
   where id = p_conversation_id;

  if v_conversation.id is null
     or (v_conversation.renter_id <> v_user_id and v_conversation.owner_id <> v_user_id) then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_message
    from public.messages
   where id = p_message_id
     and conversation_id = p_conversation_id;

  if v_message.id is null
     or v_message.type <> 'text'
     or v_message.sender_id <> v_user_id
     or v_message.deleted_at is not null then
    raise exception 'NOT_FOUND';
  end if;

  if v_message.created_at < timezone('utc', now()) - interval '15 minutes' then
    raise exception 'WINDOW_EXPIRED';
  end if;

  if v_message.body is not distinct from v_trimmed then
    return public.snd_message_payload(v_message);
  end if;

  update public.messages
     set body = v_trimmed,
         edited_at = timezone('utc', now())
   where id = p_message_id
  returning * into v_message;

  perform public.snd_refresh_last_message_preview(
    p_conversation_id,
    p_message_id,
    left(v_trimmed, 160)
  );

  return public.snd_message_payload(v_message);
end;
$function$;

revoke all on function public.snd_edit_text_message(uuid, uuid, text) from public;
grant execute on function public.snd_edit_text_message(uuid, uuid, text) to authenticated;

create or replace function public.snd_delete_text_message(
  p_conversation_id uuid,
  p_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_conversation record;
  v_message public.messages;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select id, renter_id, owner_id
    into v_conversation
    from public.conversations
   where id = p_conversation_id;

  if v_conversation.id is null
     or (v_conversation.renter_id <> v_user_id and v_conversation.owner_id <> v_user_id) then
    raise exception 'NOT_FOUND';
  end if;

  select * into v_message
    from public.messages
   where id = p_message_id
     and conversation_id = p_conversation_id;

  if v_message.id is null
     or v_message.type <> 'text'
     or v_message.sender_id <> v_user_id then
    raise exception 'NOT_FOUND';
  end if;

  if v_message.deleted_at is not null then
    return public.snd_message_payload(v_message);
  end if;

  if v_message.created_at < timezone('utc', now()) - interval '15 minutes' then
    raise exception 'WINDOW_EXPIRED';
  end if;

  update public.messages
     set deleted_at = timezone('utc', now())
   where id = p_message_id
  returning * into v_message;

  perform public.snd_refresh_last_message_preview(
    p_conversation_id,
    p_message_id,
    'Poruka je obrisana'
  );

  return public.snd_message_payload(v_message);
end;
$function$;

revoke all on function public.snd_delete_text_message(uuid, uuid) from public;
grant execute on function public.snd_delete_text_message(uuid, uuid) to authenticated;
