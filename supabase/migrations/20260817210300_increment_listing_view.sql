-- Bumps `view_count` on somebody else's listing (doc 04 §14).
--
-- The one write on this page a visitor must be allowed to make on a row they do
-- not own. An RLS update policy broad enough to permit it would also permit
-- rewriting the title, so the permission is granted to this function and to
-- nothing else: it touches one integer column and cannot express any other
-- change.
--
-- The throttle is not here — it lives in a short-lived cookie on the route, so
-- the database keeps no record of who looked at what.

create or replace function public.snd_increment_listing_view(p_listing_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.listings
  set view_count = coalesce(view_count, 0) + 1
  where id = p_listing_id
    and status = 'published'
    and deleted_at is null;
$$;

grant execute on function public.snd_increment_listing_view(uuid) to anon, authenticated;
