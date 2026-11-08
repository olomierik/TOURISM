-- ===========================================================================
-- 073 — A WhatsApp chat has to come from someone who was on the site
--
-- Measured on 8 Nov 2026, over the preceding 30 days:
--
--   page_views                        246
--   distinct page_views visitor-days  105
--   contact_clicks                    839
--   listings those clicks touched     257
--   contact_clicks carrying a lead_id   0
--   leads, all time                     5
--
-- 3.4 WhatsApp chats per page view cannot happen. A traveller does not press
-- the chat button three times for every page they load, and 069's unique index
-- already allows only one chat per visitor per operator per day.
--
-- It is not one scraper either. Splitting the 839 by how many operators a
-- single visitor_hash touched in a day:
--
--   1 operator    787 visitor-days   787 clicks
--   2-4 operators   1 visitor-day      4 clicks
--   5+ operators    3 visitor-days    48 clicks
--
-- 787 clicks from 787 identities that each touched exactly one operator and
-- loaded no pages at all. Distributed traffic with rotating addresses, not a
-- harvester and not 787 travellers.
--
-- The cause is that /api/whatsapp/<business> is a bare GET that writes a row
-- before it redirects, and the only gate is a user-agent blocklist. Anything
-- that sends an ordinary-looking agent string and follows a link is recorded
-- as a chat. robots.txt disallows /api/, so the well-behaved crawlers stay out
-- and the impolite ones are the whole population.
--
-- This matters beyond analytics. Operators are shown this number for their own
-- listing on /dashboard/analytics, and docs/monetisation-model.md used it to
-- size the pay-per-lead opportunity.
--
-- ---------------------------------------------------------------------------
-- What changes
--
-- The route now requires evidence that the visitor was actually on the site:
-- a page_views row for the same daily visitor hash. The 787 have none, by
-- definition. Both numbers then come from the same population, which also
-- makes chats-per-view a ratio that means something; today it is 3.4.
--
-- The cost is real and worth stating: the view beacon is JavaScript, so a
-- visitor with scripts off or an ad blocker will no longer have their chat
-- counted. 069 deliberately counted those. An undercount of a few percent is
-- the better error than an overcount of 240%, and page_views has always
-- documented itself as a floor rather than a total — now contact_clicks is a
-- floor measured against the same floor.
--
-- user_agent and referrer are recorded so the next argument about this number
-- is settled with a query instead of an inference.
--
-- Nothing is backfilled and nothing is deleted. The rows before this migration
-- are a record of requests that really arrived; they are just not chats. Code
-- reads them from CONTACT_CLICKS_TRUSTED_FROM in lib/analytics/visitor.ts so
-- the dashboard stops presenting them to operators as contacts.
-- ===========================================================================

alter table contact_clicks add column if not exists user_agent text;
alter table contact_clicks add column if not exists referrer text;

comment on column contact_clicks.user_agent is
  'Agent string of the request that was counted, truncated to 512 chars. Recorded from migration 073 so a disputed count can be audited rather than argued about. Null on every row written before 073.';

comment on column contact_clicks.referrer is
  'Referer of the request that was counted — always same-origin, because a chat is only counted when it came from a page on this site. Null on every row written before 073, and null afterwards when the browser sent no Referer.';

comment on table contact_clicks is
  'WhatsApp chats started from the site, one per visitor per operator per day. From migration 073 a row is written only when the same daily visitor hash also has a page_views row, so these are chats by people the site actually saw. Rows before 2026-11-08 are unfiltered request counts and are excluded by CONTACT_CLICKS_TRUSTED_FROM in application code.';

-- The gate reads page_views by visitor hash within the day. Nothing has ever
-- queried this table that way, so there is no index for it: without one the
-- lookup is a sequential scan on the busiest analytics table, on the request
-- path of every WhatsApp tap.
--
-- visitor_hash is nullable on page_views and a null tells the gate nothing, so
-- the index covers only the rows it can answer from.
create index if not exists page_views_visitor_time_idx
  on page_views (visitor_hash, created_at desc)
  where visitor_hash is not null;

-- A chat the gate turned away is still worth seeing: it is the only way to
-- tell whether this migration worked, and the only way we would notice it
-- rejecting real travellers. It goes to analytics_events, which is admin-only
-- and never reaches an operator's dashboard, carrying the agent and referrer
-- that were refused.
--
-- analytics_events.event is an enum, so an unknown value is rejected by the
-- database rather than stored — the same trap 054 documented. Postgres 12 and
-- later allow ADD VALUE inside a transaction provided the value is not used in
-- the same one; nothing here uses it, so this is safe under the migration
-- runner, which wraps every file in a transaction.
alter type analytics_event add value if not exists 'whatsapp_uncounted';
