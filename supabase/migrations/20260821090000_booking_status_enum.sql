-- The reservation lifecycle becomes a database type.
--
-- The interface shows six steps - zahtev, prihvaćeno, rezervisano, preuzeto,
-- vraćeno, ocenjeno - plus the ways a reservation can end early. Until now the
-- column was a varchar behind a CHECK, so a typo in an RPC was a runtime string
-- the constraint happened to reject; as an enum the set *is* the type and every
-- function that touches it has to spell a real value.
--
-- The old vocabulary is renamed, not extended, because it described payment
-- states rather than what the two people are doing:
--   paid        -> booked
--   in_progress -> picked_up
--   completed   -> returned
--
-- `rated` is new: the reservation is over and somebody has left a review.

create type public.booking_status as enum (
  'requested',
  'accepted',
  'booked',
  'picked_up',
  'returned',
  'rated',
  'declined',
  'expired',
  'cancelled_by_renter',
  'cancelled_by_owner',
  'payment_failed'
);

comment on type public.booking_status is
  'Booking lifecycle. requested -> accepted -> booked -> picked_up -> returned -> rated, plus the early endings.';

-- A policy, a partial index and a column-scoped trigger read the column, and
-- Postgres refuses to retype a column anything depends on. All three come back
-- below, with the new values.
drop policy if exists "locations: select for paid renter" on public.locations;
drop index if exists public.idx_bookings_blocking;
drop trigger if exists bookings_sync_blocked_dates on public.bookings;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings alter column status drop default;

alter table public.bookings
  alter column status type public.booking_status
  using (
    case status
      when 'paid' then 'booked'
      when 'in_progress' then 'picked_up'
      when 'completed' then 'returned'
      else status
    end
  )::public.booking_status;

alter table public.bookings
  alter column status set default 'requested'::public.booking_status;

create index idx_bookings_blocking
  on public.bookings (listing_id, start_date, end_date)
  where status in ('accepted', 'booked', 'picked_up');

create policy "locations: select for paid renter" on public.locations
  for select
  using (
    exists (
      select 1
      from public.bookings b
      where b.pickup_location_id = locations.id
        and b.renter_id = auth.uid()
        and b.status in ('booked', 'picked_up')
    )
  );

-- One timestamp per step, so "when did this happen" never has to be inferred
-- from the status alone. `paid_at` stays as the moment money was confirmed;
-- `booked_at` is the moment the reservation became a reservation.
alter table public.bookings
  add column if not exists booked_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists returned_at timestamptz,
  add column if not exists rated_at timestamptz;

update public.bookings set booked_at = paid_at where paid_at is not null and booked_at is null;
update public.bookings set returned_at = completed_at where completed_at is not null and returned_at is null;

-- Everything below reads booking statuses as literals. With an enum column an
-- unknown label is an error rather than a row that never matches, so the three
-- readers are rewritten with the renamed values.

create or replace function public.snd_sync_booking_blocked_dates()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_blocks boolean;
begin
  v_blocks := new.status in ('accepted', 'booked', 'picked_up');

  if tg_op = 'UPDATE'
     and old.status is not distinct from new.status
     and old.start_date is not distinct from new.start_date
     and old.end_date is not distinct from new.end_date then
    return null;
  end if;

  delete from public.blocked_dates where booking_id = new.id;

  if v_blocks and new.start_date is not null and new.end_date is not null then
    insert into public.blocked_dates (listing_id, date, reason, booking_id)
    select new.listing_id, d::date, 'booking', new.id
    from generate_series(new.start_date, new.end_date, interval '1 day') d
    on conflict (listing_id, date) do nothing;
  end if;

  return null;
end;
$function$;

create trigger bookings_sync_blocked_dates
  after insert or update of status, start_date, end_date on public.bookings
  for each row execute function public.snd_sync_booking_blocked_dates();

create or replace function public.snd_filter_listings(
  p_query text default null::text,
  p_category_slug text default null::text,
  p_lat double precision default null::double precision,
  p_lng double precision default null::double precision,
  p_radius_km integer default null::integer,
  p_price_min_minor bigint default null::bigint,
  p_price_max_minor bigint default null::bigint,
  p_date_from date default null::date,
  p_date_to date default null::date,
  p_fuzzy boolean default false
)
returns table(listing_id uuid, distance_m double precision, rank real)
language sql
stable parallel safe security definer
set search_path to 'public', 'extensions'
as $function$
  with q as (
    select public.snd_build_tsquery(p_query) as ts
  ),
  category_ids as (
    select id from public.snd_category_subtree(p_category_slug)
    where p_category_slug is not null
  ),
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
           or (
             earth_box(ll_to_earth(p_lat, p_lng), p_radius_km * 1000.0)
               @> ll_to_earth(loc.approx_latitude, loc.approx_longitude)
             and public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
                   <= p_radius_km * 1000.0
           )
      ) as in_radius
    from public.listing_locations ll
    join public.locations loc on loc.id = ll.location_id and loc.deleted_at is null
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
        then word_similarity(public.snd_unaccent(p_query), public.snd_unaccent(l.title))
      else 0::real
    end
  from public.listings l
  join nearest n on n.listing_id = l.id
  where l.status = 'published'
    and l.deleted_at is null
    and (p_category_slug is null or l.category_id in (select id from category_ids))
    and n.in_radius > 0
    and (p_price_min_minor is null or l.price_1_day_minor >= p_price_min_minor)
    and (p_price_max_minor is null or l.price_1_day_minor <= p_price_max_minor)
    and (
      p_date_from is null or p_date_to is null
      or (
        not exists (
          select 1 from public.blocked_dates bd
          where bd.listing_id = l.id and bd.date between p_date_from and p_date_to
        )
        and not exists (
          select 1 from public.bookings b
          where b.listing_id = l.id
            and b.status in ('accepted', 'booked', 'picked_up')
            and b.start_date <= p_date_to
            and b.end_date >= p_date_from
        )
      )
    )
    and (
      p_query is null or btrim(p_query) = ''
      or case
           when p_fuzzy
             then word_similarity(public.snd_unaccent(p_query), public.snd_unaccent(l.title)) >= 0.3
           else l.search_vector @@ (select ts from q)
         end
    );
$function$;

-- Only the exact-location gate changes here: a renter sees the street once the
-- booking is paid for (`booked`) or already in their hands (`picked_up`).
create or replace function public.snd_listing_detail(
  p_slug text,
  p_lat double precision default null::double precision,
  p_lng double precision default null::double precision
)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_viewer uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_can_see_exact boolean := false;
  v_result jsonb;
begin
  select * into v_listing
  from public.listings
  where slug = p_slug
  limit 1;

  if not found then
    return null;
  end if;

  if v_listing.deleted_at is not null or v_listing.status in ('deleted', 'draft', 'rejected') then
    if v_listing.owner_id is distinct from v_viewer then
      return null;
    end if;
    if v_listing.deleted_at is not null or v_listing.status = 'deleted' then
      return null;
    end if;
  end if;

  v_can_see_exact :=
    v_viewer is not null
    and (
      v_listing.owner_id = v_viewer
      or exists (
        select 1 from public.bookings b
        where b.listing_id = v_listing.id
          and b.renter_id = v_viewer
          and b.status in ('booked', 'picked_up')
      )
    );

  with recursive breadcrumb_up as (
    select c.id, c.parent_id, c.name, c.slug, c.level, c.guarantee_cap_minor
    from public.categories c
    where c.id = v_listing.category_id
    union all
    select c.id, c.parent_id, c.name, c.slug, c.level, c.guarantee_cap_minor
    from public.categories c
    join breadcrumb_up b on c.id = b.parent_id
  ),
  breadcrumb as (
    select jsonb_agg(jsonb_build_object('name', name, 'slug', slug) order by level) as items
    from breadcrumb_up
  ),
  guarantee as (
    select guarantee_cap_minor as cap
    from breadcrumb_up
    where guarantee_cap_minor is not null
    order by level desc
    limit 1
  ),
  images as (
    select jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'thumbnail_url', i.thumbnail_url,
        'medium_url', i.medium_url,
        'large_url', i.large_url,
        'width', i.width,
        'height', i.height,
        'sort_order', i.sort_order
      ) order by i.sort_order, i.created_at
    ) as items
    from public.listing_images i
    where i.listing_id = v_listing.id
  ),
  pickup as (
    select
      jsonb_agg(
        jsonb_build_object(
          'id', loc.id,
          'label', loc.label,
          'municipality', coalesce(loc.municipality, loc.city),
          'city', loc.city,
          'approx_latitude', loc.approx_latitude,
          'approx_longitude', loc.approx_longitude
        )
        || case when v_can_see_exact then jsonb_build_object(
             'street', loc.street,
             'postal_code', loc.postal_code,
             'latitude', loc.latitude,
             'longitude', loc.longitude
           ) else '{}'::jsonb end
        order by
          case when p_lat is null or p_lng is null then 0
               else public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
          end
      ) as items,
      min(
        case when p_lat is null or p_lng is null then null
             else public.snd_haversine_m(p_lat, p_lng, loc.approx_latitude, loc.approx_longitude)
        end
      ) as distance_m
    from public.listing_locations ll
    join public.locations loc on loc.id = ll.location_id and loc.deleted_at is null
    where ll.listing_id = v_listing.id
  ),
  owner_row as (
    select
      u.id,
      u.created_at as member_since,
      coalesce(
        p.display_name,
        nullif(btrim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1)), ''),
        'Korisnik'
      ) as display_name,
      p.avatar_url,
      p.rating_avg,
      coalesce(p.rating_count, 0) as rating_count,
      p.avg_response_minutes,
      p.response_rate,
      exists (
        select 1 from public.kyc_verifications k
        where k.user_id = u.id
          and k.status = 'verified'
          and (k.expires_at is null or k.expires_at > now())
      ) as is_verified,
      (
        select count(*) from public.conversations c
        where c.owner_id = u.id and c.created_at >= now() - interval '90 days'
      ) as conversation_count
    from public.users u
    left join public.user_profiles p on p.user_id = u.id
    where u.id = v_listing.owner_id
  )
  select jsonb_build_object(
    'id', v_listing.id,
    'slug', v_listing.slug,
    'title', v_listing.title,
    'description', v_listing.description,
    'status', v_listing.status,
    'category', case when v_listing.category_id is null then null else jsonb_build_object(
      'id', v_listing.category_id,
      'name', (select name from breadcrumb_up order by level desc limit 1),
      'full_path', (select full_path from public.categories where id = v_listing.category_id),
      'breadcrumb', coalesce((select items from breadcrumb), '[]'::jsonb)
    ) end,
    'images', coalesce((select items from images), '[]'::jsonb),
    'price_1_day_minor', v_listing.price_1_day_minor,
    'price_3_days_minor', v_listing.price_3_days_minor,
    'price_7_days_minor', v_listing.price_7_days_minor,
    'item_value_minor', v_listing.item_value_minor,
    'cancellation_policy', v_listing.cancellation_policy,
    'guarantee_cap_minor', least(
      coalesce((select cap from guarantee), v_listing.item_value_minor),
      coalesce(v_listing.item_value_minor, (select cap from guarantee))
    ),
    'rating_avg', v_listing.rating_avg,
    'rating_count', coalesce(v_listing.rating_count, 0),
    'view_count', coalesce(v_listing.view_count, 0),
    'favorite_count', coalesce(v_listing.favorite_count, 0),
    'is_favorite', v_viewer is not null and exists (
      select 1 from public.favorites f
      where f.listing_id = v_listing.id and f.user_id = v_viewer
    ),
    'is_own_listing', v_listing.owner_id = v_viewer,
    'can_see_exact_location', v_can_see_exact,
    'distance_m', (select distance_m from pickup),
    'pickup_locations', coalesce((select items from pickup), '[]'::jsonb),
    'owner', (
      select jsonb_build_object(
        'id', o.id,
        'display_name', o.display_name,
        'avatar_url', o.avatar_url,
        'is_verified', o.is_verified,
        'member_since', o.member_since,
        'rating_avg', o.rating_avg,
        'rating_count', o.rating_count,
        'avg_response_minutes', o.avg_response_minutes,
        'response_rate', o.response_rate,
        'conversation_count', o.conversation_count
      ) from owner_row o
    ),
    'published_at', v_listing.published_at,
    'created_at', v_listing.created_at
  ) into v_result;

  return v_result;
end;
$function$;
