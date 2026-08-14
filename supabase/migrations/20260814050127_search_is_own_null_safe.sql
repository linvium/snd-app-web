-- auth.uid() is null for anonymous callers, and `owner_id = null` is null, not
-- false. The card reads is_own as a boolean, so pin it to false for guests.
create or replace function public.snd_search_listings(
  p_query text default null,
  p_category_slug text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default null,
  p_price_min_minor bigint default null,
  p_price_max_minor bigint default null,
  p_date_from date default null,
  p_date_to date default null,
  p_sort text default 'distance',
  p_page integer default 1,
  p_limit integer default 20,
  p_fuzzy boolean default false
)
returns table (
  id uuid, slug text, title text, thumbnail_url text, price_1_day_minor bigint,
  rating_avg numeric, rating_count integer, distance_m double precision,
  municipality text, approx_latitude double precision, approx_longitude double precision,
  is_favorite boolean, is_own boolean, owner_id uuid, owner_display_name text,
  owner_is_verified boolean, total_count bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with matched as (
    select * from public.snd_filter_listings(
      p_query, p_category_slug, p_lat, p_lng, p_radius_km,
      p_price_min_minor, p_price_max_minor, p_date_from, p_date_to, p_fuzzy
    )
  ),
  counted as (
    select m.*, count(*) over () as total_count from matched m
  ),
  -- Pin and "Zvezdara · 2,3 km" both describe the pickup point nearest the
  -- searcher, the same one the distance was measured to.
  best_location as (
    select distinct on (ll.listing_id)
      ll.listing_id, loc.approx_latitude, loc.approx_longitude,
      coalesce(loc.municipality, loc.city) as municipality
    from public.listing_locations ll
    join public.locations loc on loc.id = ll.location_id and loc.deleted_at is null
    order by ll.listing_id,
      case when p_lat is null or p_lng is null then 0
           else public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
      end
  )
  select
    l.id, l.slug::text, l.title::text,
    (select li.thumbnail_url from public.listing_images li
      where li.listing_id = l.id order by li.sort_order limit 1),
    l.price_1_day_minor, l.rating_avg, l.rating_count, c.distance_m,
    bl.municipality::text,
    bl.approx_latitude::double precision, bl.approx_longitude::double precision,
    exists (select 1 from public.favorites f where f.listing_id = l.id and f.user_id = auth.uid()),
    coalesce(l.owner_id = auth.uid(), false),
    l.owner_id,
    coalesce(p.display_name, p.first_name, 'Korisnik')::text,
    exists (select 1 from public.kyc_verifications k
            where k.user_id = l.owner_id and k.status = 'verified'),
    c.total_count
  from counted c
  join public.listings l on l.id = c.listing_id
  left join public.user_profiles p on p.user_id = l.owner_id
  left join best_location bl on bl.listing_id = l.id
  order by
    -- With a search term, relevance leads and distance breaks ties (§6.3).
    case when p_sort = 'distance' and coalesce(btrim(p_query), '') <> '' then c.rank end desc nulls last,
    case when p_sort = 'distance' then c.distance_m end asc nulls last,
    case when p_sort = 'price_asc' then l.price_1_day_minor end asc,
    case when p_sort = 'price_desc' then l.price_1_day_minor end desc,
    case when p_sort = 'newest' then l.published_at end desc nulls last,
    case when p_sort = 'rating' then l.rating_avg end desc nulls last,
    case when p_sort = 'rating' then l.rating_count end desc,
    l.published_at desc nulls last,
    l.id
  limit greatest(p_limit, 1)
  offset greatest(p_page - 1, 0) * greatest(p_limit, 1);
$$;

grant execute on function public.snd_search_listings(
  text, text, double precision, double precision, integer, bigint, bigint,
  date, date, text, integer, integer, boolean
) to anon, authenticated;
