-- ===========================================================================
-- 057 — Regions get a slug
--
-- The directory's filters are its search surface: every combination is a URL
-- that can be shared, bookmarked and crawled, which is why the filter form is
-- a plain GET rather than client state. A region filter keyed by uuid would
-- have broken that — /directory?region=8f3a9c1e-… is not a link anybody sends
-- anyone, and it tells a search engine nothing.
--
-- Checked before choosing: the 87 region names produce 87 distinct slugs, with
-- no collision across the four countries. So the slug can be globally unique
-- and a region filter needs no country beside it to be unambiguous.
-- ===========================================================================

alter table regions add column if not exists slug text;

update regions
   set slug = lower(
     regexp_replace(
       regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
       '(^-|-$)', '', 'g'
     )
   )
 where slug is null;

alter table regions alter column slug set not null;

-- Unique rather than merely indexed. If a region is added later whose name
-- slugs to something that already exists, this fails loudly at insert — which
-- is the right moment to notice, rather than the day two regions start
-- answering to the same URL.
create unique index if not exists regions_slug_key on regions (slug);

comment on column regions.slug is
  'URL-safe name, unique across all countries, so /directory?region=arusha needs no country alongside it.';
