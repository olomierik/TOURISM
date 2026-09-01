-- ===========================================================================
-- 042 — Annual billing, paid by bank transfer
--
-- Two changes that belong together.
--
-- Plans are annual now. The data always carried price_yearly; the dashboard
-- simply rendered price_monthly and said "per month". Nothing about the
-- entitlements changes — a lead quota is still counted per month, because that
-- is the unit an operator experiences it in.
--
-- And payment is a bank transfer to a Tanzanian account rather than a card. For
-- this market that is the normal way a business pays another business, and it
-- has one consequence the code has to take seriously: **nothing is automatic**.
-- A transfer arrives in a bank statement, not in a webhook. Somebody has to
-- look at it and decide it happened.
--
-- That makes the reference the load-bearing part. An operator types it into the
-- narration field; an admin matches it against the statement. Without one, a
-- payment from "E. Olomi" for $490 could be any of a dozen operators, and the
-- reconciliation is guesswork on somebody's money. So it is generated here,
-- unique, and short enough that a person retypes it into a banking app without
-- mistakes — no ambiguous characters, because 0/O and 1/I are exactly the
-- errors a bank narration field collects.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The reference an operator quotes and an admin matches.
-- ---------------------------------------------------------------------------
create or replace function generate_payment_reference()
returns text
language plpgsql
as $$
declare
  -- No 0/O, no 1/I/L. A reference that cannot be transcribed is not a
  -- reference, and this one is retyped by hand into a banking app.
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  candidate text;
  i int;
begin
  loop
    candidate := 'ET-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from payments where provider_ref = candidate);
  end loop;
  return candidate;
end;
$$;

-- 008 already made provider_ref unique, which is the property this depends on:
-- two payments sharing a reference is the one state that makes reconciliation
-- impossible. Nothing to add — noting it here so the next reader does not go
-- looking for the guarantee and fail to find it.

create index payments_pending_bank
  on payments (created_at desc)
  where status = 'pending' and provider = 'bank_transfer';

-- ---------------------------------------------------------------------------
-- What an operator is buying, recorded on the payment itself.
--
-- Without this a pending payment says $490 and nothing about which plan, so an
-- admin confirming it has to infer the intent from the amount — which breaks
-- the moment two plans ever cost the same.
-- ---------------------------------------------------------------------------
alter table payments
  add column plan_id uuid references subscription_plans(id) on delete restrict;

comment on column payments.plan_id is
  'The plan this payment is for. An amount alone cannot say which plan was intended once two of them cost the same.';

-- ---------------------------------------------------------------------------
-- Annual periods.
--
-- A subscription activated by an admin runs a year from activation. Stored
-- rather than computed so that extending an existing subscription adds to what
-- is left instead of restarting it — an operator who pays two months early
-- should not lose those two months.
-- ---------------------------------------------------------------------------
create or replace function grant_annual_plan(
  p_business_id uuid,
  p_plan_id     uuid,
  p_payment_id  uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub    uuid;
  v_from   timestamptz;
begin
  if not is_admin() then
    raise exception 'only an admin may grant a plan' using errcode = 'insufficient_privilege';
  end if;

  select id, current_period_end into v_sub, v_from
    from subscriptions
   where business_id = p_business_id and status = 'active'
   order by current_period_end desc nulls last
   limit 1;

  -- Extend from whichever is later: what is left, or now. Paying early adds a
  -- year to the remainder; paying late starts a fresh year today.
  v_from := greatest(coalesce(v_from, now()), now());

  if v_sub is null then
    insert into subscriptions (business_id, plan_id, status, current_period_start, current_period_end, provider)
    values (p_business_id, p_plan_id, 'active', now(), v_from + interval '1 year', 'bank_transfer')
    returning id into v_sub;
  else
    update subscriptions
       set plan_id = p_plan_id,
           status = 'active',
           current_period_end = v_from + interval '1 year',
           cancel_at_period_end = false,
           canceled_at = null,
           provider = 'bank_transfer'
     where id = v_sub;
  end if;

  if p_payment_id is not null then
    update payments
       set status = 'succeeded',
           paid_at = coalesce(paid_at, now()),
           subscription_id = v_sub
     where id = p_payment_id;
  end if;

  return v_sub;
end;
$$;

revoke all on function grant_annual_plan(uuid, uuid, uuid) from public;
grant execute on function grant_annual_plan(uuid, uuid, uuid) to authenticated;

comment on function grant_annual_plan(uuid, uuid, uuid) is
  'Activates or extends an annual plan after a bank transfer is confirmed. Admin only — checked inside, since security definer would otherwise hand this to anyone.';
