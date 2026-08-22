-- ===========================================================================
-- 010 — Operational tables: favorites, notifications, audit log, analytics
-- ===========================================================================

create table favorites (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  business_id  uuid references businesses(id) on delete cascade,
  package_id   uuid references packages(id) on delete cascade,
  created_at   timestamptz not null default now(),

  constraint favorites_has_target check (
    (business_id is not null)::int + (package_id is not null)::int = 1
  )
);

-- Partial unique indexes rather than one composite: a null column would let the
-- same business be favorited repeatedly, since null never equals null.
create unique index favorites_unique_business
  on favorites (profile_id, business_id) where business_id is not null;
create unique index favorites_unique_package
  on favorites (profile_id, package_id) where package_id is not null;
create index favorites_profile_idx on favorites (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notifications
--
-- Rows are the in-app inbox and the queue an email worker drains. Keeping both
-- in one table means an email failure never loses the in-app notification.
-- ---------------------------------------------------------------------------
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  kind         notification_kind not null,

  -- Rendered from i18n keys at read time so a notification created in August
  -- still displays in whatever language the recipient uses in December.
  payload      jsonb not null default '{}'::jsonb,

  lead_id      uuid references leads(id) on delete cascade,
  business_id  uuid references businesses(id) on delete cascade,

  read_at      timestamptz,

  email_status text not null default 'pending',
  email_sent_at timestamptz,
  email_error  text,

  created_at   timestamptz not null default now(),

  constraint notifications_email_status_valid
    check (email_status in ('pending', 'sent', 'failed', 'skipped'))
);

create index notifications_inbox_idx
  on notifications (profile_id, created_at desc) where read_at is null;
create index notifications_email_queue_idx
  on notifications (created_at) where email_status = 'pending';

-- ---------------------------------------------------------------------------
-- Audit log
--
-- Append-only record of consequential admin actions: approvals, verifications,
-- suspensions, plan changes. Needed both for support ("why was I suspended?")
-- and for holding staff accountable.
-- ---------------------------------------------------------------------------
create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles(id) on delete set null,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  ip_address   inet,
  created_at   timestamptz not null default now()
);

create index audit_logs_entity_idx on audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on audit_logs (actor_id, created_at desc);
create index audit_logs_created_idx on audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Page views
--
-- Coarse, first-party analytics for the numbers the business model turns on:
-- profile views, package views, and which pages produce enquiries. Not a
-- replacement for a real analytics product, but it answers "is my listing
-- getting seen?" for an operator without depending on one.
--
-- No cookies, no cross-site identifiers: `visitor_hash` is a daily-rotating
-- salted hash, enough to deduplicate a session and nothing more.
-- ---------------------------------------------------------------------------
create table page_views (
  id            bigserial primary key,
  path          text not null,
  locale        text references locales(code) on delete set null,

  business_id   uuid references businesses(id) on delete cascade,
  package_id    uuid references packages(id) on delete cascade,
  guide_id      uuid references guides(id) on delete cascade,
  destination_id uuid references destinations(id) on delete cascade,

  visitor_hash  text,
  referrer      text,
  country       char(2),

  created_at    timestamptz not null default now()
);

create index page_views_business_idx on page_views (business_id, created_at desc)
  where business_id is not null;
create index page_views_guide_idx on page_views (guide_id, created_at desc)
  where guide_id is not null;
create index page_views_created_idx on page_views (created_at desc);

-- ---------------------------------------------------------------------------
-- Platform settings
--
-- Runtime configuration the admin can change without a deploy. The spec calls
-- for a toggleable business auto-approval; this is where that and its future
-- siblings live.
-- ---------------------------------------------------------------------------
create table platform_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

insert into platform_settings (key, value, description) values
  ('auto_approve_businesses', 'false'::jsonb,
   'Publish new business submissions without admin review.'),
  ('lead_distribution_limit', '5'::jsonb,
   'Maximum number of businesses a single enquiry is sent to.'),
  ('lead_min_quality_for_premium', '60'::jsonb,
   'Quality score at or above which premium tiers get first access.'),
  ('reviews_require_moderation', 'true'::jsonb,
   'Hold new reviews for admin approval before publishing.');
