-- ===========================================================================
-- 051 — The city rules, applied once more and correctly this time
--
-- 050 got two of its three rules right and the third badly wrong. It cleared
-- any city whose name matched a destination, on the reasoning that a camp
-- whose addr:city reads "Serengeti National Park" is not in a city. True — but
-- most destinations on this site *are* cities, so the rule also erased the
-- city of every listing in Arusha, Dar es Salaam, Tanga, Zanzibar, Mombasa,
-- Kigali, Kampala, Entebbe and Lamu. 166 listings lost the only field saying
-- where they were.
--
-- scripts/repair-city-from-seed.mjs put them back from the seed files, and in
-- doing so restored the raw values — including the "Dar es salaaam" spelling
-- that 050 had just fixed. Hence this: the two rules that were right, run
-- again after the restore, and the third replaced with one that names what it
-- actually means.
--
-- The lesson worth keeping: "matches a destination" was a proxy for "is not a
-- town", and it was a bad one. This version tests the thing itself.
-- ===========================================================================

-- 1. One spelling per town, by frequency. Not initcap — that would render
--    'Dar es Salaam' as 'Dar Es Salaam'.
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

-- 2. Dar es Salaam, whichever way it was typed. Still the only spelling rule:
--    guessing at misspellings in general is how 'Musoma' becomes 'Mwanza'.
update businesses
   set city = 'Dar es Salaam'
 where deleted_at is null
   and city is not null
   and city <> 'Dar es Salaam'
   and regexp_replace(lower(btrim(city)), '[^a-z]', '', 'g') ~ '^daressal+a+m$';

-- 3. Values that describe a landscape rather than a settlement.
--
--    Tested on the words themselves rather than on whether the site happens to
--    model a destination by that name, which is what 050 got wrong. A national
--    park is not a town in any directory; Arusha is a town in every one.
update businesses
   set city = null
 where deleted_at is null
   and city is not null
   and (
     city ~* '(national park|game reserve|conservation area|nature reserve|crater|wildlife)'
     or lower(btrim(city)) in ('tanzania', 'kenya', 'uganda', 'rwanda')
   );
