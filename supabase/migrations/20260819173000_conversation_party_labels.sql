-- Chat counterparties can read a name (or email) without opening the whole
-- users / user_profiles rows to the public.

create or replace function public.snd_conversation_parties(p_user_ids uuid[])
returns table (
  user_id uuid,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.avatar_url,
    u.email
  from public.users u
  left join public.user_profiles p on p.user_id = u.id
  where u.id = any (p_user_ids)
    and exists (
      select 1
      from public.conversations c
      where (c.renter_id = auth.uid() and c.owner_id = u.id)
         or (c.owner_id = auth.uid() and c.renter_id = u.id)
    );
$$;

revoke all on function public.snd_conversation_parties(uuid[]) from public;
grant execute on function public.snd_conversation_parties(uuid[]) to authenticated;
