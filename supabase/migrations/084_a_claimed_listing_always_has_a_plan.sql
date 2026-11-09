-- ===========================================================================
-- 084 — A claimed listing always has a plan, and the plan is Free by default
--
-- Erick, 9 November 2026: "when users claim their businesses they should be
-- directed automatically to a FREE plan, then they should see what they will
-- get on free."
--
-- The second half was already true and the first half was not, in a way that
-- is easy to miss because the screen looks right.
--
-- ## What was actually happening
--
-- Claim approval calls `start_premium_trial` (migration 080), which is the
-- owner's earlier decision and stays. But the trial is best-effort: it refuses
-- with `trial_used`, `trial_not_live` or `trial_has_plan`, and
-- `lib/admin/claims.ts` swallows those three on purpose. In every one of those
-- cases the listing came out of approval with **no subscription row at all**.
-- The same is true sixty days later: `expire_subscriptions()` marks the trial
-- expired and nothing takes its place.
--
-- Nothing looked broken, because three separate places independently fall back
-- to free when they find no row — the subscription page picks the free plan for
-- its "Your plan" badge, `business_has_lead_capacity` reads the free quota, and
-- `deals_guard` refuses without an active paying plan. So the operator sees
-- "Free" and gets free behaviour.
--
-- It is still worth fixing, because "no row" and "the free plan" are not the
-- same fact and only one of them survives a question. 5 of the 28 owned
-- listings hold no subscription row today: nothing records when they went onto
-- free, nothing can be joined to them, and every future feature that reasons
-- about plans has to remember to write the same fallback a fourth time. One of
-- those fallbacks already disagreed with reality once — see
-- lib/billing/enabled.ts on `deals_guard`.
--
-- ## What this does
--
--   1. `ensure_free_subscription(business_id)` — writes an active free row for
--      a live, owned listing that has no active subscription. Idempotent, and
--      silent when there is already a plan, so it can be called from anywhere
--      without first asking.
--   2. `expire_subscriptions()` now calls it for every business whose period it
--      just closed. This is what makes the comment in `lib/admin/claims.ts`
--      true — "at the end the listing drops back to the free plan on its own"
--      was describing a UI fallback, not a row.
--   3. Backfills the 5.
--
-- Free rows carry `current_period_end = null`. Free does not expire, and a
-- dated free row would be collected by `expire_subscriptions` an hour later
-- and recreated, forever.
--
-- `provider` is left null rather than given an invented value like 'none'. The
-- column is nullable text and every row that has one names a real provider
-- ('bank_transfer' today); a free plan was not bought and no provider knows
-- about it, so null is the accurate answer and not a missing one.
-- ===========================================================================

begin;

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

  -- An unowned, deleted or unapproved listing is not on a plan and must not be
  -- given one: the directory is full of 3,800 imported listings nobody has
  -- claimed, and a free subscription row for each would say they had.
  if v_business.id is null
     or v_business.deleted_at is not null
     or v_business.owner_id is null
     or v_business.status <> 'approved'
  then
    return null;
  end if;

  -- Already has a plan of any kind, including a trial or an expiring paid one.
  -- `subscriptions_one_active` allows exactly one, so this is also what stops
  -- the insert below from raising.
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
    (business_id, plan_id, status, current_period_start, current_period_end, provider, is_trial)
  values
    (p_business_id, v_plan, 'active', now(), null, null, false)
  returning id into v_id;

  return v_id;
end $$;

revoke all on function ensure_free_subscription(uuid) from public;
grant execute on function ensure_free_subscription(uuid) to service_role;

comment on function ensure_free_subscription(uuid) is
  'Puts an approved, owned listing on the free plan when it has no active subscription. Idempotent; returns the new row id or null when nothing was needed.';

-- ---------------------------------------------------------------------------
-- Expiry drops to free rather than to nothing
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
       and current_period_end <= now()
    returning business_id
  )
  select count(*), coalesce(array_agg(distinct business_id), '{}') into n, ids from closed;

  -- Then put each of them back on free, so the hour after a trial ends looks
  -- like the hour before it started rather than like a listing with no plan.
  foreach b in array ids loop
    perform ensure_free_subscription(b);
  end loop;

  return n;
end $$;

revoke all on function expire_subscriptions() from public;
grant execute on function expire_subscriptions() to service_role;

comment on function expire_subscriptions() is
  'Marks active subscriptions past their period end as expired, then puts each of those listings back on the free plan. Run hourly by pg_cron.';

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
do $$
declare
  b uuid;
  n integer := 0;
begin
  for b in
    select id from businesses
     where owner_id is not null
       and deleted_at is null
       and status = 'approved'
       and not exists (
         select 1 from subscriptions s
          where s.business_id = businesses.id and s.status = 'active'
       )
  loop
    if ensure_free_subscription(b) is not null then
      n := n + 1;
    end if;
  end loop;
  raise notice '084: put % claimed listing(s) on the free plan', n;
end $$;

-- And prove it: no approved, owned listing may be left without a plan.
do $$
declare
  n integer;
begin
  select count(*) into n
    from businesses b
   where b.owner_id is not null
     and b.deleted_at is null
     and b.status = 'approved'
     and not exists (
       select 1 from subscriptions s
        where s.business_id = b.id and s.status = 'active'
     );
  if n > 0 then
    raise exception '084: % claimed listing(s) still have no plan', n;
  end if;
end $$;

commit;
