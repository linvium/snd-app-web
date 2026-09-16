-- public.users is written by the platform, never by the person it describes.
--
-- Supabase's default grants gave anon and authenticated every privilege on the
-- table, and "users: update own" let a signed-in user PATCH their own row
-- through the REST API - role, status, credit_balance_minor, and
-- email_verified_at, which is what requireUser() trusts for the verified-email
-- gate.
--
-- Nothing in the app writes this table as the user. The only writers are:
--   * handle_new_auth_user / handle_auth_user_updated - security definer
--     triggers on auth.users, owned by postgres, which copy the email and the
--     moment it was confirmed;
--   * the service role (the e2e seed, admin tooling).
-- Neither needs a grant to anon or authenticated, so every write privilege
-- goes, and with it the update policy that only existed to scope them. SELECT
-- stays, still limited to the caller's own row by "users: select own".

-- The grants are table-level only (no column ACLs exist on users), so this
-- revoke leaves no single column writable.
revoke insert, update, delete, truncate, references, trigger
  on table public.users
  from anon, authenticated;

drop policy if exists "users: update own" on public.users;
