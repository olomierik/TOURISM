-- ===========================================================================
-- 003 — Taxonomy: destinations and categories
--
-- Both follow the same shape: a base row holding locale-independent facts
-- (coordinates, ordering, imagery) plus one translation row per locale holding
-- everything a search engine reads.
--
-- Slugs live on the TRANSLATION, not the base row. /de/reiseziele/ngorongoro-krater
-- and /it/destinazioni/cratere-di-ngorongoro should be able to differ — that is
-- most of the point of running four locales.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Destinations
-- ---------------------------------------------------------------------------
create table destinations (
  id            uuid primary key default gen_random_uuid(),
  -- Stable machine key, never shown to users. Lets seeds and code refer to a
  -- destination without depending on any locale's slug.
  key           text        not null unique,
  parent_id     uuid        references destinations(id) on delete set null,
  latitude      numeric(9, 6),
  longitude     numeric(9, 6),
  cover_image_url text,
  -- Ranks destination cards on the homepage; admin-controlled.
  sort_order    smallint    not null default 0,
  is_featured   boolean     not null default false,
  is_active     boolean     not null default true,
  -- Demo rows must be visibly labelled everywhere they surface.
  is_demo       boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint destinations_lat_valid check (latitude is null or latitude between -90 and 90),
  constraint destinations_lng_valid check (longitude is null or longitude between -180 and 180),
  constraint destinations_not_own_parent check (parent_id is null or parent_id <> id)
);

create index destinations_active_idx on destinations (is_active, sort_order) where deleted_at is null;
create index destinations_parent_idx on destinations (parent_id) where deleted_at is null;

create trigger destinations_set_updated_at
  before update on destinations
  for each row execute function set_updated_at();

create table destination_translations (
  id              uuid primary key default gen_random_uuid(),
  destination_id  uuid not null references destinations(id) on delete cascade,
  locale          text not null references locales(code) on delete cascade,

  name            text not null,
  slug            text not null,
  summary         text,          -- one-line, used on cards
  description     text,          -- long-form overview
  travel_tips     text,
  best_time       text,

  seo_title       text,
  seo_description text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (destination_id, locale),
  -- Two destinations must not collide within a locale, or the route is ambiguous.
  unique (locale, slug),
  constraint destination_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index destination_tr_locale_idx on destination_translations (locale);

create trigger destination_translations_set_updated_at
  before update on destination_translations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table categories (
  id            uuid primary key default gen_random_uuid(),
  key           text        not null unique,
  -- lucide-react icon name, resolved client-side.
  icon          text,
  cover_image_url text,
  sort_order    smallint    not null default 0,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index categories_active_idx on categories (is_active, sort_order) where deleted_at is null;

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

create table category_translations (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references categories(id) on delete cascade,
  locale          text not null references locales(code) on delete cascade,

  name            text not null,
  -- Also the first URL segment of the money pages: /safaris/serengeti.
  slug            text not null,
  -- Singular form, for prose like "1 safari operator in Arusha".
  name_singular   text,
  summary         text,
  description     text,

  seo_title       text,
  seo_description text,
  -- Heading used on the category x destination combination pages, e.g.
  -- "Safari operators in {destination}". Kept translatable because word order
  -- differs across these four languages.
  combo_heading   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (category_id, locale),
  unique (locale, slug),
  constraint category_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index category_tr_locale_idx on category_translations (locale);

create trigger category_translations_set_updated_at
  before update on category_translations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- A category slug and a destination slug must never collide within a locale.
--
-- The commercial routes are /{category}/{destination}, sitting at the same level
-- as /{destination-list-page}. Without this guard a category named the same as a
-- destination would make the route genuinely ambiguous, and the failure would
-- show up as a mysterious 404 in production rather than at seed time.
-- ---------------------------------------------------------------------------
create or replace function assert_slug_unique_across_taxonomy()
returns trigger
language plpgsql
as $$
declare
  clash text;
begin
  if tg_table_name = 'category_translations' then
    select 'destination' into clash
    from destination_translations
    where locale = new.locale and slug = new.slug
    limit 1;
  else
    select 'category' into clash
    from category_translations
    where locale = new.locale and slug = new.slug
    limit 1;
  end if;

  if clash is not null then
    raise exception
      'slug "%" already used by a % in locale "%"', new.slug, clash, new.locale
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

create trigger category_slug_no_clash
  before insert or update of slug, locale on category_translations
  for each row execute function assert_slug_unique_across_taxonomy();

create trigger destination_slug_no_clash
  before insert or update of slug, locale on destination_translations
  for each row execute function assert_slug_unique_across_taxonomy();
