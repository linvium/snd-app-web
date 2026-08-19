-- Public read surfaces for the item page (doc 04).
--
-- The problem these solve: the item page is public, but `users`,
-- `user_profiles`, `kyc_verifications` and `locations` are all owner-only under
-- RLS, so an anonymous visitor reads zero rows from every one of them. Search
-- hit the same wall and answered it with SECURITY DEFINER functions.
--
-- Views are the better answer here. RLS is row-level and cannot restrict
-- columns, but a view *is* a column list: `street` and the exact
-- latitude/longitude are not absent because some query remembered to omit them,
-- they are absent because they were never selected. That makes doc 04 §9's
-- "kritično bezbednosno pravilo" a property of the schema rather than of the
-- code that reads it, and it leaves every caller as an ordinary
-- `supabase.from(...).select(...)`.
--
-- `security_invoker = off` is deliberate and is the whole point: the view runs
-- with its owner's rights, which is what gets past the RLS above. It is safe
-- precisely because the column list is fixed here.

-- Everything the interface may say about another person: name, picture,
-- reputation, responsiveness, and how long they have been around. No email, no
-- phone, no address.
create or replace view public.public_owner_profiles
with (security_invoker = off) as
select
  u.id as user_id,
  coalesce(
    p.display_name,
    -- Doc 00 §3.3: with no display name, first name plus the initial of the
    -- surname — "Marko P.", never the full legal name.
    nullif(btrim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1)), ''),
    'Korisnik'
  ) as display_name,
  p.avatar_url,
  p.rating_avg,
  coalesce(p.rating_count, 0) as rating_count,
  p.avg_response_minutes,
  p.response_rate,
  u.created_at as member_since,
  -- An expired verification is not a verification (doc 04 §5).
  exists (
    select 1 from public.kyc_verifications k
    where k.user_id = u.id
      and k.status = 'verified'
      and (k.expires_at is null or k.expires_at > now())
  ) as is_verified,
  -- Response metrics are hidden below five conversations (doc 04 §5), and the
  -- interface needs this number to know that.
  (
    select count(*) from public.conversations c
    where c.owner_id = u.id
      and c.created_at >= now() - interval '90 days'
  ) as conversation_count
from public.users u
left join public.user_profiles p on p.user_id = u.id
where u.deleted_at is null
  and u.status = 'active';

grant select on public.public_owner_profiles to anon, authenticated;

-- Pickup points as the public may see them: the blurred circle and the
-- municipality it sits in. The exact address is reachable only through
-- `locations` itself, which stays behind RLS (see the paid-renter policy).
create or replace view public.public_listing_locations
with (security_invoker = off) as
select
  ll.listing_id,
  loc.id as location_id,
  loc.label,
  coalesce(loc.municipality, loc.city) as municipality,
  loc.city,
  loc.approx_latitude,
  loc.approx_longitude
from public.listing_locations ll
join public.locations loc on loc.id = ll.location_id
where loc.deleted_at is null;

grant select on public.public_listing_locations to anon, authenticated;

-- Slugs that were published once and are not any more. A deleted listing must
-- answer 410 Gone rather than 404 so search engines drop it instead of
-- re-crawling it for months (doc 04 §15), and RLS hides the row that would say
-- so. Exposing the slug alone is exactly the fact a 410 states out loud.
create or replace view public.public_deleted_listing_slugs
with (security_invoker = off) as
select l.slug
from public.listings l
where l.slug is not null
  and l.published_at is not null
  and (l.status = 'deleted' or l.deleted_at is not null);

grant select on public.public_deleted_listing_slugs to anon, authenticated;
