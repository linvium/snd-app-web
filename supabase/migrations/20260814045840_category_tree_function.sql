-- A category is shown only when it, or something under it, has published
-- listings (doc 00 §3.5, doc 03 §11, doc 02 §6.2). Counts roll up from the
-- descendants; empty branches never reach the client.
--
-- With coordinates and a radius, counts are computed inside that circle — a
-- category with 200 listings in Belgrade and none in Niš must not appear to
-- someone in Niš (doc 02 §6.3).
create or replace function public.snd_category_tree(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default null
)
returns table (
  id uuid,
  parent_id uuid,
  name text,
  slug text,
  full_path text,
  level smallint,
  icon_name text,
  sort_order integer,
  listing_count bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with recursive direct as (
    select l.category_id, count(*) as direct_count
    from public.listings l
    where l.status = 'published'
      and l.deleted_at is null
      and (
        p_lat is null or p_lng is null or p_radius_km is null or p_radius_km <= 0
        or exists (
          select 1
          from public.listing_locations ll
          join public.locations loc on loc.id = ll.location_id and loc.deleted_at is null
          where ll.listing_id = l.id
            and earth_box(ll_to_earth(p_lat, p_lng), p_radius_km * 1000.0)
                  @> ll_to_earth(loc.approx_latitude, loc.approx_longitude)
            and public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
                  <= p_radius_km * 1000.0
        )
      )
    group by l.category_id
  ),
  -- Every (ancestor, descendant) pair, each category included as its own
  -- descendant, so a parent can sum what sits beneath it.
  closure as (
    select c.id as ancestor_id, c.id as descendant_id from public.categories c
    union all
    select cl.ancestor_id, child.id
    from closure cl
    join public.categories child on child.parent_id = cl.descendant_id
  ),
  rolled as (
    select cl.ancestor_id as id, coalesce(sum(d.direct_count), 0) as listing_count
    from closure cl
    left join direct d on d.category_id = cl.descendant_id
    group by cl.ancestor_id
  )
  select
    c.id, c.parent_id, c.name::text, c.slug::text, c.full_path, c.level,
    c.icon_name::text, c.sort_order, r.listing_count
  from public.categories c
  join rolled r on r.id = c.id
  where c.is_enabled = true
    and r.listing_count > 0
  order by c.level, c.sort_order, r.listing_count desc, c.name;
$$;

grant execute on function public.snd_category_tree(
  double precision, double precision, integer
) to anon, authenticated;
