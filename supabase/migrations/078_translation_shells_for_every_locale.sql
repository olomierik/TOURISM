-- ===========================================================================
-- 078 — A missing translation row is a missing page
--
-- `getBusinessBySlug` and every directory query join
-- `business_translations!inner` on the content locale. No row for that locale
-- means the listing does not exist: the profile 404s and the card never
-- renders. Commit b5a6a43 fixed this for the 513 register imports by writing
-- shells; it did not sweep what was already there.
--
-- What is already there, among approved listings:
--
--   de  9 missing     en  1 missing     fr  9 missing
--   it  8 missing     sw 11 missing
--
-- The `en` one is the one that stings. blue-lagoon-adventure-tour-travel-ltd
-- is an approved, non-stub operator with a written Italian description — "28
-- years" of trading, in their own words — and exactly one translation row, in
-- Italian. So it serves Italian visitors and 404s for everyone else, which is
-- also why the directory's own total read 3,853 against 3,854 approved rows.
-- One listing, invisible in four languages, for want of a row.
--
-- Every text column stays null, deliberately, exactly as b5a6a43 did it. A
-- shell makes the listing reachable and — after 076 folds the business name
-- into the search vector — findable by name. It does not invent a description
-- nobody wrote; generated filler in place of real copy is what the directory
-- was turned down by AdSense for.
--
-- Runs after 076 so each inserted row is stamped by the new trigger and
-- carries its operator's name. Inserting does not disturb lastmod the way
-- 076's backfill would have: `set_updated_at` is an UPDATE-only trigger, and
-- for a genuinely new row created_at/updated_at of now() is the truth.
-- ===========================================================================

insert into business_translations (business_id, locale)
select b.id, l.code
  from businesses b
  cross join locales l
 where b.status = 'approved'
   and not exists (
     select 1 from business_translations t
      where t.business_id = b.id and t.locale = l.code
   )
on conflict (business_id, locale) do nothing;
