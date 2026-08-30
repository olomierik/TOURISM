-- ===========================================================================
-- 031 — Product events
--
-- page_views counts arrivals. It cannot say whether anybody did anything after
-- arriving, which is the only question that decides whether more traffic is
-- worth paying for. 42 page views and 0 leads is a funnel with no
-- instrumentation between the two ends.
--
-- The taxonomy is the one named in the build brief: search_started through
-- subscription_started. Enumerated rather than free text, because a typo'd
-- event name is a metric that silently reports zero forever — the same failure
-- shape as an empty table that nobody notices.
--
-- Insert-only from the browser and never readable by it. An events table a
-- visitor can select is a list of what every other visitor did.
-- ===========================================================================

create type analytics_event as enum (
  'search_started',
  'search_result_clicked',
  'destination_viewed',
  'business_viewed',
  'whatsapp_clicked',
  'phone_clicked',
  'quote_started',
  'quote_submitted',
  'quote_response_received',
  'review_submitted',
  'trip_planner_started',
  'trip_planner_completed',
  'save_clicked',
  'signup_completed',
  'business_signup',
  'subscription_started'
);

create table analytics_events (
  id           uuid primary key default gen_random_uuid(),
  event        analytics_event not null,

  -- Where it happened, and in which language. The locale is the point: the
  -- whole strategy rests on German converting better than English, and that is
  -- unanswerable without it on every event.
  path         text,
  locale       text,

  -- Same rotating daily HMAC as page_views, so a session can be followed
  -- through a funnel for one day and is unlinkable the next.
  visitor_hash text,

  -- Small, non-identifying context: which destination, which category, how many
  -- travellers. Never an email, a name or a message body.
  props        jsonb not null default '{}'::jsonb,

  created_at   timestamptz not null default now()
);

create index analytics_events_event_time on analytics_events (event, created_at desc);
create index analytics_events_locale on analytics_events (locale, created_at desc)
  where locale is not null;
create index analytics_events_visitor on analytics_events (visitor_hash, created_at)
  where visitor_hash is not null;

alter table analytics_events enable row level security;

-- Anyone may record what they did; nobody may read it back. Reporting runs
-- through the service role in the admin metrics view.
create policy analytics_events_insert on analytics_events
  for insert to anon, authenticated with check (true);

create policy analytics_events_admin_read on analytics_events
  for select to authenticated using (is_admin());

comment on table analytics_events is
  'Product funnel events. Insert-only from the browser; readable by admins and the service role.';
