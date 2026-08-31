-- ===========================================================================
-- 037 — Saved trips
--
-- The cost estimator already puts the whole trip in the query string, so an
-- anonymous visitor can bookmark one or send it to somebody. That covers most
-- of what saving is for, and it is why this table is small: it is not the only
-- way to keep a trip, it is the way to keep several and find them again from a
-- different device.
--
-- Stops are rows rather than a jsonb blob, so a stop points at a real
-- destination and cannot drift into naming one that never existed. The cost of
-- that choice is that a destination going away takes the stop with it, which
-- would otherwise be a silent edit to somebody's saved plan — so the trip
-- records how many stops it had when it was saved, and the page can say "one
-- place in this trip is no longer listed" instead of quietly showing four
-- stops where there were five.
-- ===========================================================================

create table saved_trips (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,

  -- The traveller's own label. Nullable: most people will save without naming,
  -- and "Trip 1" invented on their behalf is worse than a date.
  name        text,

  style       text not null,
  travellers  smallint not null,

  -- What the trip held when it was saved. Compared against the live stop count
  -- so a vanished destination is reported rather than silently dropped.
  stop_count  smallint not null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint saved_trips_style_known check (style in ('budget', 'midrange', 'luxury')),
  constraint saved_trips_travellers_sane check (travellers between 1 and 20),
  constraint saved_trips_stops_sane check (stop_count between 1 and 12),
  constraint saved_trips_name_length check (name is null or length(btrim(name)) between 1 and 80)
);

create index saved_trips_owner on saved_trips (profile_id, created_at desc);

create table saved_trip_stops (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references saved_trips(id) on delete cascade,
  destination_id uuid not null references destinations(id) on delete cascade,

  nights         smallint not null,
  -- Order matters: Serengeti then Zanzibar is a different trip from the
  -- reverse, and the estimator's line items follow it.
  position       smallint not null,

  created_at     timestamptz not null default now(),

  constraint saved_trip_stops_nights_sane check (nights between 1 and 60),
  unique (trip_id, destination_id),
  unique (trip_id, position)
);

create index saved_trip_stops_trip on saved_trip_stops (trip_id, position);

alter table saved_trips enable row level security;
alter table saved_trip_stops enable row level security;

-- Nobody's trip is anybody else's business. Unlike every other table added
-- recently, this one holds user data rather than reference content, so there
-- is no public read policy at all.
-- (select auth.uid()) rather than a bare call, per the note at the top of 013:
-- the subselect form is evaluated once per statement instead of once per row.
create policy saved_trips_own on saved_trips
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy saved_trip_stops_own on saved_trip_stops
  for all to authenticated
  using (exists (
    select 1 from saved_trips t
     where t.id = trip_id and t.profile_id = (select auth.uid())))
  with check (exists (
    select 1 from saved_trips t
     where t.id = trip_id and t.profile_id = (select auth.uid())));

create trigger saved_trips_touch
  before update on saved_trips
  for each row execute function set_updated_at();

comment on table saved_trips is
  'A traveller''s saved itinerary. User data: readable only by its owner, with no public policy.';
comment on column saved_trips.stop_count is
  'Stops at save time. A live count below this means a destination has gone, and the page says so rather than showing a shorter trip as though it were the saved one.';
