-- ===========================================================================
-- 059 — Stop asking Google to index pages that say nothing
--
-- Google declined this site for the AdSense publisher network. Measured
-- against what the sitemaps actually submit:
--
--   business listings   2,618   of 2,705 URLs   (96.8%)
--   of those, carrying an identical imported template   2,207   (84%)
--   guides 21, destinations 46, categories 6, static 14
--   reviews 0, comments 0, traveller photos 0, verified businesses 2
--
-- The template reads: "<name> is a <category> listed on Google Maps at
-- <address>. This entry was compiled from public map data and has not yet been
-- claimed by the business, so its details have not been confirmed by the
-- operator." Sample the site at random and 82% of what you land on is that
-- sentence with three words swapped — a page that states, in its own words,
-- that it contains unverified third-party data. That is what "low value
-- content" means, and no amount of rewriting the sentence fixes it, because
-- the problem is that there is nothing to say, not how it is said.
--
-- So these listings stay on the site and leave the index. They are genuinely
-- useful in the directory, in search and in near-me — somebody looking for car
-- hire in Arusha wants the full list. They are not useful as 2,207 separate
-- destinations arriving cold from a search engine.
--
-- Why a stored column rather than matching the text.
--
-- The rule would otherwise be a LIKE against an English sentence, evaluated in
-- two places, and it would rot the first time anybody edits the wording or
-- imports in another language. The marker is accurate exactly once — now — so
-- it is used once, here, and the answer is stored.
--
-- Claiming still wins at read time. Indexability is
-- (owner_id is not null or is_verified or not is_stub), so an operator who
-- claims their listing is indexed immediately, whether or not anything
-- remembered to clear this flag.
-- ===========================================================================

alter table businesses add column if not exists is_stub boolean not null default false;

comment on column businesses.is_stub is
  'Listing carries only imported map data and no original description. Excluded from the sitemap and served noindex, while staying fully live in the directory, search and near-me. Cleared when someone writes a real description; overridden at read time by ownership or verification.';

-- The one-time classification. Unclaimed, unverified, and still carrying the
-- sentence the importer wrote.
update businesses b
   set is_stub = true
 where b.owner_id is null
   and b.is_verified = false
   and exists (
     select 1 from business_translations t
      where t.business_id = b.id
        and t.description like '%compiled from public map data%'
   );

-- Partial, and on the complement: every query that uses this asks for the
-- listings that may be indexed, which is the small side — around 400 rows
-- against 2,200.
create index if not exists businesses_indexable_idx
  on businesses (status, updated_at)
  where is_stub = false and deleted_at is null;
