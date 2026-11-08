-- ===========================================================================
-- 080 — The owner's prices, and sixty days before them
--
-- Two numbers Erick settled on 8 Nov 2026, and they belong in one migration
-- because the second only makes sense as the answer to the first.
--
-- Premium $120 a year, Featured $200 a year.
--
-- 044 put them at $50 and $75, reasoning that $490/$1,490 were placeholders
-- priced for a market this site does not serve. That reasoning stands; the
-- figures were mine. $120 and $200 are the owner's, and docs/AUDIT-2026-10.md
-- has carried "owner decision on price" as an open question since October —
-- this closes it. The audit also recorded the original brief at $200/yr, which
-- is now what Featured costs.
--
-- price_monthly follows at a twelfth of the annual price, for the same reason
-- 044 gave: nothing bills monthly, and the only code still reading that column
-- is lib/queries/metrics.ts, which sums it across active paid subscriptions to
-- get a monthly run rate. A twelfth is the honest input to that sum. It is not
-- a price anyone can buy.
--
-- The trial goes from 30 days to 60. Doubling the price of Premium while
-- leaving the free look at it a month long asks an operator to decide faster
-- about more money; sixty days is two full enquiry cycles on a listing, which
-- is long enough to see whether leads actually arrive before paying for them.
--
-- What does NOT change: the owner still starts the trial themselves. 061 made
-- that deliberate — claiming a listing enrols nobody in anything — and nothing
-- here enrols anybody either. It is one trial per business, ever, and nothing
-- is charged when it ends.
--
-- Existing subscriptions are untouched, trials included. Changing a price or a
-- trial length must not silently reprice or re-clock somebody's current period;
-- a trial already running keeps the 30 days it was started with.
-- ===========================================================================

update subscription_plans
   set price_yearly  = 120.00,
       price_monthly = round(120.00 / 12, 2)
 where key = 'premium';

update subscription_plans
   set price_yearly  = 200.00,
       price_monthly = round(200.00 / 12, 2)
 where key = 'featured';

-- Stated rather than assumed, as in 044.
update subscription_plans
   set price_yearly = 0, price_monthly = 0
 where key = 'free';

-- ---------------------------------------------------------------------------
-- Sixty days. Body unchanged from 061 apart from the interval and the comment;
-- replaced whole because a plpgsql body cannot be patched in place.
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

  v_end := now() + interval '60 days';

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
  'Starts the one 60-day Premium trial for an approved business, for its owner. Service role only: the server checks the session and passes the owner.';
