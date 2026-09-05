-- ===========================================================================
-- 056 — Which region a listing is actually in
--
-- The regions table has existed since 023: 31 Tanzanian regions, 47 Kenyan
-- counties, 4 Ugandan regions, 5 Rwandan provinces. Nothing has ever been
-- filed under any of them. destinations got a region_id and businesses did
-- not, so a directory of 2,618 listings across four countries offers no way to
-- ask for the ones in Arusha, and near-me is the only geography the site has.
--
-- Why coordinates and not the city column.
--
-- 2,545 of 2,618 listings carry coordinates. City names cover 39% of the
-- Tanzanian ones, and the ones they do cover have been repaired twice already
-- in this project — 050 wiped 166 of them with an over-broad rule. A point
-- either is or is not inside a boundary; a name has to be spelled the way the
-- gazetteer expects, and 'Dar es salaaam' is what happens when it isn't.
--
-- Why native polygons and not PostGIS.
--
-- PostGIS is available here and it is the right tool for real geometry work.
-- This is one containment test against 88 polygons on insert. Postgres has had
-- a polygon type and a containment operator since before PostGIS existed, and
-- an extension that adds thousands of objects to a database should earn its
-- place. For this, it does not.
--
-- Why the boundaries live in the database at all.
--
-- They could have been applied offline once and only the answers stored. Then
-- every business that registers tomorrow would need somebody to re-run a
-- script, and the column would rot exactly the way city did. The boundaries
-- are here so the trigger can classify a listing the moment it gets a
-- coordinate, without anybody remembering to.
--
-- Measured before any of this ran: 609 Tanzanian listings carry a region
-- recorded independently by Google. Against those, this method agrees on 607.
-- Both disagreements are Google's — one guest house in Manyoni District filed
-- under Arusha, one lodge at Kilimanjaro airport filed under Arusha because
-- that is the tourism town 40km away.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The boundaries.
--
-- A separate table rather than a column on regions, because a region is
-- legitimately more than one piece of land. Mafia Island is part of Pwani and
-- sits 20km off the mainland; Kenya's coastal counties carry islands; Zanzibar
-- is five regions that are all islands. Storing one ring per region would have
-- quietly lost every listing on them.
-- ---------------------------------------------------------------------------
create table if not exists region_boundaries (
  id         uuid primary key default gen_random_uuid(),
  region_id  uuid not null references regions(id) on delete cascade,
  -- Simplified to roughly a tenth of the region's own size, which is far finer
  -- than the question being asked and takes a region from ~12,000 points to
  -- ~100. The full geometry is 20MB and answers nothing better.
  boundary   polygon not null,
  created_at timestamptz not null default now()
);

create index if not exists region_boundaries_region_idx on region_boundaries (region_id);

comment on table region_boundaries is
  'Simplified administrative boundaries from OpenStreetMap (ODbL, © OpenStreetMap contributors). One row per landmass — a region may have several. Used only to decide which region a coordinate falls in.';

-- ---------------------------------------------------------------------------
-- The column.
-- ---------------------------------------------------------------------------
alter table businesses add column if not exists region_id uuid
  references regions(id) on delete set null;

-- Partial: the filter always asks for a region, never for their absence, and
-- a third of a million rows of null is not worth indexing.
create index if not exists businesses_region_idx
  on businesses (region_id, status) where region_id is not null;

comment on column businesses.region_id is
  'Administrative region, derived from coordinates by region_for_point(). Null where a listing has no coordinates or sits more than 15km from any boundary.';

-- ---------------------------------------------------------------------------
-- The lookup.
--
-- Containment first. Where a point is inside nothing, the nearest boundary
-- within 15km wins — and that is not papering over bad geometry, it is the
-- coastline being the coastline. A beach hotel is by definition within metres
-- of the line, the line is simplified, and a Google pin often sits on the sand
-- or just off it. Kendwa measured 1km outside Unguja for exactly that reason
-- and is unambiguously in Unguja North. Refusing to classify it would be
-- precise and useless.
--
-- 15km is wide enough for any coastal or border pin and far too narrow to
-- reach across a region. Past that the answer is null, because a listing 200km
-- out to sea has a coordinate problem that a region guess would only hide.
-- ---------------------------------------------------------------------------
create or replace function region_for_point(
  p_lat double precision,
  p_lon double precision,
  p_country char(2)
) returns uuid
language sql
stable
-- No search_path games and no elevated rights: this reads two tables that are
-- world-readable anyway and writes nothing.
as $$
  with candidates as (
    select b.region_id, b.boundary
    from region_boundaries b
    join regions r on r.id = b.region_id
    where p_lat is not null
      and p_lon is not null
      and (p_country is null or r.country_code = p_country)
  ),
  contained as (
    select region_id from candidates
    where boundary @> point(p_lon, p_lat)
    limit 1
  ),
  nearest as (
    select region_id
    from candidates
    -- Degrees, not metres. A degree of latitude is ~111km everywhere and a
    -- degree of longitude is within 1% of that this close to the equator, so
    -- the flat conversion is honest here and a spheroid would be false
    -- precision on a boundary that is already simplified to ~1km.
    where (point(p_lon, p_lat) <-> boundary) < (15.0 / 111.0)
    order by point(p_lon, p_lat) <-> boundary
    limit 1
  )
  select coalesce(
    (select region_id from contained),
    (select region_id from nearest)
  );
$$;

comment on function region_for_point is
  'The region containing a coordinate, or the nearest one within 15km. Null beyond that.';

-- ---------------------------------------------------------------------------
-- Keeping it true.
--
-- Fires only when the coordinates or the country actually change, so ordinary
-- edits — a new description, a phone number, a tier upgrade — do not pay for a
-- polygon scan. An operator who drags their pin gets refiled immediately.
--
-- A region set by hand is left alone: if somebody has corrected a listing in
-- the admin, a coordinate nudge must not silently overwrite them. That is what
-- region_locked records.
-- ---------------------------------------------------------------------------
alter table businesses add column if not exists region_locked boolean not null default false;

comment on column businesses.region_locked is
  'Set when a human has chosen the region. Stops the coordinate trigger from overwriting it.';

create or replace function set_business_region() returns trigger
language plpgsql
as $$
begin
  if new.region_locked then
    return new;
  end if;
  new.region_id := region_for_point(new.latitude, new.longitude, new.country_code);
  return new;
end;
$$;

drop trigger if exists businesses_set_region on businesses;
create trigger businesses_set_region
  before insert or update of latitude, longitude, country_code on businesses
  for each row execute function set_business_region();

-- ---------------------------------------------------------------------------
-- Reading them.
--
-- Boundaries are public reference data — the same OpenStreetMap extract anyone
-- can download — and the filter on the directory needs them. Writes stay with
-- the seed script, which runs as the service role.
-- ---------------------------------------------------------------------------
alter table region_boundaries enable row level security;

drop policy if exists region_boundaries_read on region_boundaries;
create policy region_boundaries_read on region_boundaries for select using (true);
