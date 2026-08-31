-- ===========================================================================
-- 036 — How many nights a package fee actually covers
--
-- The estimator shows "Mount Kilimanjaro — 3 nights — $2,200", because the
-- nights come from a stepper the reader controls and the price comes from a
-- package that does not move when they touch it. Both numbers are right and
-- the pair is nonsense: $2,200 is a seven-day climb, and a reader who sets
-- three nights has quietly built an itinerary that cannot happen.
--
-- The duration was never missing, only unwritten — the label on the
-- destination page has said "Typical 7-day climb" all along. Moving it into a
-- column lets the estimator hold the nights at what the price actually buys
-- instead of letting them disagree.
--
-- Nullable on purpose, and left null for the Rwenzori trek. That package
-- genuinely covers routes of different lengths, and the destination page says
-- "typical multi-day trek" precisely because nobody has pinned it to a number.
-- Inventing a 7 to make the column look complete would be the same failure in
-- the other direction.
-- ===========================================================================

alter table destination_costs
  add column notable_fee_nights smallint;

alter table destination_costs
  add constraint destination_costs_package_nights_sane check (
    notable_fee_nights is null
    or (notable_fee_basis = 'package_per_person' and notable_fee_nights between 1 and 60)
  );

-- The one duration the site already publishes in words.
update destination_costs
   set notable_fee_nights = 7
 where notable_fee_key = 'climbPackage';

comment on column destination_costs.notable_fee_nights is
  'Nights a package fee covers. Only meaningful for package_per_person; null where the package length genuinely varies, and the estimator then says the price is fixed rather than pretending to know.';
