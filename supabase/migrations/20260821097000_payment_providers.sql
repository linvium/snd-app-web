-- Which provider took the money, and how far along it got.
--
-- The link already carried an amount and a token; what it could not say was who
-- is collecting, or that a checkout is in flight. Both matter once a real
-- provider is involved: the renter can abandon a Stripe Checkout and come back,
-- and the same link has to be able to start a second session without minting a
-- second link.
--
-- `provider` is a plain string rather than an enum on purpose. Adding a PSP
-- should be an adapter and a config value, not a migration.

alter table public.booking_payment_links
  add column if not exists provider varchar(32) not null default 'stripe',
  add column if not exists provider_session_id varchar(255),
  add column if not exists provider_checkout_url text,
  add column if not exists last_error text;

comment on column public.booking_payment_links.provider is
  'Which adapter settles this link: stripe, or manual for the sandbox path.';
comment on column public.booking_payment_links.provider_session_id is
  'The provider-side checkout in flight. Cleared when it expires or fails, so a retry starts a fresh one.';

create index if not exists idx_booking_payment_links_session
  on public.booking_payment_links (provider_session_id)
  where provider_session_id is not null;

-- `payments` was shaped around Stripe alone. The generic pair is what the code
-- reads; `stripe_payment_intent_id` is still written when the provider is
-- Stripe, because it predates this and a column that is always null is a trap
-- for whoever queries it next.
alter table public.payments
  add column if not exists provider varchar(32),
  add column if not exists provider_payment_id varchar(255);

create index if not exists idx_payments_provider_payment
  on public.payments (provider_payment_id)
  where provider_payment_id is not null;

/**
 * Record that a checkout has been opened for this link.
 *
 * Called by the payment-checkout edge function once the provider hands back a
 * session. Storing the session id lets a webhook be matched to a link even if
 * the client never comes back, and lets a second attempt reuse or replace it.
 */
create or replace function public.snd_start_payment_checkout(
  p_token text,
  p_provider text,
  p_session_id text,
  p_checkout_url text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link record;
begin
  select * into v_link
    from public.booking_payment_links
   where token = btrim(coalesce(p_token, ''))
   for update;

  if v_link.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_link.status <> 'pending' then
    raise exception 'CONFLICT';
  end if;

  if v_link.expires_at <= now() then
    update public.booking_payment_links set status = 'expired' where id = v_link.id;
    raise exception 'EXPIRED';
  end if;

  update public.booking_payment_links
     set provider = coalesce(nullif(btrim(p_provider), ''), provider),
         provider_session_id = p_session_id,
         provider_checkout_url = p_checkout_url,
         last_error = null
   where id = v_link.id;

  return jsonb_build_object('booking_id', v_link.booking_id, 'token', v_link.token);
end;
$function$;

revoke all on function public.snd_start_payment_checkout(text, text, text, text) from public, anon, authenticated;
grant execute on function public.snd_start_payment_checkout(text, text, text, text) to service_role;

/**
 * A payment attempt that did not go through.
 *
 * The link stays `pending` and the booking stays `accepted`: a declined card is
 * a reason to try again, not the end of the reservation. The failed attempt is
 * kept as a `payments` row so the history is not just a silent gap, and the
 * session id is cleared so the next attempt opens a fresh checkout.
 */
create or replace function public.snd_record_payment_failure(
  p_token text,
  p_reason text default null,
  p_provider_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link record;
  v_booking record;
begin
  select * into v_link
    from public.booking_payment_links
   where token = btrim(coalesce(p_token, ''))
   for update;

  if v_link.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select id, renter_id into v_booking from public.bookings where id = v_link.booking_id;

  if v_booking.id is not null then
    insert into public.payments (
      booking_id, user_id, purpose, amount_minor, currency, status,
      provider, provider_payment_id, failure_code
    ) values (
      v_booking.id, v_booking.renter_id, 'booking', v_link.amount_minor, v_link.currency, 'failed',
      v_link.provider, p_provider_reference, left(coalesce(p_reason, 'unknown'), 255)
    );
  end if;

  update public.booking_payment_links
     set provider_session_id = null,
         provider_checkout_url = null,
         last_error = left(coalesce(p_reason, 'unknown'), 500)
   where id = v_link.id
     and status = 'pending';

  return jsonb_build_object('booking_id', v_link.booking_id, 'retryable', v_link.status = 'pending');
end;
$function$;

revoke all on function public.snd_record_payment_failure(text, text, text) from public, anon, authenticated;
grant execute on function public.snd_record_payment_failure(text, text, text) to service_role;

/**
 * Settling a link, now recording who settled it.
 *
 * Unchanged in every other respect - still idempotent, still the only way a
 * booking reaches `booked`, still service role only.
 */
create or replace function public.snd_confirm_booking_payment(
  p_token text,
  p_provider_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link record;
  v_booking record;
  v_conversation record;
  v_payment_id uuid;
  v_vars jsonb;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'VALIDATION_FAILED';
  end if;

  select * into v_link
    from public.booking_payment_links
   where token = btrim(p_token)
   for update;

  if v_link.id is null then
    raise exception 'NOT_FOUND';
  end if;

  -- Paying twice is the failure mode that costs real money, so a settled link
  -- answers with what already happened instead of doing it again.
  if v_link.status = 'paid' then
    return jsonb_build_object(
      'booking_id', v_link.booking_id,
      'status', 'booked',
      'already_paid', true
    );
  end if;

  if v_link.status <> 'pending' then
    raise exception 'CONFLICT';
  end if;

  if v_link.expires_at <= now() then
    update public.booking_payment_links set status = 'expired' where id = v_link.id;
    raise exception 'EXPIRED';
  end if;

  select id, renter_id, owner_id, status, total_minor
    into v_booking
    from public.bookings
   where id = v_link.booking_id
   for update;

  if v_booking.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_booking.status <> 'accepted' then
    raise exception 'CONFLICT';
  end if;

  insert into public.payments (
    booking_id, user_id, purpose, amount_minor, currency, status,
    provider, provider_payment_id,
    -- Kept in step for the Stripe case only: the column names something
    -- Stripe-specific and must not be filled with another provider's id.
    stripe_payment_intent_id
  ) values (
    v_booking.id, v_booking.renter_id, 'booking', v_link.amount_minor, v_link.currency, 'succeeded',
    v_link.provider, p_provider_reference,
    case when v_link.provider = 'stripe' then p_provider_reference else null end
  )
  returning id into v_payment_id;

  update public.booking_payment_links
     set status = 'paid',
         paid_at = now(),
         payment_id = v_payment_id,
         provider_reference = p_provider_reference,
         last_error = null
   where id = v_link.id;

  update public.bookings
     set status = 'booked',
         paid_at = now(),
         booked_at = now()
   where id = v_booking.id
     and status = 'accepted';

  if not found then
    raise exception 'CONFLICT';
  end if;

  select id into v_conversation
    from public.conversations
   where booking_id = v_booking.id
   order by last_message_at desc nulls last
   limit 1;

  if v_conversation.id is not null then
    insert into public.messages (conversation_id, sender_id, type, body, metadata)
    values (
      v_conversation.id,
      null,
      'booking_booked',
      'Plaćanje je potvrđeno. Termin je rezervisan.',
      jsonb_build_object('booking_id', v_booking.id, 'payment_id', v_payment_id)
    );

    update public.conversations
       set last_message_at = timezone('utc', now()),
           last_message_preview = 'Plaćanje je potvrđeno. Termin je rezervisan.',
           renter_unread_count = renter_unread_count + 1,
           owner_unread_count = owner_unread_count + 1
     where id = v_conversation.id;
  end if;

  v_vars := public.snd_booking_email_vars(v_booking.id);
  perform public.snd_queue_email('booking_paid_owner', v_booking.owner_id, v_vars, v_booking.id);
  perform public.snd_queue_email('booking_paid_renter', v_booking.renter_id, v_vars, v_booking.id);

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'status', 'booked',
    'payment_id', v_payment_id,
    'already_paid', false
  );
end;
$function$;

revoke all on function public.snd_confirm_booking_payment(text, text) from public, anon, authenticated;
grant execute on function public.snd_confirm_booking_payment(text, text) to service_role;

/**
 * The link summary gains the provider and the last failure.
 *
 * The pay page needs the failure text to say why a card was refused rather than
 * showing the same button again with no explanation.
 */
create or replace function public.snd_payment_link_summary(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_link record;
  v_booking record;
  v_listing record;
  v_owner text;
  v_status text;
begin
  if p_token is null or char_length(btrim(p_token)) < 16 then
    return null;
  end if;

  select * into v_link
  from public.booking_payment_links
  where token = btrim(p_token);

  if v_link.id is null then
    return null;
  end if;

  select id, reference, listing_id, owner_id, start_date, end_date, days_count, status,
         rental_price_minor, service_fee_minor, total_minor
    into v_booking
  from public.bookings
  where id = v_link.booking_id;

  select title, slug into v_listing from public.listings where id = v_booking.listing_id;

  select coalesce(
           p.display_name,
           nullif(btrim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1)), ''),
           'Korisnik'
         )
    into v_owner
  from public.user_profiles p
  where p.user_id = v_booking.owner_id;

  v_status := v_link.status::text;
  if v_status = 'pending' and v_link.expires_at <= now() then
    v_status := 'expired';
  end if;

  return jsonb_build_object(
    'token', v_link.token,
    'status', v_status,
    'provider', v_link.provider,
    'last_error', v_link.last_error,
    'amount_minor', v_link.amount_minor,
    'currency', v_link.currency,
    'expires_at', v_link.expires_at,
    'paid_at', v_link.paid_at,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'reference', v_booking.reference,
      'status', v_booking.status,
      'start_date', v_booking.start_date,
      'end_date', v_booking.end_date,
      'days_count', v_booking.days_count,
      'rental_price_minor', v_booking.rental_price_minor,
      'service_fee_minor', v_booking.service_fee_minor,
      'total_minor', v_booking.total_minor
    ),
    'listing', jsonb_build_object(
      'title', coalesce(v_listing.title, 'Oglas'),
      'slug', v_listing.slug
    ),
    'owner_name', coalesce(v_owner, 'Korisnik')
  );
end;
$function$;

revoke all on function public.snd_payment_link_summary(text) from public;
grant execute on function public.snd_payment_link_summary(text) to anon, authenticated, service_role;
