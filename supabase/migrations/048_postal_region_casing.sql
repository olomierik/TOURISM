-- ===========================================================================
-- 048 — The town name as a reader sees it
--
-- 047 wrote the lookup key into the city column. The key is lowercase, because
-- the gazetteer joins on lower(btrim(city)) to survive 'TANGA' and 'Tanga' in
-- the same import. The city column is not a key, though — it is printed on the
-- card, in the near-me label ("In nairobi") and in the page title. So 19
-- listings now say they are in "nairobi" while 399 others say "Nairobi".
--
-- The fix is to keep the two apart: postal_regions stores the name as it is
-- written, and the join lowercases at the point of comparison, which is where
-- the case-insensitivity was always needed and the only place it belongs.
-- ===========================================================================

update postal_regions set city = initcap(city);

-- initcap on the existing rows would produce 'Naro Moru', 'Ongata Rongai',
-- 'Ruiru' — which is what these places are called. The businesses carrying the
-- lowercase key are corrected from the same table, so the two cannot drift.
update businesses b
   set city = r.city
  from postal_regions r
 where lower(btrim(b.city)) = lower(r.city)
   and b.city <> r.city;

-- The gazetteer is a lookup table and stays lowercase, so this comment is the
-- reminder that the two columns are not the same kind of thing.
comment on column postal_regions.city is
  'The town name as it should be displayed. Joined case-insensitively against city_coordinates, which is keyed in lowercase.';
