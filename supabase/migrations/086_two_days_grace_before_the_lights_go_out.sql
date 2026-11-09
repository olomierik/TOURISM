-- ===========================================================================
-- 086 — Two days of grace before the lights go out
--
-- Erick, 9 November 2026: "if the subscription near expiry he should receive a
-- reminder, on the day the subscription expired, and 5 times to pay after
-- expiry for 2 days before service is terminated."
--
-- Until now expiry was a cliff. `expire_subscriptions()` (migration 084) runs
-- hourly and moved any subscription one second past `current_period_end`
-- straight to expired and back to free. An operator whose card was declined
-- while they were out of the office lost their listing's placement before
-- anybody could tell them, and the first they knew of it was the downgrade.
--
-- ## What changes
--
--   1. **A two-day grace period.** Termination now happens at
--      `current_period_end + 2 days`, not at `current_period_end`. The plan
--      keeps working throughout, which is the point: the reminders sent during
--      those two days are asking somebody to pay for a service they can still
--      see, not to buy back one already taken away.
--
--   2. **Two stamp columns**, in the shape migration 065 established for
--      `trial_reminder_days`. The reminder job runs hourly and must send each
--      message once, so each one records what it last sent:
--
--        renewal_reminder_days  smallest "ends in N days" bucket already sent
--        dunning_stage          how many post-expiry notices have gone out,
--                               0 meaning the one on the expiry day itself
--
--      Both are cleared whenever a period is extended, so next year's cycle
--      sends the whole sequence again rather than staying silent on a stamp
--      left over from last year. That reset lives in the payment webhook and
--      in `ensure_free_subscription`.
--
-- ## What this does not change
--
-- Free plans. They carry `current_period_end = null` and the sweep has always
-- ignored those, so there is nothing to grant grace on.
--
-- Featured placement. The trigger from migration 083 deactivates a homepage
-- slot once `current_period_end` has passed, and it keeps doing that at the
-- period end rather than at the end of grace. That is deliberate: grace is
-- meant to keep an operator's own dashboard and listing working while they
-- sort out a payment, not to keep selling them promotion they have not paid
-- for. The slot comes back on the renewing write.
-- ===========================================================================

begin;

alter table subscriptions
  add column if not exists renewal_reminder_days smallint,
  add column if not exists dunning_stage          smallint;

comment on column subscriptions.renewal_reminder_days is
  'Smallest "ends in N days" reminder bucket already emailed for this period. Cleared when the period is extended.';
comment on column subscriptions.dunning_stage is
  'Post-expiry notices sent during the grace period: 0 is the expiry-day notice, 1..5 the chasers. Cleared when the period is extended.';

-- ---------------------------------------------------------------------------
-- Termination moves to the end of grace
-- ---------------------------------------------------------------------------
create or replace function expire_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n   integer;
  ids uuid[];
  b   uuid;
begin
  with closed as (
    update subscriptions
       set status = 'expired'
     where status = 'active'
       and current_period_end is not null
       -- The grace period. Written here rather than in application code
       -- because this function is the only thing that terminates anything,
       -- and a grace period enforced in two places is a grace period that
       -- will eventually disagree with itself.
       and current_period_end + interval '2 days' <= now()
    returning business_id
  )
  select count(*), coalesce(array_agg(distinct business_id), '{}') into n, ids from closed;

  foreach b in array ids loop
    perform ensure_free_subscription(b);
  end loop;

  return n;
end $$;

revoke all on function expire_subscriptions() from public;
grant execute on function expire_subscriptions() to service_role;

comment on function expire_subscriptions() is
  'Expires subscriptions two days past their period end, then puts those listings back on the free plan. The two days are a grace period during which the reminder job chases payment. Run hourly by pg_cron.';

-- ---------------------------------------------------------------------------
-- A new free row starts with a clean reminder history
-- ---------------------------------------------------------------------------
create or replace function ensure_free_subscription(p_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses%rowtype;
  v_plan     uuid;
  v_id       uuid;
begin
  select * into v_business from businesses where id = p_business_id for update;

  if v_business.id is null
     or v_business.deleted_at is not null
     or v_business.owner_id is null
     or v_business.status <> 'approved'
  then
    return null;
  end if;

  if exists (
    select 1 from subscriptions
     where business_id = p_business_id and status = 'active'
  ) then
    return null;
  end if;

  select id into v_plan from subscription_plans where key = 'free' and is_active;
  if v_plan is null then
    raise exception 'ensure_free_subscription: no active free plan' using errcode = 'P0001';
  end if;

  insert into subscriptions
    (business_id, plan_id, status, current_period_start, current_period_end, provider, is_trial,
     renewal_reminder_days, dunning_stage)
  values
    (p_business_id, v_plan, 'active', now(), null, null, false, null, null)
  returning id into v_id;

  return v_id;
end $$;

revoke all on function ensure_free_subscription(uuid) from public;
grant execute on function ensure_free_subscription(uuid) to service_role;

-- Nothing should be sitting in grace the moment this lands: anything already
-- past its period end was expired by the old cliff behaviour long ago. Said
-- out loud so a surprise here is visible rather than silent.
do $$
declare
  n integer;
begin
  select count(*) into n
    from subscriptions
   where status = 'active'
     and current_period_end is not null
     and current_period_end <= now();
  raise notice '086: % subscription(s) are now in grace rather than expired', n;
end $$;

commit;
