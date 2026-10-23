-- ===========================================================================
-- 061 — A 30-day Premium trial, and plans that actually end
--
-- The build brief: a 30-day premium trial for eligible claimed businesses, the
-- exact expiry shown in the dashboard, a downgrade to the free listing when it
-- ends unless the owner pays, never a deleted listing, and never a charge
-- without the owner choosing one.
--
-- Two things were missing for that:
--
-- 1. Nothing ever expired a subscription. grant_annual_plan sets
--    current_period_end a year out, and then the row stays 'active' forever, so
--    a plan paid once kept Premium placement and limits indefinitely. A trial
--    built on that would never end. expire_subscriptions() closes every active
--    period that has run out, and the existing sync_business_tier trigger drops
--    the business back to 'free'. Scheduled hourly with pg_cron.
--
-- 2. A way to start the trial. The owner chooses it (the brief: the owner
--    "selects a trial or subscription"; claiming must not enrol anyone in
--    anything). start_premium_trial() is called by the server after it has
--    checked the session, through the service role, because starting a trial
--    changes businesses.tier and the 013 guard rightly refuses that from an
--    owner's own session.
--
-- One trial per business, ever (trial_started_at), so ending a trial and
-- re-claiming cannot restart the clock. Nothing is charged at the end: the
-- listing returns to the free plan, which is what an expired period means.
-- ===========================================================================

alter table subscriptions
  add column is_trial boolean not null default false;

alter table businesses
  add column trial_started_at timestamptz;

comment on column subscriptions.is_trial is
  'A free trial period. Ends like any other period; nothing is charged.';
comment on column businesses.trial_started_at is
  'When this business started its one Premium trial. Null = never trialled.';

-- ---------------------------------------------------------------------------
-- Ending periods that have run out
-- ---------------------------------------------------------------------------

create or replace function expire_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update subscriptions
     set status = 'expired'
   where status = 'active'
     and current_period_end is not null
     and current_period_end <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function expire_subscriptions() from public;
grant execute on function expire_subscriptions() to service_role;

comment on function expire_subscriptions() is
  'Marks active subscriptions past their period end as expired; the tier trigger then returns the business to free. Run hourly by pg_cron.';

-- ---------------------------------------------------------------------------
-- Starting the trial
-- ---------------------------------------------------------------------------

create or replace function start_premium_trial(
  p_business_id uuid,
  p_owner_id    uuid
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business businesses%rowtype;
  v_plan     uuid;
  v_end      timestamptz;
begin
  -- Locked so two clicks cannot start two trials.
  select * into v_business from businesses where id = p_business_id for update;

  if v_business.id is null or v_business.deleted_at is not null then
    raise exception 'trial_not_eligible' using errcode = 'P0001';
  end if;
  if v_business.owner_id is distinct from p_owner_id then
    raise exception 'trial_not_owner' using errcode = 'P0001';
  end if;
  if v_business.status <> 'approved' then
    raise exception 'trial_not_live' using errcode = 'P0001';
  end if;
  if v_business.trial_started_at is not null then
    raise exception 'trial_used' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from subscriptions s
      join subscription_plans p on p.id = s.plan_id
     where s.business_id = p_business_id
       and s.status = 'active'
       and p.tier <> 'free'
       and (s.current_period_end is null or s.current_period_end > now())
  ) then
    raise exception 'trial_has_plan' using errcode = 'P0001';
  end if;

  select id into v_plan from subscription_plans where key = 'premium' and is_active;
  if v_plan is null then
    raise exception 'trial_no_plan' using errcode = 'P0001';
  end if;

  -- One active row per business (subscriptions_one_active). A free row, or a
  -- paid one already past its end, is closed first.
  update subscriptions
     set status = case when current_period_end is not null and current_period_end <= now()
                       then 'expired'::subscription_status
                       else 'canceled'::subscription_status end,
         canceled_at = now()
   where business_id = p_business_id and status = 'active';

  v_end := now() + interval '30 days';

  insert into subscriptions
    (business_id, plan_id, status, current_period_start, current_period_end, provider, is_trial)
  values
    (p_business_id, v_plan, 'active', now(), v_end, 'trial', true);

  update businesses set trial_started_at = now() where id = p_business_id;

  return v_end;
end;
$$;

revoke all on function start_premium_trial(uuid, uuid) from public;
grant execute on function start_premium_trial(uuid, uuid) to service_role;

comment on function start_premium_trial(uuid, uuid) is
  'Starts the one 30-day Premium trial for an approved business, for its owner. Service role only: the server checks the session and passes the owner.';

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-subscriptions';
select cron.schedule('expire-subscriptions', '7 * * * *', 'select public.expire_subscriptions()');
