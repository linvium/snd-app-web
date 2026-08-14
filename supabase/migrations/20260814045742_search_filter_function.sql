-- Steps 1–6 of doc 03 §7.1, in that order. Sorting and pagination are left to
-- the caller so the list and the map share one definition of "what matches".
--
-- SECURITY DEFINER because `locations` is owner-only under RLS. Only
-- approx_latitude/approx_longitude are ever read from it — the street, postal
-- code and exact coordinates never leave this function (doc 03 §7.3).
create or replace function public.snd_filter_listings(
  p_query text default null,
  p_category_slug text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default null,
  p_price_min_minor bigint default null,
  p_price_max_minor bigint default null,
  p_date_from date default null,
  p_date_to date default null,
  p_fuzzy boolean default false
)
returns table (listing_id uuid, distance_m double precision, rank real)
language sql
stable
security definer
parallel safe
set search_path = public, extensions
as $$
  with q as (
    select public.snd_build_tsquery(p_query) as ts
  ),
  category_ids as (
    select id from public.snd_category_subtree(p_category_slug)
    where p_category_slug is not null
  ),
  -- Step 3. Closest pickup point wins when a listing offers several.
  nearest as (
    select
      ll.listing_id,
      min(
        case when p_lat is null or p_lng is null then null
             else public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
        end
      ) as distance_m,
      count(*) filter (
        where p_lat is null or p_lng is null
           or p_radius_km is null or p_radius_km <= 0
           -- earth_box hits the GiST index; the haversine below is the exact cut.
           or (
             earth_box(ll_to_earth(p_lat, p_lng), p_radius_km * 1000.0)
               @> ll_to_earth(loc.approx_latitude, loc.approx_longitude)
             and public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
                   <= p_radius_km * 1000.0
           )
      ) as in_radius
    from public.listing_locations ll
    join public.locations loc on loc.id = ll.location_id and loc.deleted_at is null
    -- Narrowed to the published set before the aggregate, so drafts never enter
    -- the distance computation.
    join public.listings pl on pl.id = ll.listing_id
      and pl.status = 'published' and pl.deleted_at is null
    group by ll.listing_id
  )
  select
    l.id,
    n.distance_m,
    case
      when (select ts from q) is not null then ts_rank(l.search_vector, (select ts from q))
      when p_fuzzy and p_query is not null
        then similarity(public.snd_unaccent(l.title), public.snd_unaccent(p_query))
      else 0::real
    end
  from public.listings l
  join nearest n on n.listing_id = l.id
  -- Step 1.
  where l.status = 'published'
    and l.deleted_at is null
    -- Step 2.
    and (p_category_slug is null or l.category_id in (select id from category_ids))
    -- Step 3.
    and n.in_radius > 0
    -- Step 4.
    and (p_price_min_minor is null or l.price_1_day_minor >= p_price_min_minor)
    and (p_price_max_minor is null or l.price_1_day_minor <= p_price_max_minor)
    -- Step 5. One unavailable day inside the window disqualifies the listing.
    and (
      p_date_from is null or p_date_to is null
      or (
        not exists (
          select 1 from public.blocked_dates bd
          where bd.listing_id = l.id and bd.date between p_date_from and p_date_to
        )
        -- requested/declined/expired/cancelled/completed do not hold dates,
        -- so two people can have an open request on the same window.
        and not exists (
          select 1 from public.bookings b
          where b.listing_id = l.id
            and b.status in ('accepted', 'paid', 'in_progress')
            and b.start_date <= p_date_to
            and b.end_date >= p_date_from
        )
      )
    )
    -- Step 6.
    and (
      p_query is null or btrim(p_query) = ''
      or case
           when p_fuzzy
             then similarity(public.snd_unaccent(l.title), public.snd_unaccent(p_query)) >= 0.3
           else l.search_vector @@ (select ts from q)
         end
    );
$$;

revoke execute on function public.snd_filter_listings(
  text, text, double precision, double precision, integer, bigint, bigint, date, date, boolean
) from anon, authenticated, public;
