-- ===========================================================================
-- 004 — Businesses
--
-- Unlike destinations and categories, the slug lives on the base row: a business
-- name is a proper noun and should not change per locale. Only the URL *segment*
-- is localized (/business/… vs /anbieter/…), which routing handles.
-- ===========================================================================

create table businesses (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references profiles(id) on delete set null,

  name           text not null,
  slug           text not null unique,
  legal_name     text,

  status         business_status   not null default 'draft',
  tier           subscription_tier not null default 'free',

  -- Verification is a manual trust decision by an admin, deliberately separate
  -- from `status`: an approved business is visible, a verified one is vouched for.
  is_verified    boolean not null default false,
  verified_at    timestamptz,
  verified_by    uuid references profiles(id) on delete set null,

  logo_url         text,
  cover_image_url  text,

  email          citext,
  phone          text,
  whatsapp       text,
  website        text,

  address        text,
  city           text,
  latitude       numeric(9, 6),
  longitude      numeric(9, 6),

  founded_year   smallint,
  team_size      smallint,
  -- Tanzania Tourist Board / TALA licence number, shown on verified profiles.
  license_number text,

  -- Denormalized aggregates. Recomputed by trigger on review insert/update so the
  -- directory can sort by rating without a correlated subquery per row.
  rating_avg     numeric(3, 2) not null default 0,
  rating_count   integer       not null default 0,

  -- Trust signals that also give premium tiers something real to sell. Maintained
  -- by the lead pipeline in 012.
  response_rate       numeric(5, 2),
  avg_response_minutes integer,

  is_demo        boolean not null default false,

  submitted_at   timestamptz,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint businesses_lat_valid check (latitude is null or latitude between -90 and 90),
  constraint businesses_lng_valid check (longitude is null or longitude between -180 and 180),
  constraint businesses_rating_range check (rating_avg between 0 and 5),
  constraint businesses_website_scheme check (website is null or website ~* '^https?://')
);

-- The directory's default query: approved, not deleted, best first.
create index businesses_public_idx
  on businesses (status, tier desc, rating_avg desc)
  where deleted_at is null and status = 'approved';

create index businesses_owner_idx on businesses (owner_id) where deleted_at is null;
create index businesses_status_idx on businesses (status) where deleted_at is null;
create index businesses_verified_idx on businesses (is_verified) where deleted_at is null and status = 'approved';
-- Typo-tolerant name lookup for the search box.
create index businesses_name_trgm_idx on businesses using gin (name gin_trgm_ops);

create trigger businesses_set_updated_at
  before update on businesses
  for each row execute function set_updated_at();

-- Stamp the lifecycle timestamps rather than trusting callers to remember.
create or replace function businesses_stamp_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'pending' and new.submitted_at is null then
      new.submitted_at = now();
    end if;
    if new.status = 'approved' and new.published_at is null then
      new.published_at = now();
    end if;
  end if;

  if new.is_verified and not old.is_verified then
    new.verified_at = now();
  elsif not new.is_verified and old.is_verified then
    new.verified_at = null;
    new.verified_by = null;
  end if;

  return new;
end;
$$;

create trigger businesses_stamp_status_trigger
  before update on businesses
  for each row execute function businesses_stamp_status();

-- ---------------------------------------------------------------------------
-- Business translations
-- ---------------------------------------------------------------------------
create table business_translations (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  locale        text not null references locales(code) on delete cascade,

  tagline           text,
  short_description text,
  description       text,

  seo_title       text,
  seo_description text,

  -- Owners write in one language; other locales may be machine-translated and
  -- await review. Surfacing that distinction keeps unreviewed copy out of SEO
  -- metadata if we later choose to.
  is_machine_translated boolean not null default false,
  reviewed_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (business_id, locale)
);

create index business_tr_locale_idx on business_translations (locale);

create trigger business_translations_set_updated_at
  before update on business_translations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- What a business does, and where
--
-- These two junctions drive both the directory filters and lead matching, so
-- they carry `is_primary` — the category/destination a business leads with when
-- it must be shown as belonging to exactly one.
-- ---------------------------------------------------------------------------
create table business_categories (
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  is_primary  boolean not null default false,
  primary key (business_id, category_id)
);

create index business_categories_category_idx on business_categories (category_id);
-- At most one primary category per business.
create unique index business_categories_one_primary
  on business_categories (business_id) where is_primary;

create table business_destinations (
  business_id    uuid not null references businesses(id) on delete cascade,
  destination_id uuid not null references destinations(id) on delete cascade,
  is_primary     boolean not null default false,
  primary key (business_id, destination_id)
);

create index business_destinations_destination_idx on business_destinations (destination_id);
create unique index business_destinations_one_primary
  on business_destinations (business_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Services — lighter than packages: a named capability, optionally priced.
-- ---------------------------------------------------------------------------
create table business_services (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  price_from   numeric(12, 2),
  currency     char(3) not null default 'USD',
  sort_order   smallint not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint business_services_price_positive check (price_from is null or price_from >= 0)
);

create index business_services_business_idx on business_services (business_id) where is_active;

create trigger business_services_set_updated_at
  before update on business_services
  for each row execute function set_updated_at();

create table business_service_translations (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references business_services(id) on delete cascade,
  locale      text not null references locales(code) on delete cascade,
  name        text not null,
  description text,
  unique (service_id, locale)
);
