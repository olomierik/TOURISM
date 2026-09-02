-- ===========================================================================
-- 050 — Tidying the city names the OpenStreetMap import brought with it
--
-- 049 gave every town one spelling. Then 737 listings arrived from
-- OpenStreetMap, where addr:city is free text typed by whoever mapped the
-- building, and the directory acquired "Dar es salaaam" (23 listings),
-- "Dar es salaam" (3) and "Dar es Salaam" (35) — one city, three entries in
-- the filter list, none of which shows the other two's listings.
--
-- Three rules, in order of how confident each is.
-- ===========================================================================

-- 1. Case, again. Same rule as 049: each group keeps the spelling its own
--    listings most often use, rather than initcap, which would turn
--    'Dar es Salaam' into 'Dar Es Salaam'.
with ranked as (
  select city,
         lower(btrim(city)) as key,
         row_number() over (
           partition by lower(btrim(city))
           order by count(*) desc, length(city), city
         ) as rank
    from businesses
   where deleted_at is null and city is not null
   group by city
),
canonical as (select key, city from ranked where rank = 1)
update businesses b
   set city = canonical.city
  from canonical
 where lower(btrim(b.city)) = canonical.key
   and b.city <> canonical.city;

-- 2. Spelling, where the intent is unmistakable. Only Dar es Salaam is listed:
--    every other variant in the data was a case difference, and guessing at
--    misspellings in general is how 'Musoma' quietly becomes 'Mwanza'.
update businesses
   set city = 'Dar es Salaam'
 where deleted_at is null
   and city is not null
   and city <> 'Dar es Salaam'
   and regexp_replace(lower(btrim(city)), '[^a-z]', '', 'g') ~ '^daressal+a+m$';

-- 3. Values that are not cities at all.
--
--    OpenStreetMap's addr:city holds whatever the mapper had to hand, which
--    for a camp in the middle of a national park is the name of the park, and
--    for four listings was the name of the country. Neither is somewhere a
--    traveller can be, and both would appear in the city filter beside real
--    towns. The destination links already say a camp is in the Serengeti —
--    that is the field for it — so these are cleared rather than translated.
update businesses b
   set city = null
 where b.deleted_at is null
   and b.city is not null
   and (
     -- the country itself
     lower(btrim(b.city)) in ('tanzania', 'kenya', 'uganda', 'rwanda')
     -- or a destination this site already models properly
     or exists (
       select 1
         from destination_translations dt
        where dt.locale = 'en'
          and lower(btrim(dt.name)) = lower(btrim(b.city))
     )
   );
