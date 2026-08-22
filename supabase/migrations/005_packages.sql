-- ===========================================================================
-- 005 — Packages
--
-- The commercial unit travelers actually compare: a named, priced, dated trip.
-- Prices are stored in a single currency per package (what the operator quotes
-- in) and converted for display, rather than duplicating rows per currency.
-- ===========================================================================

create table packages (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,

  slug          text not null unique,

  -- Nights is the honest unit for safaris; days is derived for display but stored
  -- because operators advertise "3 days / 2 nights" and the pair is not always n+1.
  duration_days   smallint,
  duration_nights smallint,

  price_from    numeric(12, 2),
  currency      char(3) not null default 'USD',
  -- Almost always per person for safaris, but transfers and car hire are per group.
  price_unit    text not null default 'per_person',

  max_group_size smallint,
  min_travelers  smallint,

  cover_image_url text,

  status        content_status not null default 'draft',
  is_featured   boolean not null default false,
  is_demo       boolean not null default false,

  sort_order    smallint not null default 0,

  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint packages_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint packages_price_positive check (price_from is null or price_from >= 0),
  constraint packages_duration_positive check (duration_days is null or duration_days > 0),
  constraint packages_price_unit_valid check (price_unit in ('per_person', 'per_group', 'per_day', 'per_vehicle'))
);

create index packages_business_idx on packages (business_id) where deleted_at is null;
create index packages_public_idx
  on packages (status, is_featured desc, price_from)
  where deleted_at is null and status = 'published';

create trigger packages_set_updated_at
  before update on packages
  for each row execute function set_updated_at();

create or replace function packages_stamp_published()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger packages_stamp_published_trigger
  before insert or update on packages
  for each row execute function packages_stamp_published();

create table package_translations (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references packages(id) on delete cascade,
  locale        text not null references locales(code) on delete cascade,

  title         text not null,
  summary       text,
  description   text,
  itinerary     text,

  seo_title       text,
  seo_description text,

  is_machine_translated boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (package_id, locale)
);

create index package_tr_locale_idx on package_translations (locale);

create trigger package_translations_set_updated_at
  before update on package_translations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Inclusions / exclusions
--
-- Modelled as rows rather than free text because "what's included" is the single
-- most common source of dispute in safari pricing, and rows let the comparison
-- view line packages up against each other item by item.
-- ---------------------------------------------------------------------------
create table package_inclusions (
  id          uuid primary key default gen_random_uuid(),
  package_id  uuid not null references packages(id) on delete cascade,
  is_included boolean not null default true,   -- false = explicitly excluded
  sort_order  smallint not null default 0
);

create index package_inclusions_package_idx on package_inclusions (package_id);

create table package_inclusion_translations (
  id           uuid primary key default gen_random_uuid(),
  inclusion_id uuid not null references package_inclusions(id) on delete cascade,
  locale       text not null references locales(code) on delete cascade,
  label        text not null,
  unique (inclusion_id, locale)
);

-- Which destinations a package actually visits — drives the destination pages
-- and lead matching.
create table package_destinations (
  package_id     uuid not null references packages(id) on delete cascade,
  destination_id uuid not null references destinations(id) on delete cascade,
  sort_order     smallint not null default 0,
  primary key (package_id, destination_id)
);

create index package_destinations_destination_idx on package_destinations (destination_id);

create table package_categories (
  package_id  uuid not null references packages(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (package_id, category_id)
);

create index package_categories_category_idx on package_categories (category_id);
