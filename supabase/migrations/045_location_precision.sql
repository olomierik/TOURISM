-- ===========================================================================
-- 045 — Where a business is, and how well we know it
--
-- Near-me returned bad results for a reason that had nothing to do with the
-- maths: 408 of 1,330 approved listings have no coordinates at all, so 31% of
-- the directory could never appear in a proximity search however close the
-- traveller was standing. A search that silently omits a third of its subject
-- is not inaccurate, it is incomplete, and the two look identical from outside.
--
-- 309 of those 408 do have a city — and 14 city names cover all 309. So they
-- can be placed. What they cannot be is placed *precisely*: a city centroid is
-- where Nairobi is, not where the operator's office is, and the difference is
-- up to twenty kilometres.
--
-- Hence this column. Without it the two kinds of location are indistinguishable
-- in the table, and the site would confidently tell somebody an operator is
-- "2.1 km away" when all that is known is "somewhere in Nairobi". That is the
-- invented precision this project refuses everywhere else — a fabricated
-- distance is the same class of error as a fabricated park fee.
--
-- With it, both kinds are searchable and only one claims a distance.
-- ===========================================================================

create type location_precision as enum (
  'exact',  -- the operator's own coordinates: from the import, or set by them
  'city'    -- derived from the city name; good for "is it near me", not for a distance
);

alter table businesses
  add column location_precision location_precision;

-- Everything that already had coordinates came from Google Maps against the
-- business itself, so it is exact.
update businesses
   set location_precision = 'exact'
 where latitude is not null and longitude is not null;

-- ---------------------------------------------------------------------------
-- The gazetteer.
--
-- Fourteen entries, which is every city that appears on a coordinate-less
-- listing. Written out rather than fetched from a geocoding service: this is a
-- fixed, small, checkable list, and a service would add a key, a rate limit and
-- a dependency to solve fourteen rows.
--
-- Coordinates are city centres. They are deliberately not precise to a street,
-- because the whole point of the column above is that we are not pretending to
-- know the street.
-- ---------------------------------------------------------------------------
create table city_coordinates (
  city         text not null,
  country_code char(2) not null,
  latitude     numeric(9, 6) not null,
  longitude    numeric(9, 6) not null,
  primary key (city, country_code)
);

insert into city_coordinates (city, country_code, latitude, longitude) values
  ('nairobi',  'KE', -1.286389, 36.817223),
  ('mombasa',  'KE', -4.043477, 39.668206),
  ('diani',    'KE', -4.276900, 39.590600),
  ('ukunda',   'KE', -4.292500, 39.571700),
  ('nanyuki',  'KE',  0.006900, 37.072300),
  ('malindi',  'KE', -3.219200, 40.116900),
  ('voi',      'KE', -3.396100, 38.556100),
  ('nyeri',    'KE', -0.419700, 36.947600),
  ('kisumu',   'KE', -0.091700, 34.768000),
  ('kilifi',   'KE', -3.630500, 39.849900),
  ('eldoret',  'KE',  0.514300, 35.269800),
  ('machakos', 'KE', -1.517700, 37.263400),
  ('naivasha', 'KE', -0.716700, 36.433300),
  ('tanga',    'TZ', -5.068900, 39.098800);

-- Case and stray whitespace are how this data actually arrives — the same city
-- appears as 'TANGA' and 'Tanga' in the same table.
update businesses b
   set latitude  = g.latitude,
       longitude = g.longitude,
       location_precision = 'city'
  from city_coordinates g
 where b.latitude is null
   and lower(btrim(b.city)) = g.city
   and b.country_code = g.country_code;

-- A coordinate with no precision recorded would be a third, unlabelled kind.
alter table businesses
  add constraint businesses_precision_paired
  check ((latitude is null) = (location_precision is null));

comment on column businesses.location_precision is
  'How well the coordinates locate the business. "city" means a centroid — searchable by proximity, but no distance may be shown, because the real address could be twenty kilometres away.';
comment on table city_coordinates is
  'City centres for listings that arrived without coordinates. Fourteen rows covering every such city — a fixed checkable list rather than a geocoding dependency.';
