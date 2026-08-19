-- The two trust numbers on the owner card (doc 04 §5), recomputed once a night.
--
-- Deliberately not computed on page load: each one is an aggregate over ninety
-- days of conversations, and paying for that on every visit to every item page
-- would be a strange thing to spend a database on.
--
-- The median, not the mean, for response time — one conversation somebody
-- forgot about for a week should not redraw an otherwise prompt owner
-- (doc 04 §5).

create or replace function public.snd_refresh_owner_response_metrics()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  with window_conversations as (
    select c.id, c.owner_id
    from public.conversations c
    where c.created_at >= now() - interval '90 days'
  ),
  -- The clock starts at the other party's first message and stops at the
  -- owner's first reply after it.
  first_inbound as (
    select
      wc.id as conversation_id,
      wc.owner_id,
      min(m.created_at) as asked_at
    from window_conversations wc
    join public.messages m on m.conversation_id = wc.id
    where m.sender_id is not null
      and m.sender_id <> wc.owner_id
      and m.type = 'text'
    group by wc.id, wc.owner_id
  ),
  first_reply as (
    select
      fi.conversation_id,
      fi.owner_id,
      fi.asked_at,
      min(m.created_at) as replied_at
    from first_inbound fi
    left join public.messages m
      on m.conversation_id = fi.conversation_id
     and m.sender_id = fi.owner_id
     and m.type = 'text'
     and m.created_at >= fi.asked_at
    group by fi.conversation_id, fi.owner_id, fi.asked_at
  ),
  per_owner as (
    select
      owner_id,
      count(*) as asked_count,
      count(*) filter (where replied_at is not null) as replied_count,
      -- Unanswered conversations are excluded from the median but still count
      -- against the rate (doc 04 §5) — otherwise ignoring someone would
      -- improve both numbers.
      percentile_cont(0.5) within group (
        order by extract(epoch from (replied_at - asked_at)) / 60.0
      ) filter (where replied_at is not null) as median_minutes
    from first_reply
    group by owner_id
  )
  update public.user_profiles p
  set
    response_rate = case
      when o.asked_count = 0 then null
      else round((o.replied_count::numeric / o.asked_count) * 100, 2)
    end,
    avg_response_minutes = case
      when o.median_minutes is null then null
      else greatest(round(o.median_minutes)::integer, 0)
    end,
    updated_at = now()
  from per_owner o
  where p.user_id = o.owner_id;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

comment on function public.snd_refresh_owner_response_metrics() is
  'Doc 04 §5. Schedule nightly (pg_cron): select public.snd_refresh_owner_response_metrics();';
