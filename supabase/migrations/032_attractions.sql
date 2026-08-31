-- ===========================================================================
-- 032 — Things to do, as records rather than as businesses
--
-- /activities/serengeti is titled "Things to do in Serengeti" and lists tour
-- operators. That is a directory page wearing a guide's title. Nobody searching
-- "things to do in Arusha" wants a list of companies; they want to know that
-- there is a Maasai market on Fridays and a coffee farm you can walk.
--
-- Until now the site had no way to say that. Everything on it was a business, a
-- destination, a guide article or a package — and an attraction is none of
-- those. The Ngorongoro Crater rim is not a company you can enquire with, has
-- no owner, and belongs to no operator.
--
-- Kept deliberately small. An attraction here is a name, where it is, what kind
-- of thing it is, and one paragraph that helps somebody decide. It is not a
-- listing: no contact details, no claiming, no reviews, no subscription tier.
-- The moment an attraction grows an owner it has become a business, and there
-- is already a table for those.
-- ===========================================================================

create type attraction_kind as enum (
  'wildlife',    -- a crater floor, a river crossing point, a chimp trailhead
  'landscape',   -- a viewpoint, a dune field, a waterfall
  'cultural',    -- a village, a market, a workshop
  'historic',    -- a ruin, a memorial, an archaeological site
  'museum',
  'water',       -- a reef, a lake, a hot spring, a beach
  'active'       -- a trek, a climb, a rafting run
);

create table attractions (
  id             uuid primary key default gen_random_uuid(),

  -- Stable identity for the seeder, so re-running edits rather than duplicates.
  -- Same pattern the destination and guide seeders use.
  key            text not null unique,

  destination_id uuid not null references destinations(id) on delete cascade,
  kind           attraction_kind not null,

  latitude       numeric(9,6),
  longitude      numeric(9,6),

  -- Whether it costs anything beyond the park fee already published on the
  -- destination page. Three states on purpose: true, false, and "we have not
  -- checked", which is different from free and must not be shown as free.
  is_free        boolean,

  -- Roughly how long to allow. Minutes, so a 40-minute museum and a three-day
  -- trek are the same column.
  typical_minutes integer,

  sort_order     smallint not null default 100,
  is_active      boolean not null default true,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint attractions_minutes_sane check (
    typical_minutes is null or (typical_minutes > 0 and typical_minutes <= 20160)
  ),
  constraint attractions_coords_paired check (
    (latitude is null) = (longitude is null)
  )
);

create index attractions_destination on attractions (destination_id, sort_order)
  where is_active;
create index attractions_kind on attractions (kind) where is_active;

-- ---------------------------------------------------------------------------
-- Text, per locale, with its own slug — the same shape as every other
-- translated entity here, so an attraction can have a German URL the day
-- somebody writes German copy for it.
-- ---------------------------------------------------------------------------
create table attraction_translations (
  id            uuid primary key default gen_random_uuid(),
  attraction_id uuid not null references attractions(id) on delete cascade,
  locale        text not null references locales(code),

  name          text not null,
  slug          text not null,
  summary       text,
  -- One thing a visitor would not work out from the name. The reason the row
  -- earns its place rather than being a label on a map.
  tip           text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (attraction_id, locale),
  unique (locale, slug)
);

create index attraction_translations_lookup
  on attraction_translations (locale, slug);

alter table attractions enable row level security;
alter table attraction_translations enable row level security;

-- Reference content: public to read, admin to change. Same policy shape as
-- destinations, which these hang off.
create policy attractions_public_read on attractions
  for select to anon, authenticated using (is_active);

create policy attractions_admin_write on attractions
  for all to authenticated using (is_admin()) with check (is_admin());

create policy attraction_translations_public_read on attraction_translations
  for select to anon, authenticated using (true);

create policy attraction_translations_admin_write on attraction_translations
  for all to authenticated using (is_admin()) with check (is_admin());

create trigger attractions_touch
  before update on attractions
  for each row execute function set_updated_at();

create trigger attraction_translations_touch
  before update on attraction_translations
  for each row execute function set_updated_at();

comment on table attractions is
  'Things to do: places and experiences that are not businesses. No owner, no contact details, no reviews.';
comment on column attractions.is_free is
  'NULL means unchecked, which is not the same as free and must never render as free.';
