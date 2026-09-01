-- ===========================================================================
-- 047 — The region a business registered in
--
-- 045 placed 309 listings from their city name. 99 were left with no city and
-- no coordinates, so they are invisible to proximity search and absent from
-- every map — and 90 of those are Kenyan tour operators, which is a large hole
-- in a directory whose Kenyan section is its biggest.
--
-- 26 of them do say where they are, in the only field the import captured: a
-- postal address. A Kenyan postcode is a sorting office, and a sorting office
-- is a town. "P.O. Box 42391-00100" is Nairobi GPO; "-80400" is Ukunda. That
-- is the region the business registered in, which is exactly the granularity
-- this table already models as 'city'.
--
-- Two things this deliberately does not do.
--
-- It does not label any of these 'exact'. A box number is a town, not a door,
-- and the whole point of location_precision is that the difference is recorded
-- rather than smoothed over. These rows will show "In Nairobi" and never a
-- distance in kilometres.
--
-- And it does not guess. The 4 addresses that carry no readable code stay
-- unplaced — a street name with no town ("Gitanga Road, Valley Arcade") could
-- be resolved by a geocoder, and a geocoder that is wrong once puts an operator
-- in a town they have never traded in. The operator can now pin themselves from
-- the dashboard, which is a better answer than a confident guess.
-- ===========================================================================

-- The mapping, as a table rather than a CASE expression buried in an update.
-- The next import will hit the same codes, and a rule that only exists inside
-- a one-off statement has to be reinvented — badly — the second time.
create table postal_regions (
  postal_code  text not null,
  country_code char(2) not null,
  city         text not null,
  primary key (postal_code, country_code)
);

comment on table postal_regions is
  'Postal sorting offices mapped to the town they serve, for listings that arrived with an address but no city. Resolves to city-level precision only — a box number is a town, never a street.';

insert into postal_regions (postal_code, country_code, city) values
  -- Nairobi's sorting offices. 00100 is the GPO; the rest are branch offices
  -- inside the city, so they all resolve to the same centroid the 251 listings
  -- backfilled in 045 already use.
  ('00100', 'KE', 'nairobi'),
  ('00200', 'KE', 'nairobi'),
  ('00501', 'KE', 'nairobi'),
  ('00620', 'KE', 'nairobi'),
  ('00800', 'KE', 'nairobi'),
  -- Satellite towns with their own offices. Kept separate from Nairobi because
  -- they are separate places: Ongata Rongai is 20km from the city centre, and
  -- collapsing it into Nairobi would be a 20km error introduced on purpose.
  ('00232', 'KE', 'ruiru'),
  ('00511', 'KE', 'ongata rongai'),
  -- Upcountry and coast.
  ('10105', 'KE', 'naro moru'),
  ('20107', 'KE', 'njoro'),
  ('20116', 'KE', 'gilgil'),
  ('80100', 'KE', 'mombasa'),
  ('80400', 'KE', 'ukunda');

-- The five towns 045 did not need. Same rule as before: town centres, written
-- out rather than fetched, because it is a short checkable list.
insert into city_coordinates (city, country_code, latitude, longitude) values
  ('ruiru',         'KE', -1.150000, 36.960000),
  ('ongata rongai', 'KE', -1.395600, 36.744300),
  ('naro moru',     'KE', -0.166700, 37.016700),
  ('njoro',         'KE', -0.328600, 35.943900),
  ('gilgil',        'KE', -0.495000, 36.316700)
on conflict (city, country_code) do nothing;

-- ---------------------------------------------------------------------------
-- Read the code out of the address.
--
-- translate() first: three of these addresses use an en dash rather than a
-- hyphen, and one uses an em dash. They are the same character to a human
-- reading an envelope and different characters to a regex, which is the kind
-- of difference that silently drops rows.
-- ---------------------------------------------------------------------------
with found as (
  select b.id,
         b.country_code,
         substring(translate(b.address, '–—', '--') from '-[[:space:]]*([0-9]{5})') as code
    from businesses b
   where b.deleted_at is null
     and b.latitude is null
     and b.city is null
     and b.address is not null
),
resolved as (
  -- The country comes from the CTE rather than the update target: in an
  -- UPDATE ... FROM, the target table is not visible inside a join condition,
  -- only in the WHERE.
  select f.id, r.city
    from found f
    join postal_regions r
      on r.postal_code = f.code
     and r.country_code = f.country_code
)
update businesses b
   set city = resolved.city
  from resolved
 where b.id = resolved.id;

-- And place them, by exactly the same join 045 used — so there is one way a
-- listing gets a city-level coordinate, not two.
update businesses b
   set latitude  = g.latitude,
       longitude = g.longitude,
       location_precision = 'city'
  from city_coordinates g
 where b.latitude is null
   and lower(btrim(b.city)) = g.city
   and b.country_code = g.country_code;
