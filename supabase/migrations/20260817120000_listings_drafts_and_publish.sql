-- Empty drafts cannot be inserted today: title/slug/description/prices/category
-- are NOT NULL and CHECKs require a finished listing. Publish-time validation
-- lives in the API; the table only needs to accept a blank row.

alter table public.listings
  alter column category_id drop not null,
  alter column title drop not null,
  alter column slug drop not null,
  alter column description drop not null,
  alter column price_1_day_minor drop not null,
  alter column item_value_minor drop not null,
  alter column cancellation_policy set default 'flexible';

alter table public.listings drop constraint if exists listings_description_check;
alter table public.listings drop constraint if exists listings_item_value_minor_check;
alter table public.listings drop constraint if exists listings_price_1_day_minor_check;

alter table public.listings
  add constraint listings_description_check
    check (description is null or char_length(description) <= 4000),
  add constraint listings_item_value_minor_check
    check (item_value_minor is null or item_value_minor > 0),
  add constraint listings_price_1_day_minor_check
    check (price_1_day_minor is null or price_1_day_minor > 0);

alter table public.listings drop constraint if exists listings_price_7_vs_3_check;
alter table public.listings
  add constraint listings_price_7_vs_3_check
    check (
      price_7_days_minor is null
      or price_3_days_minor is null
      or price_7_days_minor < (price_3_days_minor * 3)
    );

create or replace function public.snd_sync_listing_category_name()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.category_id is null then
    new.category_name_cached := '';
    return new;
  end if;

  select coalesce(c.name, '') into new.category_name_cached
  from public.categories c
  where c.id = new.category_id;

  new.category_name_cached := coalesce(new.category_name_cached, '');
  return new;
end;
$$;

create or replace function public.snd_sync_category_counts()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    if old.category_id is not null then
      perform public.snd_recount_category(old.category_id);
    end if;
    return old;
  end if;

  if new.category_id is not null then
    perform public.snd_recount_category(new.category_id);
  end if;

  if tg_op = 'UPDATE'
     and old.category_id is distinct from new.category_id
     and old.category_id is not null then
    perform public.snd_recount_category(old.category_id);
  end if;

  return new;
end;
$$;

drop policy if exists "listing_locations: delete own" on public.listing_locations;
create policy "listing_locations: delete own"
  on public.listing_locations
  for delete
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_locations.listing_id
        and l.owner_id = auth.uid()
    )
  );

drop policy if exists "listing_images: update own" on public.listing_images;
create policy "listing_images: update own"
  on public.listing_images
  for update
  using (
    exists (
      select 1
      from public.listings l
      where l.id = listing_images.listing_id
        and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.listings l
      where l.id = listing_images.listing_id
        and l.owner_id = auth.uid()
    )
  );

-- Catch-all leaf so category suggest always has somewhere to point.
-- UNIQUE (parent_id, slug) does not collide on NULL parent_id, so exist-check.
insert into public.categories (parent_id, name, slug, full_path, level, icon_name, sort_order)
select null, 'Ostalo', 'ostalo', 'Ostalo', 0, 'package', 9990
where not exists (
  select 1 from public.categories where parent_id is null and slug = 'ostalo'
);

update public.categories
set
  guarantee_cap_minor = coalesce(guarantee_cap_minor, 20000000),
  suggested_price_1_day_minor = coalesce(
    suggested_price_1_day_minor,
    case slug
      when 'dron' then 280000
      when 'foto-i-video' then 250000
      when 'projektori' then 180000
      when 'zvuk' then 150000
      when 'racunari' then 160000
      when 'busilice' then 80000
      when 'brusilice' then 90000
      when 'merni-alat' then 60000
      when 'skele-i-merdevine' then 120000
      when 'rucni-alat' then 50000
      when 'satori' then 70000
      when 'vrece-za-spavanje' then 40000
      when 'oprema-za-kuvanje' then 50000
      when 'ranci' then 30000
      when 'bicikli' then 120000
      when 'skije-i-snoubord' then 140000
      when 'vodeni-sportovi' then 150000
      when 'fitnes' then 80000
      when 'kosacice' then 150000
      when 'motokultivatori' then 180000
      when 'rostilji' then 70000
      when 'bazeni' then 200000
      when 'prikolice' then 250000
      when 'krovni-nosaci' then 100000
      when 'auto-prikljucci' then 80000
      when 'satre-stolovi-stolice' then 150000
      when 'rasveta' then 120000
      when 'dekoracija' then 60000
      when 'gitare' then 100000
      when 'klavijature' then 120000
      when 'bubnjevi' then 140000
      when 'studijska-oprema' then 160000
      when 'usisivaci' then 80000
      when 'masine-za-sivenje' then 90000
      when 'kuhinjski-aparati' then 70000
      when 'kolica' then 100000
      when 'auto-sedista' then 80000
      when 'igracke' then 40000
      when 'mesalice' then 200000
      when 'vibro-ploce' then 220000
      when 'agregati' then 250000
      when 'svecana-odeca' then 150000
      when 'kostimi' then 80000
      when 'skijaska-odeca' then 70000
      else 80000
    end
  )
where parent_id is not null or slug = 'ostalo';

update public.categories
set
  suggested_price_3_days_minor = coalesce(
    suggested_price_3_days_minor,
    round(suggested_price_1_day_minor * 2.6)
  ),
  suggested_price_7_days_minor = coalesce(
    suggested_price_7_days_minor,
    round(suggested_price_1_day_minor * 5.2)
  )
where suggested_price_1_day_minor is not null
  and (parent_id is not null or slug = 'ostalo');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "listing-images: public read" on storage.objects;
create policy "listing-images: public read"
  on storage.objects
  for select
  using (bucket_id = 'listing-images');

drop policy if exists "listing-images: owner insert" on storage.objects;
create policy "listing-images: owner insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.owner_id = auth.uid()
    )
  );

drop policy if exists "listing-images: owner update" on storage.objects;
create policy "listing-images: owner update"
  on storage.objects
  for update
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.owner_id = auth.uid()
    )
  );

drop policy if exists "listing-images: owner delete" on storage.objects;
create policy "listing-images: owner delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.owner_id = auth.uid()
    )
  );

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
      and created_at < now() - interval '30 days'
  loop
    delete from storage.objects
    where bucket_id = 'listing-images'
      and name like draft.id::text || '/%';

    delete from public.listings where id = draft.id;
  end loop;
end;
$$;

grant execute on function public.snd_purge_expired_drafts() to authenticated;
