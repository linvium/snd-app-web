-- Search support on top of the existing catalog schema (doc 03 §7.2, §7.3, §12).

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists cube with schema extensions;
create extension if not exists earthdistance with schema extensions;

-- unaccent() is marked STABLE inside the extension, which bars it from index
-- expressions. Pinning the dictionary makes it immutable and indexable.
create or replace function public.snd_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;

-- Weight C is the category name, which lives in another table. A generated
-- column cannot reach across a join, so the name is denormalised here and kept
-- in step by trigger.
alter table public.listings
  add column if not exists category_name_cached varchar(120) not null default '';

create or replace function public.snd_sync_listing_category_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(c.name, '') into new.category_name_cached
  from public.categories c
  where c.id = new.category_id;

  new.category_name_cached := coalesce(new.category_name_cached, '');
  return new;
end;
$$;

drop trigger if exists trg_listings_category_name on public.listings;
create trigger trg_listings_category_name
  before insert or update of category_id on public.listings
  for each row execute function public.snd_sync_listing_category_name();

update public.listings l
set category_name_cached = coalesce(c.name, '')
from public.categories c
where c.id = l.category_id
  and l.category_name_cached is distinct from coalesce(c.name, '');

-- title A, description B, category C — accent-stripped at index time so
-- "busilica" and "bušilica" land on the same lexemes (doc 03 §7.2).
alter table public.listings
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', public.snd_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.snd_unaccent(coalesce(description, ''))), 'B') ||
    setweight(to_tsvector('simple', public.snd_unaccent(coalesce(category_name_cached, ''))), 'C')
  ) stored;

create index if not exists idx_listings_search_vector
  on public.listings using gin (search_vector);

-- Superseded by the weighted, accent-stripped vector above.
drop index if exists public.idx_listings_search;

-- Backs the "da li si mislio…" fallback (doc 03 §7.2, similarity >= 0.3).
create index if not exists idx_listings_title_trgm
  on public.listings using gin (public.snd_unaccent(title) extensions.gin_trgm_ops);

-- Radius filtering runs against the blurred coordinates only, never the exact
-- ones (doc 03 §7.3). GiST so earth_box() can drive it.
create index if not exists idx_locations_approx_gist
  on public.locations using gist (extensions.ll_to_earth(approx_latitude, approx_longitude));

-- Result cards show a municipality ("Zvezdara") — coarser than street, finer
-- than city. Falls back to city where unknown.
alter table public.locations
  add column if not exists municipality varchar(100);

create index if not exists idx_listing_locations_location_id
  on public.listing_locations (location_id);

-- Only accepted/paid/in_progress hold dates (doc 00 §6.4); the partial index
-- keeps the availability check off the rest.
create index if not exists idx_bookings_blocking
  on public.bookings (listing_id, start_date, end_date)
  where status in ('accepted', 'paid', 'in_progress');

-- (parent_id, slug) is unique, but two NULL parents never collide, so root
-- slugs need their own guard — /category/<slug> resolves on slug alone.
create unique index if not exists categories_root_slug_unique
  on public.categories (slug)
  where parent_id is null;
