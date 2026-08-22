-- ===========================================================================
-- 001 — Extensions, enums and shared helpers
-- ===========================================================================

create extension if not exists pg_trgm;      -- fuzzy / typo-tolerant search
create extension if not exists unaccent;     -- fold accents: "Sansibar" ~ "Zanzibar", "forêt" ~ "foret"
create extension if not exists citext;       -- case-insensitive email comparison

-- ---------------------------------------------------------------------------
-- Enums
--
-- Enums are used where the value set is genuinely fixed by application logic.
-- Locales deliberately are NOT an enum — see the `locales` table below.
-- ---------------------------------------------------------------------------

create type user_role as enum ('traveler', 'business_owner', 'admin');

create type business_status as enum (
  'draft',      -- owner is still filling it in
  'pending',    -- submitted, awaiting admin review
  'approved',   -- publicly visible
  'rejected',   -- admin declined, owner may revise
  'suspended'   -- was live, pulled by admin
);

create type subscription_tier as enum ('free', 'premium', 'featured');

create type subscription_status as enum ('active', 'past_due', 'canceled', 'expired');

create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

-- Lifecycle of the traveler's enquiry as a whole.
create type lead_status as enum (
  'new',          -- created, not yet matched
  'distributed',  -- sent to at least one business
  'in_progress',  -- at least one business responded
  'closed',       -- traveler booked or went cold
  'spam'
);

-- Lifecycle of one business's copy of a lead. Distinct from lead_status because
-- five businesses can each be at a different stage on the same enquiry.
create type lead_business_status as enum (
  'sent',
  'viewed',
  'responded',
  'quoted',
  'won',
  'lost',
  'declined'
);

create type review_status as enum ('pending', 'published', 'rejected');

create type content_status as enum ('draft', 'published', 'archived');

create type media_kind as enum ('logo', 'cover', 'gallery', 'guide_cover', 'avatar');

create type notification_kind as enum (
  'lead_new',
  'lead_status_changed',
  'business_approved',
  'business_rejected',
  'verification_decision',
  'subscription_status',
  'review_published'
);

-- ---------------------------------------------------------------------------
-- Locales
--
-- A table rather than an enum: `alter type ... add value` cannot run inside the
-- transaction each migration executes in, so adding Swahili later would mean a
-- special-case migration. A row insert is ordinary DML and admins can manage it.
-- `pg_catalog` names the Postgres text-search dictionary used for that language,
-- which is what makes per-locale full-text ranking work.
-- ---------------------------------------------------------------------------

create table locales (
  code         text primary key,
  name         text        not null,
  native_name  text        not null,
  pg_catalog   regconfig   not null,
  is_active    boolean     not null default true,
  sort_order   smallint    not null default 0
);

insert into locales (code, name, native_name, pg_catalog, sort_order) values
  ('en', 'English', 'English',  'english', 1),
  ('de', 'German',  'Deutsch',  'german',  2),
  ('fr', 'French',  'Français', 'french',  3),
  ('it', 'Italian', 'Italiano', 'italian', 4);

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at honest without every caller remembering to set it.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- URL-safe slug from arbitrary text. unaccent first so "Ngorongoro Krater" and
-- "Forêt" produce clean ASCII slugs rather than percent-encoded noise.
create or replace function slugify(input text)
returns text
language sql
immutable
strict
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(unaccent(input)), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- Role-check helpers live in 002, after `profiles` exists — Postgres validates
-- SQL function bodies at creation time, so they cannot be declared before the
-- table they read.
