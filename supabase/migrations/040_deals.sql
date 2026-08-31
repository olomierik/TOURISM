-- ===========================================================================
-- 040 — Deals, without the thing that makes deals worthless
--
-- Every directory that adds offers arrives at the same place: a permanent
-- "was $1,200, now $890" where nobody ever paid $1,200, a "limited time" that
-- has run for two years, and a catalogue where everything is discounted so
-- nothing is. The feature is easy; not poisoning the price signal is the work.
--
-- Four rules, enforced here rather than trusted to whoever writes the form:
--
--   1. An operator cannot type a reference price. Where a deal names a package,
--      the "was" is that package's own published price_from — a number already
--      on the site, which travellers can see, and which the operator cannot
--      inflate for the occasion without also raising their public price.
--
--   2. A deal with no package makes no price claim at all. Not every offer is a
--      discount ("free airport transfer", "third night free"), and the moment
--      an unanchored percentage is allowed, that is the only kind anyone
--      writes. So: name a package and the maths is checkable, or describe what
--      is included and claim no number.
--
--   3. Deals end. ends_at is required, must be in the future when created, and
--      cannot be more than a year out. A permanent discount is a price.
--
--   4. Three at a time per operator. Without a cap, the honest move for any
--      operator is to discount their whole catalogue permanently, at which
--      point a badge on every card tells a reader nothing.
--
-- Gated to paying tiers, which is the point: this is a reason to claim a
-- listing and subscribe, on a site where 1,328 of 1,329 listings are unclaimed.
-- ===========================================================================

create table deals (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,

  -- Optional, and load-bearing when present: it is where the reference price
  -- comes from. Must belong to the same business — checked by trigger, since a
  -- composite foreign key would mean carrying business_id on packages twice.
  package_id  uuid references packages(id) on delete cascade,

  -- The offer price, per the package's own unit and currency. Null for an
  -- offer that is not a discount.
  deal_price  numeric(12, 2),

  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,

  is_active   boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint deals_dates_ordered check (ends_at > starts_at),
  constraint deals_not_forever check (ends_at <= starts_at + interval '1 year'),

  -- Rule 2, in its simplest form: a price claim requires something to claim it
  -- against.
  constraint deals_price_needs_package check (deal_price is null or package_id is not null),
  constraint deals_price_positive check (deal_price is null or deal_price > 0)
);

create index deals_business on deals (business_id) where is_active;
create index deals_live on deals (ends_at) where is_active;

-- ---------------------------------------------------------------------------
-- Text, per locale. The headline is what a card shows; terms are the small
-- print that stops a deal being a bait line.
-- ---------------------------------------------------------------------------
create table deal_translations (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references deals(id) on delete cascade,
  locale     text not null references locales(code),

  headline   text not null,
  -- What is actually included or required: minimum nights, travel window,
  -- group size. Required, because "20% off" without conditions is not an offer
  -- an operator can honour or a traveller can check.
  terms      text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (deal_id, locale),
  constraint deal_headline_length check (length(btrim(headline)) between 8 and 90),
  constraint deal_terms_substantial check (length(btrim(terms)) >= 30)
);

-- ---------------------------------------------------------------------------
-- The rules that need to look at other rows.
-- ---------------------------------------------------------------------------
create or replace function deals_guard()
returns trigger
language plpgsql
as $$
declare
  v_pkg_business uuid;
  v_pkg_price    numeric(12, 2);
  v_tier         subscription_tier;
  v_live         int;
begin
  -- A deal on somebody else's package would show their trip at your price.
  if new.package_id is not null then
    select business_id, price_from into v_pkg_business, v_pkg_price
      from packages where id = new.package_id;

    if v_pkg_business is distinct from new.business_id then
      raise exception 'a deal must be on the operator''s own package'
        using errcode = 'check_violation';
    end if;

    -- Rule 1. The reference price is the package's, and a "deal" at or above
    -- it is not one.
    if new.deal_price is not null then
      if v_pkg_price is null then
        raise exception 'cannot discount a package with no published price'
          using errcode = 'check_violation';
      end if;
      if new.deal_price >= v_pkg_price then
        raise exception 'the deal price must be below the published price'
          using errcode = 'check_violation';
      end if;
      -- A 97%-off safari is a typo or a lie, and either way it should not
      -- reach a reader. A 3% one is noise dressed as an offer.
      if new.deal_price > v_pkg_price * 0.95 then
        raise exception 'a discount under 5%% is not worth publishing'
          using errcode = 'check_violation';
      end if;
      if new.deal_price < v_pkg_price * 0.30 then
        raise exception 'a discount over 70%% needs an admin, not a form'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  -- Rule 3, the half a check constraint cannot express: now() is not immutable.
  if tg_op = 'INSERT' and new.ends_at <= now() then
    raise exception 'a deal cannot end in the past' using errcode = 'check_violation';
  end if;

  -- Paying tiers only.
  select p.tier into v_tier
    from subscriptions s
    join subscription_plans p on p.id = s.plan_id
   where s.business_id = new.business_id and s.status = 'active'
   order by p.sort_order desc
   limit 1;

  if coalesce(v_tier, 'free') = 'free' then
    raise exception 'deals require a paid plan' using errcode = 'insufficient_privilege';
  end if;

  -- Rule 4.
  if new.is_active then
    select count(*) into v_live
      from deals d
     where d.business_id = new.business_id
       and d.is_active
       and d.ends_at > now()
       and d.id is distinct from new.id;
    if v_live >= 3 then
      raise exception 'three live deals at a time is the limit'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger deals_guard_trigger
  before insert or update on deals
  for each row execute function deals_guard();

create trigger deals_touch
  before update on deals
  for each row execute function set_updated_at();

create trigger deal_translations_touch
  before update on deal_translations
  for each row execute function set_updated_at();

alter table deals enable row level security;
alter table deal_translations enable row level security;

-- Public reads only live deals. An expired one does not render as "expired" —
-- it stops existing as far as the site is concerned, because a page full of
-- dead offers is worse than a page with none.
create policy deals_public_read on deals
  for select to anon, authenticated
  using (is_active and starts_at <= now() and ends_at > now());

create policy deals_owner_all on deals
  for all to authenticated
  using (exists (
    select 1 from businesses b
     where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (
    select 1 from businesses b
     where b.id = business_id and b.owner_id = (select auth.uid())));

create policy deals_admin_all on deals
  for all to authenticated using (is_admin()) with check (is_admin());

create policy deal_translations_public_read on deal_translations
  for select to anon, authenticated using (true);

create policy deal_translations_owner_all on deal_translations
  for all to authenticated
  using (exists (
    select 1 from deals d join businesses b on b.id = d.business_id
     where d.id = deal_id and b.owner_id = (select auth.uid())))
  with check (exists (
    select 1 from deals d join businesses b on b.id = d.business_id
     where d.id = deal_id and b.owner_id = (select auth.uid())));

create policy deal_translations_admin_all on deal_translations
  for all to authenticated using (is_admin()) with check (is_admin());

comment on table deals is
  'Time-limited operator offers. A price claim requires a package to anchor it, so no operator can invent the number they are discounting from.';
comment on column deals.package_id is
  'Where the reference price comes from. Without it the deal may describe what is included but may not claim a discount.';
