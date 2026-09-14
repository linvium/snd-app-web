-- The platform does not offer insurance or a damage guarantee of any kind.
--
-- Everything that promised cover goes: the per-category cap, the claims table
-- that was waiting for the first claim, the help page describing the process,
-- and the figure the item page payload computed from the cap. Owners and
-- renters settle damage between themselves; nothing in the schema should
-- suggest otherwise.

-- The item payload was the only reader of the cap. It is rebuilt without the
-- guarantee block, and without `width`/`height`, which listing_images lost in
-- 20260818110000 and which left this function failing on every call.
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
    select c.id, c.parent_id, c.name, c.slug, c.level
    from public.categories c
    where c.id = v_listing.category_id
    union all
    select c.id, c.parent_id, c.name, c.slug, c.level
    from public.categories c
    join breadcrumb_up b on c.id = b.parent_id
  ),
  breadcrumb as (
    select jsonb_agg(jsonb_build_object('name', name, 'slug', slug) order by level) as items
    from breadcrumb_up
  ),
  images as (
    select jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'thumbnail_url', i.thumbnail_url,
        'medium_url', i.medium_url,
        'large_url', i.large_url,
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

drop table if exists public.guarantee_claims;

alter table public.categories drop column if exists guarantee_cap_minor;

-- The help page goes with the promise it described. Links to it from other
-- pages are rewritten in the pages copy migration that follows.
delete from public.pages where slug = 'guarantee';
