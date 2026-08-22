-- ===========================================================================
-- 009 — Content: guides, media and seasonality
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Travel guides
--
-- The editorial layer, and the only place ads are ever permitted. Guides are
-- what earn long-tail search traffic ("tanzania safari cost", "best time to
-- visit serengeti") and what AdSense approval requires in the first place.
-- ---------------------------------------------------------------------------
create table guides (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references profiles(id) on delete set null,

  cover_image_url text,
  status        content_status not null default 'draft',

  -- Editorial linkage: a guide about Serengeti should surface on that page.
  primary_destination_id uuid references destinations(id) on delete set null,
  primary_category_id    uuid references categories(id) on delete set null,

  reading_minutes smallint,
  is_featured   boolean not null default false,
  is_demo       boolean not null default false,

  -- Guides are the one surface where ads may render. Kept as data so an
  -- individual guide can opt out (e.g. a sponsored piece).
  allow_ads     boolean not null default true,

  view_count    integer not null default 0,
  sort_order    smallint not null default 0,

  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index guides_public_idx
  on guides (status, published_at desc)
  where deleted_at is null and status = 'published';
create index guides_destination_idx on guides (primary_destination_id);
create index guides_category_idx on guides (primary_category_id);

create trigger guides_set_updated_at
  before update on guides
  for each row execute function set_updated_at();

create or replace function guides_stamp_published()
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

create trigger guides_stamp_published_trigger
  before insert or update on guides
  for each row execute function guides_stamp_published();

create table guide_translations (
  id          uuid primary key default gen_random_uuid(),
  guide_id    uuid not null references guides(id) on delete cascade,
  locale      text not null references locales(code) on delete cascade,

  title       text not null,
  slug        text not null,
  excerpt     text,
  body        text,

  seo_title       text,
  seo_description text,

  is_machine_translated boolean not null default false,
  reviewed_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (guide_id, locale),
  unique (locale, slug),
  constraint guide_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index guide_tr_locale_idx on guide_translations (locale);

create trigger guide_translations_set_updated_at
  before update on guide_translations
  for each row execute function set_updated_at();

-- Structured FAQs, kept as rows so they can emit FAQPage JSON-LD and win the
-- expandable SERP treatment rather than being buried in prose.
create table guide_faqs (
  id         uuid primary key default gen_random_uuid(),
  guide_id   uuid references guides(id) on delete cascade,
  destination_id uuid references destinations(id) on delete cascade,
  sort_order smallint not null default 0,

  constraint guide_faqs_has_parent check (guide_id is not null or destination_id is not null)
);

create table guide_faq_translations (
  id       uuid primary key default gen_random_uuid(),
  faq_id   uuid not null references guide_faqs(id) on delete cascade,
  locale   text not null references locales(code) on delete cascade,
  question text not null,
  answer   text not null,
  unique (faq_id, locale)
);

-- ---------------------------------------------------------------------------
-- Media
--
-- One row per uploaded asset. `storage_path` is the key inside the Supabase
-- bucket; the first path segment is always the owning business id, which is what
-- the storage policies in 014 enforce against.
-- ---------------------------------------------------------------------------
create table media (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references businesses(id) on delete cascade,
  package_id   uuid references packages(id) on delete cascade,
  guide_id     uuid references guides(id) on delete cascade,
  uploaded_by  uuid references profiles(id) on delete set null,

  kind         media_kind not null default 'gallery',
  bucket       text not null default 'business-media',
  storage_path text not null,
  public_url   text,

  file_name    text,
  mime_type    text,
  size_bytes   bigint,
  width        smallint,
  height       smallint,
  -- Tiny base64 placeholder so image-heavy grids do not flash empty boxes.
  blur_data_url text,

  alt_text     text,
  sort_order   smallint not null default 0,

  created_at   timestamptz not null default now(),

  unique (bucket, storage_path),
  constraint media_has_owner check (
    business_id is not null or package_id is not null or guide_id is not null
  ),
  constraint media_size_sane check (size_bytes is null or size_bytes > 0)
);

create index media_business_idx on media (business_id, kind, sort_order);
create index media_package_idx on media (package_id, sort_order);
create index media_guide_idx on media (guide_id);

-- ---------------------------------------------------------------------------
-- Destination seasonality
--
-- Month-by-month conditions per destination. This is what powers the "when to
-- visit" widget — genuinely useful to travelers, and the source of some of the
-- highest-volume long-tail queries in this niche (the Great Migration calendar
-- in particular).
-- ---------------------------------------------------------------------------
create table destination_seasonality (
  id             uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete cascade,
  month          smallint not null,

  -- 1-5 scales; deliberately coarse because false precision helps nobody.
  wildlife_rating smallint,
  weather_rating  smallint,
  crowd_level     smallint,

  rainfall_mm     smallint,
  temp_min_c      smallint,
  temp_max_c      smallint,

  is_peak_season  boolean not null default false,
  -- Machine key for a notable event, e.g. 'calving', 'river_crossing'. The
  -- human-readable label is translated.
  highlight_key   text,

  unique (destination_id, month),
  constraint seasonality_month_valid check (month between 1 and 12),
  constraint seasonality_wildlife_range check (wildlife_rating is null or wildlife_rating between 1 and 5),
  constraint seasonality_weather_range check (weather_rating is null or weather_rating between 1 and 5),
  constraint seasonality_crowd_range check (crowd_level is null or crowd_level between 1 and 5)
);

create index destination_seasonality_destination_idx on destination_seasonality (destination_id, month);

create table destination_seasonality_translations (
  id             uuid primary key default gen_random_uuid(),
  seasonality_id uuid not null references destination_seasonality(id) on delete cascade,
  locale         text not null references locales(code) on delete cascade,
  highlight      text,
  note           text,
  unique (seasonality_id, locale)
);
