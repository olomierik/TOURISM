-- Where a crawl of an operator's own website puts what it found.
--
-- 3,435 of 3,852 approved listings are stubs (migration 059's rule: a listing
-- with no owner, no verification and no real description). They are kept out of
-- the sitemap, which is why the directory is honest, and it is also why 89% of
-- it earns nothing: those pages are not in Google.
--
-- Two things would clear that, and both need the same raw material:
--
--   reachable  — 818 of the 3,435 have an email address, so a traveller's
--                enquiry can reach 24% of them. 2,210 publish a website, and a
--                website almost always publishes an address.
--   indexable  — `is_stub` falls away when a listing has a real description.
--                Writing 3,435 descriptions out of the fields we already hold
--                (name, category, town) would produce 3,435 paragraphs of the
--                same sentence, which is the thin content that got AdSense to
--                say no in the first place. Facts an operator states about
--                itself — the year it started, the register it is on, the
--                languages it guides in — are what makes a description worth
--                reading and worth indexing.
--
-- So this table holds the crawl, not the copy. One row per listing per crawl,
-- the extracted facts as jsonb and the page text that produced them, kept so a
-- later pass can compose a description without fetching 2,210 sites again and
-- so any sentence we publish can be traced back to the page it came from.
--
-- Deliberately not merged into `businesses`: this is machine-read evidence of
-- varying quality, and it must stay separable from the fields a person typed.
-- The crawler writes `businesses.email` and friends only where they are null
-- (see scripts/crawl-stub-sites.mjs); everything else stops here until a human
-- or a composition pass promotes it.

create table if not exists business_crawl_facts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,

  -- What was fetched. `url` is the page the facts came from, which is not
  -- always `businesses.website`: the address usually lives on /contact.
  url text not null,
  http_status int2,
  -- null when the fetch never completed; the reason is in `error`.
  fetched_at timestamptz not null default now(),
  error text,

  -- Extracted, each one nullable because most sites state only some of them.
  emails text[] not null default '{}',
  phones text[] not null default '{}',
  founded_year int2,
  license_numbers text[] not null default '{}',
  associations text[] not null default '{}',
  languages text[] not null default '{}',
  -- Free-shape remainder: fleet, team size, park permits, award claims,
  -- anything the extractor learns to read later without a migration.
  facts jsonb not null default '{}'::jsonb,

  -- The evidence. Visible text only, capped by the crawler, so a description
  -- composed later can quote a fact and name its source. Not for publishing
  -- verbatim: republishing an operator's own paragraphs is duplicate content
  -- and would make the indexing problem worse rather than better.
  page_title text,
  page_text text,

  created_at timestamptz not null default now()
);

comment on table business_crawl_facts is
  'Machine-read facts from an operator''s own website, kept apart from the fields a person typed. Raw material for contact enrichment and for composing original listing descriptions; never published verbatim.';

-- One pass per listing per run, and the newest is the one that counts.
create index if not exists business_crawl_facts_business_idx
  on business_crawl_facts (business_id, fetched_at desc);

-- "Which stubs still have no address" — the crawler's own resume query.
create index if not exists business_crawl_facts_fetched_idx
  on business_crawl_facts (fetched_at desc);

-- No RLS policy and no grant: this is a service-role staging table. The
-- anonymous and authenticated roles have no business reading scraped page text,
-- and nothing in the app queries it — only scripts/crawl-stub-sites.mjs writes
-- it and the description pass reads it, both through the service key.
alter table business_crawl_facts enable row level security;
