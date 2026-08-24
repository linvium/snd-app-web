-- `revoke ... from public` was not enough.
--
-- Supabase's default privileges grant EXECUTE on every new function in `public`
-- to `anon`, `authenticated` and `service_role` explicitly, and an explicit
-- grant survives a revoke aimed at PUBLIC. The lifecycle functions were
-- therefore reachable from the browser with the publishable key: anyone holding
-- a payment token could have called `snd_confirm_booking_payment` and marked a
-- booking paid without paying, and `snd_queue_email` would have mailed any
-- active template to any address.
--
-- The internal ones are named here, role by role.

-- Money. The only legitimate caller is the payment-confirm edge function,
-- which holds the service role key.
revoke execute on function public.snd_confirm_booking_payment(text, text) from public, anon, authenticated;
grant execute on function public.snd_confirm_booking_payment(text, text) to service_role;

-- Mail. Called from inside `security definer` functions, which run as the
-- owner and do not need a grant of their own.
revoke execute on function public.snd_queue_email(text, uuid, jsonb, uuid, text) from public, anon, authenticated;
revoke execute on function public.snd_booking_email_vars(uuid) from public, anon, authenticated;

-- Trigger bodies are not an API.
revoke execute on function public.snd_price_booking() from public, anon, authenticated;
revoke execute on function public.snd_sync_booking_blocked_dates() from public, anon, authenticated;
revoke execute on function public.snd_clear_booking_blocked_dates() from public, anon, authenticated;

-- These need a signed-in user; `anon` can only ever get UNAUTHENTICATED out of
-- them, so the grant is noise that reads as an opening.
revoke execute on function public.snd_create_rental_request(uuid, text, date, date) from anon;
revoke execute on function public.snd_respond_to_rental_request(uuid, text, date, date) from anon;
revoke execute on function public.snd_mark_booking_picked_up(uuid) from anon;
revoke execute on function public.snd_mark_booking_returned(uuid) from anon;
revoke execute on function public.snd_submit_booking_review(uuid, smallint, text) from anon;

-- `snd_payment_link_summary` keeps its `anon` grant on purpose: the pay link is
-- opened from an email, often in a browser with no session, and the token is
-- the credential.

-- A mutable search_path on a function that reads tables is a way in; these
-- three were missing it.
alter function public.snd_format_minor(bigint) set search_path to 'public';
alter function public.snd_rental_price_minor(integer, bigint, bigint, bigint) set search_path to 'public';
alter function public.snd_quote_booking(uuid, integer) set search_path to 'public';
