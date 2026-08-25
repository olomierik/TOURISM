-- ===========================================================================
-- 028 — Telling operators their listing exists
--
-- 1,336 listings, 0 claims filed. The claim flow works, 1,029 listings can be
-- self-verified by their owner in under a minute, and not one operator has been
-- told any of it exists. Everything built so far is inert until someone is
-- asked.
--
-- This is the part of the plan that carries real reputational risk. The listings
-- were built from public licensing registers and Google Maps, which is defensible
-- and is what Yelp and TripAdvisor did — and it stops being defensible the moment
-- the message overstates what it is. So the constraints are in the schema, not
-- in a style guide someone can forget:
--
--   * Nothing sends without a human queueing it. Rows are born 'draft'.
--   * One send per business, ever, unless a human explicitly re-queues it.
--     A directory that emails an operator twice about the same listing is a
--     directory that gets reported.
--   * A suppression is permanent and outranks everything. Opting out must work
--     the first time and stay working.
--   * The provider that sent it is recorded. lib/notifications falls back to a
--     console provider that returns ok:true when no API key is set — correct for
--     leads, a disaster here, because it would mark 403 operators contacted while
--     nothing left the building and they could never be contacted again.
-- ===========================================================================

create type outreach_status as enum (
  'draft',      -- staged by a script, visible to an admin, not going anywhere
  'queued',     -- a human approved this batch
  'sent',       -- handed to a provider that accepted it
  'failed',     -- the provider refused; safe to retry
  'bounced',    -- the address is dead; do not retry
  'skipped'     -- suppressed, or the listing got claimed before we sent
);

create table operator_outreach (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,

  -- Snapshotted, not joined at send time. The address came from a specific
  -- register on a specific day, and a later import overwriting businesses.email
  -- must not silently redirect a message a human already approved.
  email        text not null,
  -- Where the address came from, so a reply asking "how did you get this"
  -- has an answer that took no research.
  source       text not null,

  batch        text not null,
  status       outreach_status not null default 'draft',

  subject      text not null,
  body         text not null,

  -- Which provider accepted it. 'console' means it was logged, never sent.
  provider     text,
  provider_ref text,
  error        text,

  queued_at    timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),

  constraint operator_outreach_email_shape check (email like '%_@_%.__%')
);

-- One live row per business. Re-staging replaces a draft; it cannot quietly
-- add a second message alongside one already sent.
create unique index operator_outreach_one_per_business
  on operator_outreach (business_id);

create index operator_outreach_batch on operator_outreach (batch, status);
create index operator_outreach_sendable on operator_outreach (status)
  where status in ('draft', 'queued');

-- ---------------------------------------------------------------------------
-- Opting out.
--
-- Keyed on the address rather than the business, because the person asking to
-- be left alone is a person, and the same address appears on more than one
-- listing in these registers. Survives the listing being deleted and re-imported,
-- which is the case that would otherwise reopen the door.
-- ---------------------------------------------------------------------------
create table outreach_suppressions (
  email      text primary key,
  reason     text not null default 'requested',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- A suppressed address can never be queued or sent. Enforced here rather than
-- in the sending script, because the script is the thing most likely to be
-- rewritten in a hurry.
-- ---------------------------------------------------------------------------
create or replace function operator_outreach_respect_suppression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('queued', 'sent')
     and exists (select 1 from outreach_suppressions s where s.email = new.email)
  then
    new.status := 'skipped';
    new.error  := 'suppressed';
    new.queued_at := null;
    new.sent_at := null;
  end if;
  return new;
end;
$$;

create trigger operator_outreach_respect_suppression
  before insert or update on operator_outreach
  for each row execute function operator_outreach_respect_suppression();

-- ---------------------------------------------------------------------------
-- Admin-only. These rows hold contact addresses for 400+ real businesses in one
-- table, which is a more attractive object than any single listing.
-- ---------------------------------------------------------------------------
alter table operator_outreach enable row level security;
alter table outreach_suppressions enable row level security;

create policy operator_outreach_admin on operator_outreach
  for all to authenticated using (is_admin()) with check (is_admin());

create policy outreach_suppressions_admin on outreach_suppressions
  for all to authenticated using (is_admin()) with check (is_admin());

comment on table operator_outreach is
  'One message per unclaimed listing, staged as draft and sent only after a human queues the batch.';
comment on column operator_outreach.provider is
  'Which provider accepted it. console = logged locally, never actually sent.';
