-- ===========================================================================
-- 008 — Monetization
--
-- Plans, subscriptions, payments, featured placement and lead credits.
--
-- No table here references a payment provider's data shape. Provider-specific
-- identifiers live in `provider` + `provider_ref` + a `raw` jsonb, so swapping
-- Flutterwave for another processor — or running two at once for cards and
-- mobile money — is a service-layer concern, not a migration.
-- ===========================================================================

create table subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  tier          subscription_tier not null,

  price_monthly numeric(12, 2) not null default 0,
  price_yearly  numeric(12, 2),
  currency      char(3) not null default 'USD',

  -- Entitlements as data, not code. Adding a limit must not require a deploy.
  max_packages      smallint,
  max_gallery_images smallint,
  max_services      smallint,
  -- How many leads this tier may receive per month; null = unlimited.
  monthly_lead_quota smallint,
  -- Distribution priority: lower sorts first, so tier 1 sees a lead before tier 3.
  lead_priority     smallint not null default 100,

  can_be_featured   boolean not null default false,
  has_analytics     boolean not null default false,
  shows_contact_details boolean not null default true,

  is_active     boolean not null default true,
  sort_order    smallint not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint plans_price_nonneg check (price_monthly >= 0)
);

create trigger subscription_plans_set_updated_at
  before update on subscription_plans
  for each row execute function set_updated_at();

create table subscription_plan_translations (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references subscription_plans(id) on delete cascade,
  locale      text not null references locales(code) on delete cascade,
  name        text not null,
  description text,
  -- Marketing bullets, ordered.
  features    text[] not null default '{}',
  unique (plan_id, locale)
);

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
create table subscriptions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  plan_id      uuid not null references subscription_plans(id) on delete restrict,

  status       subscription_status not null default 'active',

  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at  timestamptz,

  -- Provider-agnostic linkage. Null while an admin is activating manually.
  provider     text,
  provider_ref text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- A business has at most one live subscription; history is kept via the
-- non-active rows.
create unique index subscriptions_one_active
  on subscriptions (business_id) where status = 'active';
create index subscriptions_business_idx on subscriptions (business_id, status);
create index subscriptions_period_end_idx on subscriptions (current_period_end)
  where status = 'active';

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- Keep businesses.tier in step with the live subscription so directory ranking
-- never has to join through subscriptions on the hot path.
create or replace function sync_business_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
  resolved subscription_tier;
begin
  select p.tier into resolved
  from subscriptions s
  join subscription_plans p on p.id = s.plan_id
  where s.business_id = target and s.status = 'active'
  limit 1;

  update businesses
  set tier = coalesce(resolved, 'free')
  where id = target;

  return null;
end;
$$;

create trigger subscriptions_sync_tier
  after insert or update or delete on subscriptions
  for each row execute function sync_business_tier();

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table payments (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,

  amount        numeric(12, 2) not null,
  currency      char(3) not null default 'USD',
  status        payment_status not null default 'pending',

  provider      text not null default 'manual',
  provider_ref  text,
  -- Mobile money matters here: 'card', 'mpesa', 'tigopesa', 'airtel', 'manual'.
  method        text,

  -- Untouched provider payload, for reconciliation and dispute handling.
  raw           jsonb not null default '{}'::jsonb,

  paid_at       timestamptz,
  failed_reason text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint payments_amount_positive check (amount >= 0)
);

create index payments_business_idx on payments (business_id, created_at desc);
create index payments_status_idx on payments (status);
-- Idempotency: a provider must never be able to double-credit a transaction.
create unique index payments_provider_ref_unique
  on payments (provider, provider_ref) where provider_ref is not null;

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Featured placement
--
-- Time-boxed and slot-scoped rather than a boolean on businesses, so a slot can
-- be sold for a fixed window and expire without anyone remembering to switch it off.
-- ---------------------------------------------------------------------------
create table featured_listings (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,

  -- Where the placement applies. Null = site-wide.
  destination_id uuid references destinations(id) on delete cascade,
  category_id    uuid references categories(id) on delete cascade,

  placement     text not null default 'directory',
  -- Lower sorts first within the same placement.
  priority      smallint not null default 100,

  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,

  payment_id    uuid references payments(id) on delete set null,
  created_by    uuid references profiles(id) on delete set null,

  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint featured_window_ordered check (ends_at is null or ends_at > starts_at),
  constraint featured_placement_valid check (placement in ('homepage', 'directory', 'destination', 'category', 'search'))
);

create index featured_active_idx
  on featured_listings (placement, priority, starts_at)
  where is_active;
create index featured_business_idx on featured_listings (business_id);

create trigger featured_listings_set_updated_at
  before update on featured_listings
  for each row execute function set_updated_at();

-- Whether a placement is live right now.
create or replace function featured_is_live(f featured_listings)
returns boolean
language sql
immutable
as $$
  select f.is_active
     and f.starts_at <= now()
     and (f.ends_at is null or f.ends_at > now());
$$;

-- ---------------------------------------------------------------------------
-- Lead credits — pay-per-lead, for operators who do not want a subscription.
-- ---------------------------------------------------------------------------
create table lead_credits (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  -- Positive on purchase, negative on consumption; balance is the running sum.
  delta        integer not null,
  reason       text not null,
  lead_id      uuid references leads(id) on delete set null,
  payment_id   uuid references payments(id) on delete set null,
  created_at   timestamptz not null default now(),

  constraint lead_credits_delta_nonzero check (delta <> 0)
);

create index lead_credits_business_idx on lead_credits (business_id, created_at desc);

create or replace function lead_credit_balance(target uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(delta), 0)::integer
  from lead_credits
  where business_id = target;
$$;

-- ---------------------------------------------------------------------------
-- Default plans
--
-- Prices are placeholders for the admin to set; the structure is what matters.
-- ---------------------------------------------------------------------------
insert into subscription_plans
  (key, tier, price_monthly, price_yearly, max_packages, max_gallery_images,
   max_services, monthly_lead_quota, lead_priority, can_be_featured,
   has_analytics, sort_order)
values
  ('free',     'free',      0,   0,    2,  5,  3,   5, 300, false, false, 1),
  ('premium',  'premium',  49, 490,   20, 30, 20,  50, 200, true,  true,  2),
  ('featured', 'featured', 149, 1490, null, 60, null, null, 100, true, true, 3);

insert into subscription_plan_translations (plan_id, locale, name, description, features)
select p.id, 'en', t.name, t.description, t.features
from subscription_plans p
join (values
  ('free', 'Free', 'Get listed and start receiving enquiries.',
    array['Public profile', 'Up to 2 packages', '5 gallery images', 'Up to 5 leads per month']),
  ('premium', 'Premium', 'More visibility, more packages, priority on new enquiries.',
    array['Everything in Free', 'Up to 20 packages', '30 gallery images', 'Up to 50 leads per month', 'Priority lead access', 'Profile analytics', 'Eligible for featured placement']),
  ('featured', 'Featured', 'Top placement and unlimited enquiries.',
    array['Everything in Premium', 'Unlimited packages', '60 gallery images', 'Unlimited leads', 'First access to new enquiries', 'Featured placement across the site'])
) as t(key, name, description, features) on t.key = p.key;
