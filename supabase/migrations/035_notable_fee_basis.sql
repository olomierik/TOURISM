-- ===========================================================================
-- 035 — What a notable fee is charged against, as data rather than as prose
--
-- destination_costs.notable_fee_amount has been rendered next to a label that
-- carries its unit in words: "Ngorongoro Crater descent, per vehicle",
-- "Gorilla trekking permit, per person". That is fine for a human reading a
-- page and useless to anything that has to add the numbers up.
--
-- The trip-cost calculator has to. Four people sharing one vehicle pay the
-- crater descent once between them and a gorilla permit each, and getting that
-- backwards is a several-hundred-dollar error in either direction — the exact
-- mistake the comment on notable_fee_key warned about when the column was
-- added, solved for the page and not for anything downstream of it.
--
-- The third value is the one that is easy to miss. climbPackage and
-- trekPackage are not supplements: a seven-day Kilimanjaro climb IS the trip,
-- porters, park fees, food and guide included. Adding it on top of seven days
-- of Kilimanjaro day rates would roughly double a real quote. So the basis
-- says whether a fee is added to the day rates or replaces them, and the
-- calculator branches on that rather than on a hardcoded list of keys that
-- would fall out of step the first time a sixth fee is seeded.
-- ===========================================================================

create type notable_fee_basis as enum (
  'per_person',        -- a permit each: gorilla, chimpanzee
  'per_vehicle',       -- charged once per car: the Ngorongoro crater descent
  'package_per_person' -- the whole trip, per person; day rates do not apply on top
);

alter table destination_costs
  add column notable_fee_basis notable_fee_basis;

-- Backfill from the five keys that exist, before the constraint goes on — rows
-- already carry a key and would fail it otherwise. Anything seeded later gets
-- its basis from the seeder.
update destination_costs set notable_fee_basis = case notable_fee_key
  when 'craterDescent' then 'per_vehicle'::notable_fee_basis
  when 'gorillaPermit' then 'per_person'::notable_fee_basis
  when 'chimpPermit'   then 'per_person'::notable_fee_basis
  when 'climbPackage'  then 'package_per_person'::notable_fee_basis
  when 'trekPackage'   then 'package_per_person'::notable_fee_basis
end
where notable_fee_key is not null;

-- A fee without a basis cannot be summed, and one without an amount has
-- nothing to sum. They arrive and leave together, like key and amount already do.
alter table destination_costs
  add constraint destination_costs_notable_basis_paired
  check ((notable_fee_key is null) = (notable_fee_basis is null));

comment on column destination_costs.notable_fee_basis is
  'What the notable fee is charged against. package_per_person means the fee replaces the day rates rather than adding to them — a Kilimanjaro climb is not a supplement.';
