-- Makes `blocked_dates` the single answer to "is this day free?" (doc 00 §6.4).
--
-- The table was designed for this: `reason` already accepts 'booking' and
-- `booking_id` already points back at the cause. Filling it from the booking's
-- status means the public calendar needs one readable table instead of also
-- reading `bookings`, which is visible only to its two parties — a visitor can
-- see that a day is gone without learning whose it is.
--
-- Only accepted / paid / in_progress block. A `requested` booking does not:
-- two people may ask for the same week and the first acceptance wins
-- (doc 00 §6.4).

create or replace function public.snd_sync_booking_blocked_dates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocks boolean;
begin
  v_blocks := new.status in ('accepted', 'paid', 'in_progress');

  if tg_op = 'UPDATE'
     and old.status = new.status
     and old.start_date = new.start_date
     and old.end_date = new.end_date then
    return null;
  end if;

  -- Rebuild rather than diff: the row count is a handful of days, and a
  -- delete-then-insert cannot drift the way an incremental update can.
  delete from public.blocked_dates where booking_id = new.id;

  if v_blocks then
    insert into public.blocked_dates (listing_id, date, reason, booking_id)
    select new.listing_id, d::date, 'booking', new.id
    from generate_series(new.start_date, new.end_date, interval '1 day') d
    -- A manual block on the same day is already there and already correct;
    -- the unique index on (listing_id, date) makes this the collision case.
    on conflict (listing_id, date) do nothing;
  end if;

  return null;
end;
$$;

drop trigger if exists bookings_sync_blocked_dates on public.bookings;
create trigger bookings_sync_blocked_dates
  after insert or update of status, start_date, end_date on public.bookings
  for each row execute function public.snd_sync_booking_blocked_dates();

create or replace function public.snd_clear_booking_blocked_dates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.blocked_dates where booking_id = old.id;
  return old;
end;
$$;

drop trigger if exists bookings_clear_blocked_dates on public.bookings;
create trigger bookings_clear_blocked_dates
  before delete on public.bookings
  for each row execute function public.snd_clear_booking_blocked_dates();

-- Backfill for bookings that predate the trigger.
insert into public.blocked_dates (listing_id, date, reason, booking_id)
select b.listing_id, d::date, 'booking', b.id
from public.bookings b
cross join lateral generate_series(b.start_date, b.end_date, interval '1 day') d
where b.status in ('accepted', 'paid', 'in_progress')
on conflict (listing_id, date) do nothing;
