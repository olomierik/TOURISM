-- ===========================================================================
-- 089 — Selling leads
--
-- Owner's call, 14 November 2026: sell enquiries to operators the way
-- SafariBookings does, add a 10% marketing budget to published rates, and let
-- paying more rank an operator higher. This migration is the database half.
-- The 10% markup is applied in the query layer (lib/pricing/markup.ts) and
-- needs only the opt-out column below.
--
-- How a lead is sold
--
--   1. A traveller's enquiry is matched to operators exactly as before.
--   2. Each match gets a row in lead_offers, priced at that moment: the
--      operator's bid percentage of a trip value the site estimates from the
--      enquiry itself. Frozen there, so an operator cannot bid high to win
--      the slot and drop the bid before paying.
--   3. The operator sees the trip but not the traveller. Accepting spends
--      prepaid credit and unlocks the name, email, phone and conversation.
--      Declining before accepting costs nothing.
--
-- Why the price and the paid flag live in their own table
--
-- An operator can UPDATE their own lead_businesses row; that is how statuses
-- move. A paid flag or a price on that row would be one PostgREST call away
-- from free. lead_offers and lead_credit_ledger have no write policy for
-- anyone but an admin: rows appear only through the trigger and the accept
-- function below, both SECURITY DEFINER.
--
-- Why the contact details are withheld by the database
--
-- The dashboard reads the traveller through RLS (`leads_read_distributed`).
-- Hiding the fields in React would leave them one request away. So
-- lead_is_distributed_to_me now requires an unlocked offer, the message and
-- quote read policies require the same, and the locked view of a lead comes
-- from my_lead_teasers(), which returns the trip without the person.
--
-- Off until switched on
--
-- `lead_billing_enabled` is false. While it is false every new match is
-- created already unlocked at no charge, matching orders operators exactly as
-- it did before, and ranking_bid stays null — nothing an operator or a
-- traveller sees changes. Every existing match is backfilled as unlocked, so
-- turning billing on never re-locks a lead an operator already has. The
-- switch is a boolean in platform_settings, which the admin settings page
-- renders as a toggle.
-- ===========================================================================
begin;

-- ---------------------------------------------------------------------------
-- Settings. Numbers are deliberate starting points, changed by migration,
-- not guessed by a form: the admin page shows them read-only.
-- ---------------------------------------------------------------------------
insert into platform_settings (key, value, description) values
  ('lead_billing_enabled', 'false'::jsonb,
   'Sell enquiries. On: new matches are priced and locked until the operator accepts and pays from credit, and higher bids rank higher. Off: enquiries are free and matching ignores bids.'),
  ('lead_fee_percent_min', '1'::jsonb,
   'Lowest bid an operator may set, as a percentage of the estimated trip value.'),
  ('lead_fee_percent_max', '10'::jsonb,
   'Highest bid an operator may set, as a percentage of the estimated trip value.'),
  ('lead_fee_percent_default', '2'::jsonb,
   'Bid used for an operator who has not chosen one.'),
  ('lead_fee_min_usd', '5'::jsonb,
   'Floor on the price of one enquiry, in USD, whatever the estimate.'),
  ('lead_fee_max_usd', '120'::jsonb,
   'Ceiling on the price of one enquiry, in USD, whatever the estimate.'),
  ('lead_value_default_daily_usd', '300'::jsonb,
   'Per person, per day, used to value an enquiry that names no budget and no priced destination.')
on conflict (key) do nothing;

create or replace function setting_numeric(k text, fallback numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::numeric from platform_settings where key = k),
    fallback
  );
$$;

create or replace function lead_billing_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::boolean from platform_settings where key = 'lead_billing_enabled'),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- What an operator sets, and what the database derives from it.
-- ---------------------------------------------------------------------------
alter table businesses
  add column if not exists lead_bid_percent numeric(5,2)
    check (lead_bid_percent is null or (lead_bid_percent >= 0 and lead_bid_percent <= 100)),
  add column if not exists rate_markup_opt_out boolean not null default false,
  add column if not exists ranking_bid numeric(5,2);

comment on column businesses.lead_bid_percent is
  'The share of an enquiry''s estimated trip value the operator offers to pay for it. Clamped to the platform range when used. Higher ranks higher while lead billing is on.';
comment on column businesses.rate_markup_opt_out is
  'True when the operator has asked for their published rates to be shown without the 10% marketing budget.';
comment on column businesses.ranking_bid is
  'Derived, never written by a client: the clamped bid while lead billing is on and the operator holds credit, else null. Maintained by trigger so the directory can order by it.';

create index if not exists businesses_ranking_bid_idx
  on businesses (ranking_bid desc)
  where ranking_bid is not null;

-- ---------------------------------------------------------------------------
-- Prepaid credit. One signed row per movement; the balance is the sum.
-- ---------------------------------------------------------------------------
create table if not exists lead_credit_ledger (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses (id) on delete cascade,
  amount           numeric(10,2) not null check (amount <> 0),
  currency         char(3) not null default 'USD',
  kind             text not null check (kind in ('topup', 'lead_charge', 'refund', 'adjustment')),
  lead_business_id uuid references lead_businesses (id) on delete set null,
  payment_id       uuid references payments (id) on delete set null,
  note             text,
  created_by       uuid references profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  check (kind <> 'topup' or (payment_id is not null and amount > 0)),
  check (kind <> 'lead_charge' or amount < 0)
);

comment on table lead_credit_ledger is
  'Operator credit for buying enquiries. Top-ups come from a completed payment and are unique per payment, so a retried webhook cannot credit twice; charges are unique per lead, so an enquiry cannot be bought twice. Written only by the accept function, the payment webhook and admins.';

create index if not exists lead_credit_ledger_business_idx on lead_credit_ledger (business_id, created_at desc);
create unique index if not exists lead_credit_ledger_payment_uniq
  on lead_credit_ledger (payment_id) where payment_id is not null;
create unique index if not exists lead_credit_ledger_charge_uniq
  on lead_credit_ledger (lead_business_id) where kind = 'lead_charge';

alter table lead_credit_ledger enable row level security;
create policy lead_credit_ledger_read on lead_credit_ledger
  for select to authenticated using (owns_business(business_id) or is_admin());
create policy lead_credit_ledger_admin on lead_credit_ledger
  for all to authenticated using (is_admin()) with check (is_admin());
grant select on lead_credit_ledger to authenticated;
grant insert, update, delete on lead_credit_ledger to authenticated; -- admin policy only

create or replace function business_credit_balance(target uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0) from lead_credit_ledger where business_id = target;
$$;

-- ---------------------------------------------------------------------------
-- The price of one enquiry for one operator.
-- ---------------------------------------------------------------------------
create table if not exists lead_offers (
  lead_business_id uuid primary key references lead_businesses (id) on delete cascade,
  business_id      uuid not null references businesses (id) on delete cascade,
  estimated_value  numeric(10,2) not null default 0,
  fee_percent      numeric(5,2) not null default 0,
  fee_amount       numeric(10,2) not null default 0,
  currency         char(3) not null default 'USD',
  billable         boolean not null default false,
  unlocked_at      timestamptz,
  charge_id        uuid references lead_credit_ledger (id) on delete set null,
  created_at       timestamptz not null default now()
);

comment on table lead_offers is
  'One per match. Priced when the match is made and never repriced. unlocked_at is when the operator could first see the traveller: at match time for free enquiries, at acceptance for paid ones.';

create index if not exists lead_offers_locked_idx on lead_offers (business_id) where unlocked_at is null;

alter table lead_offers enable row level security;
create policy lead_offers_read on lead_offers
  for select to authenticated using (owns_business(business_id) or is_admin());
create policy lead_offers_admin on lead_offers
  for all to authenticated using (is_admin()) with check (is_admin());
grant select on lead_offers to authenticated;
grant insert, update, delete on lead_offers to authenticated; -- admin policy only

-- Every match that exists today stays exactly as visible as it is.
insert into lead_offers (lead_business_id, business_id, billable, unlocked_at, created_at)
select lb.id, lb.business_id, false, lb.sent_at, lb.sent_at
from lead_businesses lb
on conflict (lead_business_id) do nothing;

/**
 * What the trip is probably worth, from the enquiry alone.
 *
 * Never from anything the operator types: the moment an operator's own number
 * sets their invoice, every won lead becomes a lost one. SafariBookings
 * estimates for the same reason and says so in its agreement.
 *
 *   party   adults, plus children at half
 *   nights  the exact dates when the traveller gave a real range; otherwise
 *           seven. The wizard stores a chosen month as its first and last day
 *           and marks it flexible, so a month is not a 30-night safari.
 *   per day the traveller's own budget band when given — the wizard stores
 *           the per-person daily band times seven — else the destination's
 *           mid-range cost per person per day, else the platform default.
 */
create or replace function estimate_lead_value(target_lead uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l       leads%rowtype;
  party   numeric;
  nights  integer;
  per_day numeric;
begin
  select * into l from leads where id = target_lead;
  if not found then
    return 0;
  end if;

  party := greatest(1, coalesce(l.adults, 1) + 0.5 * coalesce(l.children, 0));

  if not l.dates_flexible
     and l.travel_start is not null
     and l.travel_end is not null
     and l.travel_end > l.travel_start
     and l.travel_end - l.travel_start <= 30 then
    nights := l.travel_end - l.travel_start;
  else
    nights := 7;
  end if;

  per_day := case
    when l.budget_min is not null and l.budget_max is not null then (l.budget_min + l.budget_max) / 2 / 7
    when l.budget_max is not null then l.budget_max / 7 * 0.8
    when l.budget_min is not null then l.budget_min / 7 * 1.25
  end;

  if per_day is null and l.destination_id is not null then
    select (dc.midrange_low + dc.midrange_high) / 2.0 into per_day
    from destination_costs dc
    where dc.destination_id = l.destination_id;
  end if;

  per_day := coalesce(per_day, setting_numeric('lead_value_default_daily_usd', 300));

  return round(party * nights * per_day, 2);
end;
$$;

create or replace function lead_fee_percent_for(target_business uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select least(
    setting_numeric('lead_fee_percent_max', 10),
    greatest(
      setting_numeric('lead_fee_percent_min', 1),
      coalesce(
        (select lead_bid_percent from businesses where id = target_business),
        setting_numeric('lead_fee_percent_default', 2)
      )
    )
  );
$$;

create or replace function lead_businesses_create_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  billing boolean := lead_billing_enabled();
  v       numeric := 0;
  pct     numeric := 0;
  fee     numeric := 0;
begin
  if billing then
    v   := estimate_lead_value(new.lead_id);
    pct := lead_fee_percent_for(new.business_id);
    fee := least(
      setting_numeric('lead_fee_max_usd', 120),
      greatest(setting_numeric('lead_fee_min_usd', 5), round(v * pct / 100, 2))
    );
  end if;

  insert into lead_offers (
    lead_business_id, business_id, estimated_value, fee_percent, fee_amount, billable, unlocked_at
  )
  values (
    new.id, new.business_id, v, pct, fee, billing, case when billing then null else now() end
  )
  on conflict (lead_business_id) do nothing;

  return new;
end;
$$;

drop trigger if exists lead_businesses_create_offer_trigger on lead_businesses;
create trigger lead_businesses_create_offer_trigger
  after insert on lead_businesses
  for each row execute function lead_businesses_create_offer();

-- True when the operator may see who the traveller is. A match with no offer
-- row predates this migration's backfill, which cannot happen, but if it ever
-- did the safe reading is the old behaviour rather than a lead nobody can open.
create or replace function lead_business_unlocked(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select unlocked_at is not null from lead_offers where lead_business_id = target),
    true
  );
$$;

-- ---------------------------------------------------------------------------
-- Withholding the traveller until the lead is bought.
-- ---------------------------------------------------------------------------
create or replace function lead_is_distributed_to_me(target_lead uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from lead_businesses lb
    join businesses b on b.id = lb.business_id
    where lb.lead_id = target_lead
      and b.owner_id = auth.uid()
      and b.deleted_at is null
      and lead_business_unlocked(lb.id)
  );
$$;

drop policy if exists lead_messages_read on lead_messages;
create policy lead_messages_read on lead_messages
  for select to authenticated
  using (
    exists (
      select 1 from lead_businesses lb
      where lb.id = lead_messages.lead_business_id
        and (
          (owns_business(lb.business_id) and lead_business_unlocked(lb.id))
          or lead_belongs_to_me(lb.lead_id)
        )
    )
    or is_admin()
  );

drop policy if exists lead_quotes_read on lead_quotes;
create policy lead_quotes_read on lead_quotes
  for select to authenticated
  using (
    exists (
      select 1 from lead_businesses lb
      where lb.id = lead_quotes.lead_business_id
        and (
          (owns_business(lb.business_id) and lead_business_unlocked(lb.id))
          or lead_belongs_to_me(lb.lead_id)
        )
    )
    or is_admin()
  );

-- A locked lead may be looked at and turned down. Anything else — responded,
-- quoted, won — would feed the response rate that ranking reads without the
-- lead ever having been bought.
create or replace function lead_businesses_guard_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_trusted_context() or is_admin() then
    return new;
  end if;

  if new.lead_id is distinct from old.lead_id
     or new.business_id is distinct from old.business_id
     or new.rank is distinct from old.rank
     or new.match_reason is distinct from old.match_reason
     or new.sent_at is distinct from old.sent_at then
    raise exception 'Lead distribution records cannot be rewritten'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status is distinct from old.status
     and new.status not in ('viewed', 'declined')
     and not lead_business_unlocked(new.id) then
    raise exception 'Accept this enquiry before replying to it'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

/**
 * The redacted copy of a traveller's message shown before a lead is bought.
 * People write "call me on +255 7…" into free text, and a teaser that carried
 * it would sell the lead for nothing.
 */
create or replace function redact_contact(body text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               coalesce(body, ''),
               '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email hidden]', 'g'),
             '\+?\d[\d\s().-]{6,}\d', '[number hidden]', 'g'),
           '(https?://|www\.)\S+', '[link hidden]', 'gi');
$$;

create or replace function my_lead_teasers()
returns table (
  lead_business_id  uuid,
  reference         text,
  destination_id    uuid,
  destination_other text,
  category_id       uuid,
  travel_start      date,
  travel_end        date,
  dates_flexible    boolean,
  adults            smallint,
  children          smallint,
  budget_min        numeric,
  budget_max        numeric,
  budget_currency   text,
  interests         text[],
  message           text,
  locale            text,
  quality_score     smallint,
  estimated_value   numeric,
  fee_percent       numeric,
  fee_amount        numeric,
  currency          text
)
language sql
stable
security definer
set search_path = public
as $$
  select lb.id, l.reference, l.destination_id, l.destination_other, l.category_id,
         l.travel_start, l.travel_end, l.dates_flexible, l.adults, l.children,
         l.budget_min, l.budget_max, l.budget_currency::text, l.interests,
         nullif(redact_contact(l.message), ''), l.locale, l.quality_score,
         o.estimated_value, o.fee_percent, o.fee_amount, o.currency::text
  from lead_businesses lb
  join lead_offers o on o.lead_business_id = lb.id
  join leads l on l.id = lb.lead_id
  join businesses b on b.id = lb.business_id
  where b.owner_id = auth.uid()
    and b.deleted_at is null
    and o.unlocked_at is null;
$$;

/**
 * Buys one lead. All or nothing, one at a time per operator.
 *
 * The business row is locked first so two tabs, or two quick taps, cannot
 * both see the same balance and both spend it.
 */
create or replace function accept_lead_offer(target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lb     lead_businesses%rowtype;
  o      lead_offers%rowtype;
  bal    numeric;
  charge uuid;
begin
  select * into lb from lead_businesses where id = target;
  if not found or not (owns_business(lb.business_id) or is_admin()) then
    return jsonb_build_object('ok', false, 'error', 'notAllowed');
  end if;

  perform 1 from businesses where id = lb.business_id for update;

  select * into o from lead_offers where lead_business_id = target for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'notAllowed');
  end if;
  if o.unlocked_at is not null then
    return jsonb_build_object('ok', true, 'already', true, 'fee', 0);
  end if;
  if lb.status = 'declined' then
    return jsonb_build_object('ok', false, 'error', 'declined');
  end if;

  bal := business_credit_balance(lb.business_id);
  if bal < o.fee_amount then
    return jsonb_build_object(
      'ok', false, 'error', 'insufficientCredit', 'fee', o.fee_amount, 'balance', bal
    );
  end if;

  if o.fee_amount > 0 then
    insert into lead_credit_ledger (
      business_id, amount, currency, kind, lead_business_id, created_by, note
    )
    values (
      lb.business_id, -o.fee_amount, o.currency, 'lead_charge', target, auth.uid(),
      (select 'Enquiry ' || reference from leads where id = lb.lead_id)
    )
    returning id into charge;
  end if;

  update lead_offers
     set unlocked_at = now(), charge_id = charge
   where lead_business_id = target;

  return jsonb_build_object('ok', true, 'fee', o.fee_amount, 'balance', bal - o.fee_amount);
end;
$$;

-- ---------------------------------------------------------------------------
-- Ranking: the bid, where the operator can actually pay it.
-- ---------------------------------------------------------------------------
create or replace function compute_ranking_bid(target uuid, bid numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lead_billing_enabled() and business_credit_balance(target) > 0 then
      least(
        setting_numeric('lead_fee_percent_max', 10),
        greatest(
          setting_numeric('lead_fee_percent_min', 1),
          coalesce(bid, setting_numeric('lead_fee_percent_default', 2))
        )
      )
  end;
$$;

-- Named to sort last among the BEFORE triggers, so whatever a client sent in
-- ranking_bid is overwritten after every other trigger has run.
create or replace function businesses_set_ranking_bid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.ranking_bid := case
    when new.owner_id is null then null
    else compute_ranking_bid(new.id, new.lead_bid_percent)
  end;
  return new;
end;
$$;

drop trigger if exists zz_businesses_ranking_bid on businesses;
create trigger zz_businesses_ranking_bid
  before insert or update on businesses
  for each row execute function businesses_set_ranking_bid();

-- Credit moving between empty and not empty changes eligibility.
create or replace function lead_credit_ledger_refresh_rank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  update businesses b
     set ranking_bid = compute_ranking_bid(b.id, b.lead_bid_percent)
   where b.id = target
     and b.ranking_bid is distinct from compute_ranking_bid(b.id, b.lead_bid_percent);
  return null;
end;
$$;

drop trigger if exists lead_credit_ledger_refresh_rank on lead_credit_ledger;
create trigger lead_credit_ledger_refresh_rank
  after insert or update or delete on lead_credit_ledger
  for each row execute function lead_credit_ledger_refresh_rank();

-- Flipping billing, or moving the bid range, re-derives every claimed listing.
create or replace function platform_settings_refresh_rank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.key in ('lead_billing_enabled', 'lead_fee_percent_min', 'lead_fee_percent_max',
                 'lead_fee_percent_default') then
    update businesses b
       set ranking_bid = compute_ranking_bid(b.id, b.lead_bid_percent)
     where b.owner_id is not null
       and b.ranking_bid is distinct from compute_ranking_bid(b.id, b.lead_bid_percent);
  end if;
  return null;
end;
$$;

drop trigger if exists platform_settings_refresh_rank on platform_settings;
create trigger platform_settings_refresh_rank
  after insert or update on platform_settings
  for each row execute function platform_settings_refresh_rank();

-- ---------------------------------------------------------------------------
-- Matching. The live definition (071, as amended), with the bid added. While
-- billing is off `has_credit` and `bid_score` are constant, so the order is
-- exactly what it was.
--
-- With billing on, after reachability and paid Featured placement:
--
--   1. operators holding credit, ahead of those holding none — a lead offered
--      to someone who cannot buy it is a lead nobody answers;
--   2. bid_score = bid% × (1 + quality), quality being half response rate and
--      half rating weighted by how many reviews stand behind it. Money is the
--      stated main factor, and quality multiplies it rather than being
--      replaced by it;
--   3. then the old keys, plan priority first.
--
-- Credit also clears the paid-tier gate on strong leads, as a boost does: it
-- is a payment.
-- ---------------------------------------------------------------------------
create or replace function match_lead_to_businesses(target_lead uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  lead_row       leads%rowtype;
  max_matches    integer;
  premium_only_threshold integer;
  restrict_to_paid boolean;
  billing        boolean := lead_billing_enabled();
  bid_min        numeric := setting_numeric('lead_fee_percent_min', 1);
  bid_max        numeric := setting_numeric('lead_fee_percent_max', 10);
  bid_default    numeric := setting_numeric('lead_fee_percent_default', 2);
  distributed    integer := 0;
  topped_up      integer := 0;
begin
  select * into lead_row from leads where id = target_lead;
  if not found then
    raise exception 'Lead % not found', target_lead;
  end if;

  if exists (select 1 from lead_businesses where lead_id = target_lead) then
    return 0;
  end if;

  select coalesce((value #>> '{}')::integer, 5) into max_matches
  from platform_settings where key = 'lead_distribution_limit';

  select coalesce((value #>> '{}')::integer, 60) into premium_only_threshold
  from platform_settings where key = 'lead_min_quality_for_premium';

  restrict_to_paid := lead_row.quality_score >= premium_only_threshold;

  with credit as (
    select business_id, sum(amount) as balance
    from lead_credit_ledger
    group by business_id
  ),
  eligible as (
    select
      b.id,
      coalesce(p.lead_priority, 300) as plan_priority,
      has_live_boost(b.id) as is_featured,
      (b.email is not null or b.owner_id is not null) as reachable,
      coalesce(b.response_rate, 0) as response_rate,
      b.rating_avg,
      b.rating_count,
      b.tier,
      (billing and coalesce(cr.balance, 0) > 0) as has_credit,
      case when billing then
        least(bid_max, greatest(bid_min, coalesce(b.lead_bid_percent, bid_default)))
        * (1
           + 0.5 * least(1, coalesce(b.response_rate, 0) / 100.0)
           + 0.5 * (coalesce(b.rating_avg, 0) / 5.0) * (least(coalesce(b.rating_count, 0), 10) / 10.0))
      else 0 end as bid_score,
      jsonb_strip_nulls(jsonb_build_object(
        'destination', case when lead_row.destination_id is not null
          and exists (select 1 from business_destinations bd
                      where bd.business_id = b.id and bd.destination_id = lead_row.destination_id)
          then true end,
        'category', case when lead_row.category_id is not null
          and exists (select 1 from business_categories bc
                      where bc.business_id = b.id and bc.category_id = lead_row.category_id)
          then true end,
        'featured', case when has_live_boost(b.id) then true end,
        'featured_reach', case when has_unscoped_boost(b.id)
          and (
            (lead_row.destination_id is not null
              and not exists (select 1 from business_destinations bd where bd.business_id = b.id))
            or (lead_row.category_id is not null
              and not exists (select 1 from business_categories bc where bc.business_id = b.id))
          )
          then true end,
        'bid_percent', case when billing then
          least(bid_max, greatest(bid_min, coalesce(b.lead_bid_percent, bid_default))) end,
        'tier', b.tier::text,
        'quality_score', lead_row.quality_score
      )) as match_reason
    from businesses b
    left join subscriptions s on s.business_id = b.id and s.status = 'active'
    left join subscription_plans p on p.id = s.plan_id
    left join credit cr on cr.business_id = b.id
    where b.status = 'approved'
      and b.deleted_at is null
      and (
        lead_row.destination_id is null
        or exists (
          select 1 from business_destinations bd
          where bd.business_id = b.id and bd.destination_id = lead_row.destination_id
        )
        or (
          has_unscoped_boost(b.id)
          and not exists (select 1 from business_destinations bd where bd.business_id = b.id)
          and b.country_code = (
            select d.country_code from destinations d where d.id = lead_row.destination_id
          )
        )
      )
      and (
        lead_row.category_id is null
        or exists (
          select 1 from business_categories bc
          where bc.business_id = b.id and bc.category_id = lead_row.category_id
        )
        or (
          has_unscoped_boost(b.id)
          and not exists (select 1 from business_categories bc where bc.business_id = b.id)
        )
      )
      and business_has_lead_capacity(b.id)
      and (
        not restrict_to_paid
        or b.tier <> 'free'
        or has_live_boost(b.id)
        or (billing and coalesce(cr.balance, 0) > 0)
      )
  ),
  ranked as (
    select
      id,
      match_reason,
      row_number() over (
        order by
          reachable desc,
          is_featured desc,
          has_credit desc,
          bid_score desc,
          plan_priority asc,
          response_rate desc,
          rating_avg desc,
          rating_count desc,
          random()
      ) as rank
    from eligible
  )
  insert into lead_businesses (lead_id, business_id, rank, match_reason)
  select target_lead, id, rank::smallint, match_reason
  from ranked
  where rank <= max_matches;

  get diagnostics distributed = row_count;

  if distributed < max_matches and restrict_to_paid then
    with credit as (
      select business_id, sum(amount) as balance
      from lead_credit_ledger
      group by business_id
    ),
    eligible as (
      select b.id,
             coalesce(p.lead_priority, 300) as plan_priority,
             has_live_boost(b.id) as is_featured,
             (b.email is not null or b.owner_id is not null) as reachable,
             coalesce(b.response_rate, 0) as response_rate, b.rating_avg, b.rating_count,
             (billing and coalesce(cr.balance, 0) > 0) as has_credit,
             case when billing then
               least(bid_max, greatest(bid_min, coalesce(b.lead_bid_percent, bid_default)))
               * (1
                  + 0.5 * least(1, coalesce(b.response_rate, 0) / 100.0)
                  + 0.5 * (coalesce(b.rating_avg, 0) / 5.0) * (least(coalesce(b.rating_count, 0), 10) / 10.0))
             else 0 end as bid_score
      from businesses b
      left join subscriptions s on s.business_id = b.id and s.status = 'active'
      left join subscription_plans p on p.id = s.plan_id
      left join credit cr on cr.business_id = b.id
      where b.status = 'approved'
        and b.deleted_at is null
        and (
          lead_row.destination_id is null
          or exists (select 1 from business_destinations bd
                     where bd.business_id = b.id and bd.destination_id = lead_row.destination_id)
          or (
            has_unscoped_boost(b.id)
            and not exists (select 1 from business_destinations bd where bd.business_id = b.id)
            and b.country_code = (
              select d.country_code from destinations d where d.id = lead_row.destination_id
            )
          )
        )
        and (
          lead_row.category_id is null
          or exists (select 1 from business_categories bc
                     where bc.business_id = b.id and bc.category_id = lead_row.category_id)
          or (
            has_unscoped_boost(b.id)
            and not exists (select 1 from business_categories bc where bc.business_id = b.id)
          )
        )
        and business_has_lead_capacity(b.id)
        and not exists (
          select 1 from lead_businesses lb
          where lb.lead_id = target_lead and lb.business_id = b.id
        )
    ),
    ranked as (
      select id, row_number() over (
        order by reachable desc, is_featured desc, has_credit desc, bid_score desc,
                 plan_priority asc, response_rate desc, rating_avg desc, rating_count desc, random()
      ) as rank
      from eligible
    )
    insert into lead_businesses (lead_id, business_id, rank, match_reason)
    select target_lead, id, (rank + distributed)::smallint,
           jsonb_build_object('fallback', true, 'quality_score', lead_row.quality_score)
    from ranked
    where rank <= max_matches - distributed;

    get diagnostics topped_up = row_count;
    distributed := distributed + topped_up;
  end if;

  insert into notifications (profile_id, kind, lead_id, business_id, payload)
  select b.owner_id, 'lead_new', target_lead, b.id,
         jsonb_build_object(
           'reference', lead_row.reference,
           'destination_id', lead_row.destination_id,
           'quality_score', lead_row.quality_score
         )
  from lead_businesses lb
  join businesses b on b.id = lb.business_id
  where lb.lead_id = target_lead
    and b.owner_id is not null;

  update leads
  set status = case when distributed > 0 then 'distributed'::lead_status else status end,
      distributed_at = case when distributed > 0 then now() else distributed_at end
  where id = target_lead;

  insert into lead_events (lead_id, event, detail)
  values (
    target_lead,
    'distributed',
    jsonb_build_object(
      'count', distributed,
      'restricted_to_paid', restrict_to_paid,
      'topped_up', topped_up,
      'quality_score', lead_row.quality_score,
      'billing', billing
    )
  );

  return distributed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what. Postgres grants EXECUTE to PUBLIC by default, which on
-- Supabase means every function here would be an RPC endpoint for anon.
-- ---------------------------------------------------------------------------
revoke execute on function match_lead_to_businesses(uuid) from public, anon, authenticated;
grant  execute on function match_lead_to_businesses(uuid) to service_role;

revoke execute on function setting_numeric(text, numeric)          from public, anon, authenticated;
revoke execute on function business_credit_balance(uuid)           from public, anon, authenticated;
revoke execute on function estimate_lead_value(uuid)               from public, anon, authenticated;
revoke execute on function lead_fee_percent_for(uuid)              from public, anon, authenticated;
revoke execute on function compute_ranking_bid(uuid, numeric)      from public, anon, authenticated;
revoke execute on function lead_businesses_create_offer()          from public, anon, authenticated;
revoke execute on function businesses_set_ranking_bid()            from public, anon, authenticated;
revoke execute on function lead_credit_ledger_refresh_rank()       from public, anon, authenticated;
revoke execute on function platform_settings_refresh_rank()        from public, anon, authenticated;

-- Read by RLS policies as the caller, so the caller must be able to run them.
revoke execute on function lead_business_unlocked(uuid) from public, anon;
grant  execute on function lead_business_unlocked(uuid) to authenticated;
revoke execute on function lead_billing_enabled()       from public, anon;
grant  execute on function lead_billing_enabled()       to authenticated;

revoke execute on function my_lead_teasers()      from public, anon;
grant  execute on function my_lead_teasers()      to authenticated;
revoke execute on function accept_lead_offer(uuid) from public, anon;
grant  execute on function accept_lead_offer(uuid) to authenticated;

do $$
declare
  missing integer;
begin
  select count(*) into missing
  from lead_businesses lb
  where not exists (select 1 from lead_offers o where o.lead_business_id = lb.id);
  if missing > 0 then
    raise exception '089: % existing match(es) have no offer row', missing;
  end if;

  if exists (select 1 from lead_offers where unlocked_at is null) then
    raise exception '089: the backfill left a lead locked';
  end if;
end $$;

commit;
