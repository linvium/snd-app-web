-- Haversine spelled out rather than delegated to earth_distance(), so the
-- number shown to the user is the one doc 03 §7.3 describes.
create or replace function public.snd_haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select 2 * 6371000 * asin(
    sqrt(
      sin(radians(lat2 - lat1) / 2) ^ 2 +
      cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
    )
  )
$$;

-- Builds a tsquery from free user input. Everything outside [a-z0-9] is
-- dropped, so no tsquery operator survives the trip and the input needs no
-- further escaping. Diacritics come off exactly as they do at index time.
create or replace function public.snd_build_tsquery(raw text)
returns tsquery
language plpgsql
immutable
parallel safe
set search_path = public, extensions
as $$
declare
  words text[];
  cleaned text[] := '{}';
  word text;
  total integer;
begin
  if raw is null or btrim(raw) = '' then
    return null;
  end if;

  words := regexp_split_to_array(lower(public.snd_unaccent(btrim(raw))), '[^[:alnum:]]+');

  foreach word in array words loop
    word := regexp_replace(word, '[^a-z0-9]', '', 'g');
    if word <> '' then
      cleaned := cleaned || word;
    end if;
  end loop;

  total := coalesce(array_length(cleaned, 1), 0);
  if total = 0 then
    return null;
  end if;

  -- Prefix match on the trailing word only (doc 03 §7.2). It is the word the
  -- user may still be typing, and it stands in for the stemming Postgres has
  -- no Serbian dictionary for: "busil:*" reaches bušilica, bušilice, bušilicu.
  cleaned[total] := cleaned[total] || ':*';

  return to_tsquery('simple', array_to_string(cleaned, ' & '));
end;
$$;

-- Selecting a parent selects everything under it (doc 03 §7.6).
create or replace function public.snd_category_subtree(p_slug text)
returns table (id uuid)
language sql
stable
parallel safe
set search_path = public
as $$
  with recursive root as (
    select c.id from public.categories c
    where c.slug = p_slug
    order by c.level, c.name
    limit 1
  ),
  subtree as (
    select r.id from root r
    union all
    select c.id from public.categories c join subtree s on c.parent_id = s.id
  )
  select subtree.id from subtree;
$$;
