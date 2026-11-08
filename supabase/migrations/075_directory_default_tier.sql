-- ===========================================================================
-- 075 — The directory stops opening on 3,854 mostly-empty listings
--
-- "There is no reason to show unclaimed businesses on our listings. Let
--  claimed businesses show by default and put a button where if clicked it
--  will show all unclaimed businesses."
--
-- Measured 8 Nov 2026, after the register import:
--
--   all approved   3,854
--   not a stub       419
--   claimed           31
--
-- Claimed-only is the literal reading and it is too sharp. 31 listings is a
-- landing page, not a directory, and the thinnest categories collapse to one
-- entry each — a Restaurants page with a single row reads as broken rather
-- than as curated.
--
-- `is_stub`, from migration 059, is the rule that was already here. It marks a
-- listing carrying only imported data and no original description, it is
-- already the basis for noindex and for sitemap exclusion, and it is overridden
-- by ownership at read time — so a listing joins the default the moment it is
-- claimed and approved, with no second rule to keep in step. 419 is a
-- directory.
--
-- A dial rather than a switch, because the right answer changes as claims
-- arrive: move it to 'claimed' once claimed supply can carry it, somewhere
-- north of 300, without a deploy.
-- ===========================================================================

insert into platform_settings (key, value, description) values
  ('directory_default_tier', '"substantial"'::jsonb,
   'Which listings the directory shows before the visitor asks for more: "claimed" (owned or licence-checked), "substantial" (anything that is not an import stub — the default), or "all". Near-me and search-by-name deliberately ignore this: a traveller wants the nearest bed whoever owns the listing, and someone typing an operator''s name must find them or the directory is lying about its coverage.')
on conflict (key) do nothing;
