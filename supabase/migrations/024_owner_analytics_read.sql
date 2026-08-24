-- ===========================================================================
-- 024 — Let a business owner read their own page views
--
-- page_views had exactly two policies: anyone may INSERT, and only an admin may
-- SELECT. That was correct while the table only fed admin reporting, and it made
-- the owner analytics screen impossible: the rows exist, the query runs, and RLS
-- returns nothing, so every tile reads zero with no error to explain it.
--
-- Scoped to the caller's own business through owns_business(), which is the same
-- predicate the rest of the owner surface uses. An owner sees traffic to their
-- own listing and nothing else — not another operator's, and not the rows with a
-- null business_id, which record general page traffic and are nobody's to read
-- but ours.
--
-- visitor_hash is a hash rather than an address, and it is what makes "unique
-- visitors" countable without handing anyone a way to identify a person.
-- ===========================================================================

drop policy if exists page_views_read_own on page_views;
create policy page_views_read_own on page_views
  for select to authenticated
  using (business_id is not null and owns_business(business_id));

-- The owner query filters by business_id and a date range on every call.
create index if not exists page_views_business_time_idx
  on page_views (business_id, created_at desc)
  where business_id is not null;
