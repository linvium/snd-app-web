-- Keeps `listings.rating_avg` / `rating_count` and the owner's equivalents on
-- `user_profiles` in step with the reviews that justify them.
--
-- Both column pairs already existed and were never written to, so every rating
-- on the platform read as "Novo" no matter how many reviews a thing had
-- (doc 04 §4). `favorite_count` is maintained by a trigger for the same reason;
-- this is the missing sibling.
--
-- Only published rows count. A review under the double-blind hold (doc 00
-- §3.14) is not visible, and letting it move the average would leak its
-- direction before its text.

create or replace function public.snd_recount_review_targets(
  p_listing_id uuid,
  p_subject_user_id uuid
)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  with listing_stats as (
    select
      count(*) as n,
      round(avg(rating)::numeric, 2) as avg
    from public.reviews
    where listing_id = p_listing_id
      and is_published = true
      and direction = 'renter_to_owner'
  )
  update public.listings l
  set rating_count = s.n,
      rating_avg = case when s.n = 0 then null else s.avg end
  from listing_stats s
  where l.id = p_listing_id;

  with user_stats as (
    select
      count(*) as n,
      round(avg(rating)::numeric, 2) as avg
    from public.reviews
    where subject_user_id = p_subject_user_id
      and is_published = true
  )
  update public.user_profiles p
  set rating_count = s.n,
      rating_avg = case when s.n = 0 then null else s.avg end,
      updated_at = now()
  from user_stats s
  where p.user_id = p_subject_user_id;
$$;

create or replace function public.snd_reviews_rollup_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.snd_recount_review_targets(new.listing_id, new.subject_user_id);
  end if;

  -- An update can move a review between targets; the old side needs recounting
  -- too, or it keeps a rating built on a row it no longer holds.
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE'
       or old.listing_id is distinct from new.listing_id
       or old.subject_user_id is distinct from new.subject_user_id then
      perform public.snd_recount_review_targets(old.listing_id, old.subject_user_id);
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists reviews_rollup on public.reviews;
create trigger reviews_rollup
  after insert or update or delete on public.reviews
  for each row execute function public.snd_reviews_rollup_trigger();

-- Backfill, so anything already in the table is counted from now on.
do $$
declare
  r record;
begin
  for r in
    select distinct listing_id, subject_user_id from public.reviews
  loop
    perform public.snd_recount_review_targets(r.listing_id, r.subject_user_id);
  end loop;
end;
$$;
