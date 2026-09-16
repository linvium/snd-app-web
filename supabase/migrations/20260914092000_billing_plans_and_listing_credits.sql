-- What SND charges for: advertising, not renting.
--
-- An owner pays to have listings live, in one of two ways:
--
--   * a subscription - a monthly plan with a cap on how many listings can be
--     published at the same time;
--   * listing credits - one credit publishes one listing, bought in packs where
--     a bigger pack is cheaper per credit.
--
-- The rule is enforced where the status changes, not in the API: owners can
-- update their own listings row directly under RLS, so a check that lived only
-- in a route would be a check anyone with the anon key could skip. A trigger on
-- `listings` decides whether a listing may become `published`, and spends a
-- credit when it has to, in the same transaction.
--
-- Credits are a ledger, not a balance column: every purchase and every spend is
-- a row, the balance is their sum, and nobody can write either from a client.

-- 1. The catalogue.

create table public.billing_plans (
  key varchar(32) primary key,
  name varchar(60) not null,
  description text,
  listing_limit integer not null check (listing_limit > 0),
  price_minor bigint not null check (price_minor > 0),
  currency char(3) not null default 'RSD',
  interval_months smallint not null default 1 check (interval_months > 0),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.billing_plans is
  'Subscription plans. listing_limit is how many listings may be published at once while the plan is current.';

create table public.credit_packs (
  key varchar(32) primary key,
  name varchar(60) not null,
  credits integer not null check (credits > 0),
  price_minor bigint not null check (price_minor > 0),
  currency char(3) not null default 'RSD',
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.credit_packs is
  'Listing credit packs. One credit publishes one listing; a larger active pack must cost less per credit.';

create trigger trg_billing_plans_updated_at
  before update on public.billing_plans
  for each row execute function public.set_updated_at();

create trigger trg_credit_packs_updated_at
  before update on public.credit_packs
  for each row execute function public.set_updated_at();

/**
 * Bulk has to be cheaper.
 *
 * The whole point of packs is that 50 credits cost less each than 10. A price
 * edit that broke the ladder would quietly punish the people buying the most,
 * so it is refused at the moment it is written.
 */
create or replace function public.snd_check_credit_pack_ladder()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_previous numeric;
  v_pack record;
begin
  for v_pack in
    select key, credits, price_minor::numeric / credits as unit_price
    from public.credit_packs
    where is_active
    order by credits
  loop
    if v_previous is not null and v_pack.unit_price >= v_previous then
      raise exception 'CREDIT_PACK_LADDER: pack % must cost less per credit than every smaller pack', v_pack.key;
    end if;
    v_previous := v_pack.unit_price;
  end loop;

  return null;
end;
$function$;

create trigger trg_credit_packs_ladder
  after insert or update or delete on public.credit_packs
  for each statement execute function public.snd_check_credit_pack_ladder();

alter table public.billing_plans enable row level security;
alter table public.credit_packs enable row level security;

create policy "billing_plans: read active" on public.billing_plans
  for select to anon, authenticated
  using (is_active);

create policy "credit_packs: read active" on public.credit_packs
  for select to anon, authenticated
  using (is_active);

grant select on public.billing_plans to anon, authenticated;
grant select on public.credit_packs to anon, authenticated;

insert into public.billing_plans (key, name, description, listing_limit, price_minor, sort_order)
values
  ('starter', 'Start', 'Za povremeno izdavanje nekoliko stvari.', 5, 49000, 1),
  ('standard', 'Standard', 'Za one koji redovno izdaju opremu.', 20, 129000, 2),
  ('pro', 'Pro', 'Za radnje i iznajmljivače sa puno opreme.', 60, 299000, 3)
on conflict (key) do nothing;

insert into public.credit_packs (key, name, credits, price_minor, sort_order)
values
  ('single', '1 kredit', 1, 15000, 1),
  ('pack_10', '10 kredita', 10, 120000, 2),
  ('pack_25', '25 kredita', 25, 250000, 3),
  ('pack_50', '50 kredita', 50, 400000, 4)
on conflict (key) do nothing;

-- 2. What an owner has bought.

create table public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  token varchar(64) not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  kind varchar(16) not null check (kind in ('subscription', 'credits')),
  plan_key varchar(32) references public.billing_plans(key),
  credit_pack_key varchar(32) references public.credit_packs(key),
  credits integer check (credits is null or credits > 0),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'RSD',
  status varchar(16) not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  provider varchar(32) not null default 'stripe',
  provider_session_id varchar(255),
  provider_checkout_url text,
  provider_reference varchar(255),
  payment_id uuid references public.payments(id),
  last_error text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_orders_item check (
    (kind = 'subscription' and plan_key is not null and credit_pack_key is null and credits is null)
    or (kind = 'credits' and credit_pack_key is not null and plan_key is null and credits is not null)
  )
);

comment on table public.billing_orders is
  'One checkout for a plan or a credit pack. The token round-trips through the payment provider.';

create index idx_billing_orders_user on public.billing_orders (user_id, created_at desc);
create index idx_billing_orders_session on public.billing_orders (provider_session_id)
  where provider_session_id is not null;

create trigger trg_billing_orders_updated_at
  before update on public.billing_orders
  for each row execute function public.set_updated_at();

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_key varchar(32) not null references public.billing_plans(key),
  order_id uuid references public.billing_orders(id),
  status varchar(16) not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  provider varchar(32),
  provider_subscription_id varchar(255) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.user_subscriptions.status is
  'active until the period ends (even when cancel_at_period_end), expired after it, cancelled when replaced.';

create unique index user_subscriptions_one_active
  on public.user_subscriptions (user_id)
  where status = 'active';

create trigger trg_user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute function public.set_updated_at();

create table public.listing_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason varchar(24) not null check (reason in ('purchase', 'listing_unlock', 'grant', 'adjustment')),
  order_id uuid references public.billing_orders(id),
  listing_id uuid references public.listings(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.listing_credit_transactions is
  'Credit ledger. The balance is sum(delta); purchases are positive, a published listing is -1.';

create index idx_listing_credit_transactions_user
  on public.listing_credit_transactions (user_id, created_at desc);

-- A listing a credit was spent on, or one that was live before billing
-- existed. Either way it no longer needs a subscription slot to be published.
create table public.listing_unlocks (
  listing_id uuid primary key
    references public.listings(id) on delete cascade
    deferrable initially deferred,
  user_id uuid not null references public.users(id) on delete cascade,
  source varchar(16) not null check (source in ('credit', 'legacy')),
  transaction_id uuid references public.listing_credit_transactions(id),
  created_at timestamptz not null default now()
);

create index idx_listing_unlocks_user on public.listing_unlocks (user_id);

-- Read your own, write nothing: every row here is written by a security
-- definer function, never by the client.
alter table public.billing_orders enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.listing_credit_transactions enable row level security;
alter table public.listing_unlocks enable row level security;

create policy "billing_orders: select own" on public.billing_orders
  for select to authenticated using (auth.uid() = user_id);

create policy "user_subscriptions: select own" on public.user_subscriptions
  for select to authenticated using (auth.uid() = user_id);

create policy "listing_credit_transactions: select own" on public.listing_credit_transactions
  for select to authenticated using (auth.uid() = user_id);

create policy "listing_unlocks: select own" on public.listing_unlocks
  for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete, truncate on public.billing_orders from anon, authenticated;
revoke insert, update, delete, truncate on public.user_subscriptions from anon, authenticated;
revoke insert, update, delete, truncate on public.listing_credit_transactions from anon, authenticated;
revoke insert, update, delete, truncate on public.listing_unlocks from anon, authenticated;

grant select on public.billing_orders to authenticated;
grant select on public.user_subscriptions to authenticated;
grant select on public.listing_credit_transactions to authenticated;
grant select on public.listing_unlocks to authenticated;

alter table public.payments drop constraint if exists payments_purpose_check;
alter table public.payments
  add constraint payments_purpose_check
  check (purpose in ('kyc_package', 'subscription', 'listing_credits'));

-- 3. Entitlement.

/**
 * The subscription that counts right now, or a row of nulls.
 *
 * A provider-renewed plan gets three days of grace past its period end: the
 * renewal webhook lands after the period rolls over, and an owner whose card
 * is being charged should not see their listings disappear in that gap. A plan
 * the owner cancelled gets no grace - it was always going to end on that date.
 */
create or replace function public.snd_current_subscription(p_user_id uuid)
returns public.user_subscriptions
language sql
stable
security definer
set search_path to 'public'
as $function$
  select s.*
  from public.user_subscriptions s
  where s.user_id = p_user_id
    and s.status = 'active'
    and (
      s.current_period_end > now()
      or (
        s.provider_subscription_id is not null
        and not s.cancel_at_period_end
        and s.current_period_end + interval '3 days' > now()
      )
    )
  order by s.current_period_end desc
  limit 1;
$function$;

create or replace function public.snd_listing_credit_balance(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(sum(delta), 0)::integer
  from public.listing_credit_transactions
  where user_id = p_user_id;
$function$;

/** Published listings that occupy a subscription slot (not credit-unlocked). */
create or replace function public.snd_listing_slot_usage(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::integer
  from public.listings l
  where l.owner_id = p_user_id
    and l.status = 'published'
    and l.deleted_at is null
    and not exists (select 1 from public.listing_unlocks u where u.listing_id = l.id);
$function$;

/**
 * May this listing go live?
 *
 * In order: a listing that is already unlocked always may; otherwise a free
 * slot in the current subscription; otherwise one credit is spent and the
 * listing is unlocked for good. With none of the three the change is refused
 * with LISTING_LIMIT_REACHED, which the API turns into a pointer to /pricing.
 *
 * Trusted callers - the service role, and SQL run without a request JWT such as
 * migrations and seed scripts - are not metered.
 */
create or replace function public.snd_enforce_listing_entitlement()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_limit integer;
  v_used integer;
  v_transaction_id uuid;
begin
  if new.status is distinct from 'published' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  if coalesce(auth.role(), 'service_role') = 'service_role' then
    return new;
  end if;

  -- One owner, one decision at a time: two tabs publishing at once must not
  -- both see the last free slot.
  perform pg_advisory_xact_lock(hashtextextended('snd_listing_entitlement:' || new.owner_id::text, 0));

  if exists (select 1 from public.listing_unlocks where listing_id = new.id) then
    return new;
  end if;

  select p.listing_limit
    into v_limit
  from public.snd_current_subscription(new.owner_id) s
  join public.billing_plans p on p.key = s.plan_key;

  if v_limit is not null then
    select count(*)
      into v_used
    from public.listings l
    where l.owner_id = new.owner_id
      and l.status = 'published'
      and l.deleted_at is null
      and l.id <> new.id
      and not exists (select 1 from public.listing_unlocks u where u.listing_id = l.id);

    if v_used < v_limit then
      return new;
    end if;
  end if;

  if public.snd_listing_credit_balance(new.owner_id) >= 1 then
    insert into public.listing_credit_transactions (user_id, delta, reason, listing_id)
    values (new.owner_id, -1, 'listing_unlock', new.id)
    returning id into v_transaction_id;

    insert into public.listing_unlocks (listing_id, user_id, source, transaction_id)
    values (new.id, new.owner_id, 'credit', v_transaction_id);

    return new;
  end if;

  raise exception 'LISTING_LIMIT_REACHED';
end;
$function$;

-- Listings that were already live keep being live: billing starts with the
-- next listing, not by taking down the ones people already see.
insert into public.listing_unlocks (listing_id, user_id, source)
select l.id, l.owner_id, 'legacy'
from public.listings l
where l.status in ('published', 'paused')
  and l.deleted_at is null
on conflict (listing_id) do nothing;

drop trigger if exists trg_listings_entitlement on public.listings;
create trigger trg_listings_entitlement
  before insert or update of status on public.listings
  for each row execute function public.snd_enforce_listing_entitlement();

/**
 * Takes listings down to what the owner is entitled to.
 *
 * Expires plans whose period (and grace) is over, then pauses the newest
 * slot-occupying listings above the current limit. Paused, not deleted: the
 * owner gets them back as soon as they renew or buy credits.
 *
 * Called when the provider reports a subscription ended. Plans without a
 * provider (the sandbox path) only end by the clock, so schedule this hourly:
 *   select cron.schedule('snd-enforce-listing-limits', '7 * * * *',
 *     'select public.snd_enforce_listing_limits()');
 */
create or replace function public.snd_enforce_listing_limits(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner record;
  v_limit integer;
  v_changed integer;
  v_paused integer := 0;
begin
  update public.user_subscriptions s
     set status = 'expired'
   where s.status = 'active'
     and (p_user_id is null or s.user_id = p_user_id)
     and not (
       s.current_period_end > now()
       or (
         s.provider_subscription_id is not null
         and not s.cancel_at_period_end
         and s.current_period_end + interval '3 days' > now()
       )
     );

  for v_owner in
    select distinct l.owner_id
    from public.listings l
    where l.status = 'published'
      and l.deleted_at is null
      and (p_user_id is null or l.owner_id = p_user_id)
      and not exists (select 1 from public.listing_unlocks u where u.listing_id = l.id)
  loop
    v_limit := null;

    select p.listing_limit
      into v_limit
    from public.snd_current_subscription(v_owner.owner_id) s
    join public.billing_plans p on p.key = s.plan_key;

    update public.listings
       set status = 'paused'
     where id in (
       select l.id
       from public.listings l
       where l.owner_id = v_owner.owner_id
         and l.status = 'published'
         and l.deleted_at is null
         and not exists (select 1 from public.listing_unlocks u where u.listing_id = l.id)
       order by l.published_at asc nulls last, l.created_at asc
       offset coalesce(v_limit, 0)
     );

    get diagnostics v_changed = row_count;
    v_paused := v_paused + v_changed;
  end loop;

  return v_paused;
end;
$function$;

-- 4. What the manager page reads.

create or replace function public.snd_billing_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_subscription public.user_subscriptions;
  v_plan public.billing_plans;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  v_subscription := public.snd_current_subscription(v_user_id);

  if v_subscription.id is not null then
    select * into v_plan from public.billing_plans where key = v_subscription.plan_key;
  end if;

  return jsonb_build_object(
    'subscription', case when v_subscription.id is null then null else jsonb_build_object(
      'id', v_subscription.id,
      'plan_key', v_plan.key,
      'plan_name', v_plan.name,
      'listing_limit', v_plan.listing_limit,
      'price_minor', v_plan.price_minor,
      'currency', v_plan.currency,
      'current_period_start', v_subscription.current_period_start,
      'current_period_end', v_subscription.current_period_end,
      'cancel_at_period_end', v_subscription.cancel_at_period_end,
      'provider', v_subscription.provider
    ) end,
    'slots_used', public.snd_listing_slot_usage(v_user_id),
    'credit_balance', public.snd_listing_credit_balance(v_user_id),
    'unlocked_listings', (select count(*) from public.listing_unlocks where user_id = v_user_id),
    'transactions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'delta', t.delta,
          'reason', t.reason,
          'listing_title', t.listing_title,
          'created_at', t.created_at
        ) order by t.created_at desc
      )
      from (
        select tx.id, tx.delta, tx.reason, tx.created_at, l.title as listing_title
        from public.listing_credit_transactions tx
        left join public.listings l on l.id = tx.listing_id
        where tx.user_id = v_user_id
        order by tx.created_at desc
        limit 20
      ) t
    ), '[]'::jsonb)
  );
end;
$function$;

-- 5. Orders.

create or replace function public.snd_billing_order_payload(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_order public.billing_orders;
  v_plan public.billing_plans;
  v_pack public.credit_packs;
  v_status text;
begin
  select * into v_order from public.billing_orders where id = p_order_id;
  if v_order.id is null then
    return null;
  end if;

  if v_order.plan_key is not null then
    select * into v_plan from public.billing_plans where key = v_order.plan_key;
  end if;
  if v_order.credit_pack_key is not null then
    select * into v_pack from public.credit_packs where key = v_order.credit_pack_key;
  end if;

  v_status := v_order.status;
  if v_status = 'pending' and v_order.expires_at <= now() then
    v_status := 'expired';
  end if;

  return jsonb_build_object(
    'token', v_order.token,
    'kind', v_order.kind,
    'status', v_status,
    'amount_minor', v_order.amount_minor,
    'currency', v_order.currency,
    'credits', v_order.credits,
    'item_name', coalesce(v_plan.name, v_pack.name),
    'plan', case when v_plan.key is null then null else jsonb_build_object(
      'key', v_plan.key,
      'name', v_plan.name,
      'listing_limit', v_plan.listing_limit
    ) end,
    'provider', v_order.provider,
    'last_error', v_order.last_error,
    'expires_at', v_order.expires_at,
    'paid_at', v_order.paid_at,
    'created_at', v_order.created_at
  );
end;
$function$;

create or replace function public.snd_create_billing_order(p_kind text, p_item_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_plan public.billing_plans;
  v_pack public.credit_packs;
  v_subscription public.user_subscriptions;
  v_amount bigint;
  v_currency char(3);
  v_token text;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_kind = 'subscription' then
    select * into v_plan from public.billing_plans where key = p_item_key and is_active;
    if v_plan.key is null then
      raise exception 'NOT_FOUND';
    end if;

    -- One plan at a time. Switching is cancel, then choose again when it ends.
    v_subscription := public.snd_current_subscription(v_user_id);
    if v_subscription.id is not null then
      raise exception 'SUBSCRIPTION_ACTIVE';
    end if;

    v_amount := v_plan.price_minor;
    v_currency := v_plan.currency;
  elsif p_kind = 'credits' then
    select * into v_pack from public.credit_packs where key = p_item_key and is_active;
    if v_pack.key is null then
      raise exception 'NOT_FOUND';
    end if;

    v_amount := v_pack.price_minor;
    v_currency := v_pack.currency;
  else
    raise exception 'VALIDATION_FAILED';
  end if;

  -- An abandoned checkout is history, not an option. If one of them is paid
  -- after all, settling still honours it.
  update public.billing_orders
     set status = 'cancelled'
   where user_id = v_user_id
     and status = 'pending';

  v_token := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.billing_orders (
    token, user_id, kind, plan_key, credit_pack_key, credits, amount_minor, currency, expires_at
  ) values (
    v_token,
    v_user_id,
    p_kind,
    v_plan.key,
    v_pack.key,
    v_pack.credits,
    v_amount,
    v_currency,
    now() + interval '2 hours'
  )
  returning id into v_order_id;

  return public.snd_billing_order_payload(v_order_id);
end;
$function$;

create or replace function public.snd_billing_order_summary(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select id into v_order_id
  from public.billing_orders
  where token = btrim(coalesce(p_token, ''))
    and user_id = auth.uid();

  if v_order_id is null then
    return null;
  end if;

  return public.snd_billing_order_payload(v_order_id);
end;
$function$;

create or replace function public.snd_start_billing_checkout(
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
  v_order public.billing_orders;
begin
  select * into v_order
    from public.billing_orders
   where token = btrim(coalesce(p_token, ''))
   for update;

  if v_order.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'CONFLICT';
  end if;

  if v_order.expires_at <= now() then
    update public.billing_orders set status = 'expired' where id = v_order.id;
    raise exception 'EXPIRED';
  end if;

  update public.billing_orders
     set provider = coalesce(nullif(btrim(p_provider), ''), provider),
         provider_session_id = p_session_id,
         provider_checkout_url = p_checkout_url,
         last_error = null
   where id = v_order.id;

  return jsonb_build_object('order_id', v_order.id, 'token', v_order.token);
end;
$function$;

create or replace function public.snd_record_billing_failure(
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
  v_order public.billing_orders;
begin
  select * into v_order
    from public.billing_orders
   where token = btrim(coalesce(p_token, ''))
   for update;

  if v_order.id is null then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.payments (user_id, purpose, amount_minor, currency, status, provider, provider_payment_id, failure_code)
  values (
    v_order.user_id,
    case v_order.kind when 'subscription' then 'subscription' else 'listing_credits' end,
    v_order.amount_minor,
    v_order.currency,
    'failed',
    v_order.provider,
    p_provider_reference,
    left(coalesce(p_reason, 'unknown'), 255)
  );

  -- A refused card is a reason to try again: the order stays open and the
  -- session is cleared so the next attempt starts a fresh checkout.
  update public.billing_orders
     set provider_session_id = null,
         provider_checkout_url = null,
         last_error = left(coalesce(p_reason, 'unknown'), 500)
   where id = v_order.id
     and status = 'pending';

  return jsonb_build_object('order_id', v_order.id, 'retryable', v_order.status = 'pending');
end;
$function$;

/**
 * Money arrived: deliver what was bought.
 *
 * Idempotent - a second delivery of the same webhook answers with what already
 * happened. An order that was cancelled or expired on our side is still
 * honoured, because the provider saying it was paid is the fact that matters.
 */
create or replace function public.snd_settle_billing_order(
  p_token text,
  p_provider_reference text default null,
  p_provider_subscription_id text default null,
  p_period_end timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.billing_orders;
  v_plan public.billing_plans;
  v_payment_id uuid;
  v_subscription_id uuid;
  v_replaced text;
  v_period_end timestamptz;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'VALIDATION_FAILED';
  end if;

  select * into v_order
    from public.billing_orders
   where token = btrim(p_token)
   for update;

  if v_order.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('order_id', v_order.id, 'kind', v_order.kind, 'already_paid', true);
  end if;

  insert into public.payments (user_id, purpose, amount_minor, currency, status, provider, provider_payment_id)
  values (
    v_order.user_id,
    case v_order.kind when 'subscription' then 'subscription' else 'listing_credits' end,
    v_order.amount_minor,
    v_order.currency,
    'succeeded',
    v_order.provider,
    p_provider_reference
  )
  returning id into v_payment_id;

  update public.billing_orders
     set status = 'paid',
         paid_at = now(),
         payment_id = v_payment_id,
         provider_reference = p_provider_reference,
         last_error = null
   where id = v_order.id;

  if v_order.kind = 'credits' then
    insert into public.listing_credit_transactions (user_id, delta, reason, order_id)
    values (v_order.user_id, v_order.credits, 'purchase', v_order.id);

    perform public.snd_queue_email(
      'billing_credits_purchased',
      v_order.user_id,
      jsonb_build_object(
        'credits', v_order.credits,
        'credit_balance', public.snd_listing_credit_balance(v_order.user_id),
        'amount', public.snd_format_minor(v_order.amount_minor),
        'billing_path', '/profile/billing'
      )
    );
  else
    select * into v_plan from public.billing_plans where key = v_order.plan_key;

    -- Two checkouts paid for two plans: the newer one wins, and the caller is
    -- told which provider subscription to stop billing.
    select provider_subscription_id
      into v_replaced
    from public.user_subscriptions
    where user_id = v_order.user_id
      and status = 'active'
      and provider_subscription_id is not null
      and provider_subscription_id is distinct from p_provider_subscription_id
    limit 1;

    update public.user_subscriptions
       set status = 'cancelled',
           cancelled_at = now()
     where user_id = v_order.user_id
       and status = 'active';

    v_period_end := coalesce(p_period_end, now() + make_interval(months => v_plan.interval_months));

    insert into public.user_subscriptions (
      user_id, plan_key, order_id, status, current_period_start, current_period_end,
      provider, provider_subscription_id
    ) values (
      v_order.user_id, v_plan.key, v_order.id, 'active', now(), v_period_end,
      v_order.provider, p_provider_subscription_id
    )
    returning id into v_subscription_id;

    perform public.snd_queue_email(
      'billing_subscription_activated',
      v_order.user_id,
      jsonb_build_object(
        'plan_name', v_plan.name,
        'listing_limit', v_plan.listing_limit,
        'period_end', to_char(v_period_end at time zone 'Europe/Belgrade', 'DD.MM.YYYY.'),
        'amount', public.snd_format_minor(v_order.amount_minor),
        'billing_path', '/profile/billing'
      )
    );
  end if;

  return jsonb_build_object(
    'order_id', v_order.id,
    'kind', v_order.kind,
    'already_paid', false,
    'payment_id', v_payment_id,
    'subscription_id', v_subscription_id,
    'replaced_provider_subscription_id', v_replaced
  );
end;
$function$;

create or replace function public.snd_renew_subscription(
  p_provider_subscription_id text,
  p_period_end timestamptz,
  p_provider_reference text default null,
  p_amount_minor bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_subscription public.user_subscriptions;
  v_plan public.billing_plans;
begin
  select * into v_subscription
    from public.user_subscriptions
   where provider_subscription_id = p_provider_subscription_id
   for update;

  if v_subscription.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_subscription.status = 'cancelled' then
    return jsonb_build_object('subscription_id', v_subscription.id, 'renewed', false);
  end if;

  update public.user_subscriptions
     set status = 'active',
         current_period_end = greatest(current_period_end, coalesce(p_period_end, current_period_end))
   where id = v_subscription.id;

  -- The first invoice is the checkout itself and was recorded when the order
  -- settled; only a later one is a new payment.
  if p_provider_reference is not null
     and not exists (select 1 from public.payments where provider_payment_id = p_provider_reference)
     and not exists (select 1 from public.billing_orders where provider_reference = p_provider_reference) then
    select * into v_plan from public.billing_plans where key = v_subscription.plan_key;

    insert into public.payments (user_id, purpose, amount_minor, currency, status, provider, provider_payment_id)
    values (
      v_subscription.user_id,
      'subscription',
      coalesce(p_amount_minor, v_plan.price_minor),
      v_plan.currency,
      'succeeded',
      v_subscription.provider,
      p_provider_reference
    );
  end if;

  return jsonb_build_object('subscription_id', v_subscription.id, 'renewed', true);
end;
$function$;

create or replace function public.snd_end_subscription(p_provider_subscription_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_subscription public.user_subscriptions;
  v_paused integer;
begin
  select * into v_subscription
    from public.user_subscriptions
   where provider_subscription_id = p_provider_subscription_id
   for update;

  if v_subscription.id is null then
    raise exception 'NOT_FOUND';
  end if;

  update public.user_subscriptions
     set status = 'expired',
         current_period_end = least(current_period_end, now())
   where id = v_subscription.id
     and status = 'active';

  v_paused := public.snd_enforce_listing_limits(v_subscription.user_id);

  return jsonb_build_object('subscription_id', v_subscription.id, 'paused_listings', v_paused);
end;
$function$;

/** Stop renewing; the plan keeps working until the period it was paid for ends. */
create or replace function public.snd_schedule_subscription_cancel(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_subscription public.user_subscriptions;
begin
  v_subscription := public.snd_current_subscription(p_user_id);

  if v_subscription.id is null then
    raise exception 'NOT_FOUND';
  end if;

  update public.user_subscriptions
     set cancel_at_period_end = true,
         cancelled_at = coalesce(cancelled_at, now())
   where id = v_subscription.id;

  return jsonb_build_object(
    'subscription_id', v_subscription.id,
    'current_period_end', v_subscription.current_period_end
  );
end;
$function$;

-- Grants. Supabase grants EXECUTE on new functions to anon and authenticated by
-- default, so revoking from `public` alone would leave them callable.
revoke all on function public.snd_check_credit_pack_ladder() from public, anon, authenticated;
revoke all on function public.snd_current_subscription(uuid) from public, anon, authenticated;
revoke all on function public.snd_listing_credit_balance(uuid) from public, anon, authenticated;
revoke all on function public.snd_listing_slot_usage(uuid) from public, anon, authenticated;
revoke all on function public.snd_enforce_listing_entitlement() from public, anon, authenticated;
revoke all on function public.snd_enforce_listing_limits(uuid) from public, anon, authenticated;
revoke all on function public.snd_billing_order_payload(uuid) from public, anon, authenticated;
revoke all on function public.snd_start_billing_checkout(text, text, text, text) from public, anon, authenticated;
revoke all on function public.snd_record_billing_failure(text, text, text) from public, anon, authenticated;
revoke all on function public.snd_settle_billing_order(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.snd_renew_subscription(text, timestamptz, text, bigint) from public, anon, authenticated;
revoke all on function public.snd_end_subscription(text) from public, anon, authenticated;
revoke all on function public.snd_schedule_subscription_cancel(uuid) from public, anon, authenticated;

grant execute on function public.snd_enforce_listing_limits(uuid) to service_role;
grant execute on function public.snd_start_billing_checkout(text, text, text, text) to service_role;
grant execute on function public.snd_record_billing_failure(text, text, text) to service_role;
grant execute on function public.snd_settle_billing_order(text, text, text, timestamptz) to service_role;
grant execute on function public.snd_renew_subscription(text, timestamptz, text, bigint) to service_role;
grant execute on function public.snd_end_subscription(text) to service_role;
grant execute on function public.snd_schedule_subscription_cancel(uuid) to service_role;

revoke all on function public.snd_billing_summary() from public, anon;
revoke all on function public.snd_create_billing_order(text, text) from public, anon;
revoke all on function public.snd_billing_order_summary(text) from public, anon;
grant execute on function public.snd_billing_summary() to authenticated;
grant execute on function public.snd_create_billing_order(text, text) to authenticated;
grant execute on function public.snd_billing_order_summary(text) to authenticated;

-- 6. Mail.

insert into public.email_templates (key, name, description, subject, html_body, text_body, variables)
values
  (
    'billing_subscription_activated',
    'Pretplata aktivirana',
    'Vlasniku, kada plaćanje pretplate prođe.',
    'Pretplata {{plan_name}} je aktivna',
    '<p>Zdravo,</p>'
      || '<p>Pretplata <strong>{{plan_name}}</strong> je aktivna. Možeš da imaš do {{listing_limit}} objavljenih oglasa u isto vreme.</p>'
      || '<p>Plaćeno: {{amount}}<br />Period traje do: {{period_end}}</p>'
      || '<p><a href="{{billing_url}}">Otvori pretplatu</a></p>',
    'Pretplata {{plan_name}} je aktivna - do {{listing_limit}} objavljenih oglasa. Plaćeno: {{amount}}. Period traje do {{period_end}}. {{billing_url}}',
    '["plan_name","listing_limit","amount","period_end","billing_url","app_url"]'::jsonb
  ),
  (
    'billing_credits_purchased',
    'Krediti kupljeni',
    'Vlasniku, kada plaćanje paketa kredita prođe.',
    'Kupljeno {{credits}} kredita za oglase',
    '<p>Zdravo,</p>'
      || '<p>Na nalog je dodato <strong>{{credits}}</strong> kredita. Jedan kredit je jedan objavljen oglas.</p>'
      || '<p>Plaćeno: {{amount}}<br />Stanje kredita: {{credit_balance}}</p>'
      || '<p><a href="{{billing_url}}">Otvori kredite</a></p>',
    'Dodato je {{credits}} kredita za oglase. Plaćeno: {{amount}}. Stanje: {{credit_balance}}. {{billing_url}}',
    '["credits","credit_balance","amount","billing_url","app_url"]'::jsonb
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  html_body = excluded.html_body,
  text_body = excluded.text_body,
  variables = excluded.variables,
  is_active = true;
