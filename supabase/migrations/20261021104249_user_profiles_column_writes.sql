-- A column-level REVOKE does nothing while the role still holds table-level
-- UPDATE (the earlier phone_auth migration's revoke was inert). Replace the
-- table grant with an allow-list: clients edit their own profile fields, and
-- nothing the platform maintains.
--
-- Not writable by clients: phone_verified_at (set only after an SMS code is
-- checked) and the rating/response metrics, which security definer functions
-- keep up to date.
revoke update on table public.user_profiles from anon, authenticated;

grant update (
  first_name,
  last_name,
  display_name,
  phone,
  avatar_url,
  about,
  primary_location_id,
  country_code
) on table public.user_profiles to authenticated;
