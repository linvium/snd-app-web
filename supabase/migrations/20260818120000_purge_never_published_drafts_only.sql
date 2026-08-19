create or replace function public.snd_purge_expired_drafts()
returns void
language plpgsql
security definer
set search_path to 'public', 'storage'
as $$
declare
  draft record;
begin
  for draft in
    select id
    from public.listings
    where status = 'draft'
      and published_at is null
      and created_at < now() - interval '30 days'
  loop
    delete from storage.objects
    where bucket_id = 'listing-images'
      and name like draft.id::text || '/%';

    delete from public.listings where id = draft.id;
  end loop;
end;
$$;
