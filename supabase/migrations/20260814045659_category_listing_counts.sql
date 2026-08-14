-- categories.listing_count is defined as trigger-maintained (doc 00 §3.5) but
-- had no trigger. It counts only what search would return, for that category
-- alone; the rollup to ancestors happens at read time in snd_category_tree().

create or replace function public.snd_recount_category(target_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.categories c
  set listing_count = (
    select count(*)
    from public.listings l
    where l.category_id = c.id
      and l.status = 'published'
      and l.deleted_at is null
  )
  where c.id = target_id;
$$;

create or replace function public.snd_sync_category_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.snd_recount_category(old.category_id);
    return old;
  end if;

  perform public.snd_recount_category(new.category_id);

  if tg_op = 'UPDATE' and old.category_id is distinct from new.category_id then
    perform public.snd_recount_category(old.category_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listings_category_counts on public.listings;
create trigger trg_listings_category_counts
  after insert or delete or update of category_id, status, deleted_at
  on public.listings
  for each row execute function public.snd_sync_category_counts();

update public.categories c
set listing_count = (
  select count(*)
  from public.listings l
  where l.category_id = c.id
    and l.status = 'published'
    and l.deleted_at is null
);
