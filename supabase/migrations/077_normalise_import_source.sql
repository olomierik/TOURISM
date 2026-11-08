-- ===========================================================================
-- 077 — import_source holds a source, not a sentence
--
-- The register import wrote this into businesses.import_source, 513 times:
--
--   'tanzaniaoperators.com, which compiles the TATO, TLTO and ZATO member
--    registers:2026-11-08'
--
-- Two mistakes in one string. The import script read the dataset's `via`
-- field, which is a prose description written for a human, and then appended
-- the date with a ':' separator although `import_checked_on` already holds it.
-- The result is a 91-character sentence in a column whose whole purpose is to
-- be matched on: `where import_source like 'register:%'` returns 0, and so
-- would any other sane predicate.
--
-- A further 75 rows carry `import_checked_on` with `import_source` null.
-- Those are listings we already had, which the import matched against the
-- register and enriched rather than created. Data of theirs did come from that
-- source on that date, so the source belongs on them too; "did we create this
-- row or only enrich it" stays answerable from created_at, which is what
-- created_at is for.
--
-- The prose moves to the column comment, where prose is the point.
-- ===========================================================================

update businesses
   set import_source = 'tanzaniaoperators.com'
 where import_checked_on is not null
   and (import_source is null or import_source <> 'tanzaniaoperators.com');

comment on column businesses.import_source is
  'Host the listing''s imported data was read from, as a bare token for matching — never a sentence. ''tanzaniaoperators.com'' is a third-party compilation of the TATO, TLTO and ZATO member registers; it is not itself a licensing authority, and a listing carrying it has not been licence-checked by us. Pair it with import_checked_on for when the source was read.';

comment on column businesses.import_checked_on is
  'Date import_source was read. Set on enriched pre-existing listings as well as created ones; created_at distinguishes the two.';
