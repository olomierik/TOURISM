-- ===========================================================================
-- 092 — Telling unclaimed operators how many travellers tried to reach them
--
-- 15 November 2026. An unclaimed operator cannot see that people are trying
-- to reach them through their listing. The first outreach email
-- (operator_outreach) told them a listing exists and promised, rightly, no
-- traffic. This is the follow-up that says what the listing actually did,
-- once it has done something.
--
-- The number must be true, because the operator can check it: every chat the
-- site opens is pre-written and names Explore Tanzania. It counts distinct
-- people, and never before CONTACT_CLICKS_TRUSTED_FROM (8 Nov 2026), when
-- contact_clicks stopped counting bots. A first count that skipped that floor
-- found 805 "taps"; the real figure since the floor was 1. The staging script
-- stages nothing until real chats exist.
--
-- Its own table rather than a second row in operator_outreach. That table has
-- a unique index on business_id that nine files rely on — admin pages, the
-- bounce webhook, the verify script — and loosening it would change what
-- every one of them means by "contacted". A report is a different message
-- with a different cadence, so it gets a different home and none of that code
-- changes.
--
-- One report per business per period ('2026-11'). The number in the message
-- is stored with it, so what a business was told can be read back exactly,
-- whatever contact_clicks says later.
--
-- Admin-only, like operator_outreach. Single-use claim links reuse
-- claim_invites, whose outreach_id is nullable for this reason.
-- ===========================================================================
begin;

create table if not exists operator_contact_reports (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  email        text not null,
  period       text not null check (period ~ '^\d{4}-\d{2}$'),
  contacts     integer not null check (contacts > 0),
  batch        text not null,
  status       outreach_status not null default 'draft',
  subject      text not null,
  body         text not null,
  provider     text,
  provider_ref text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (business_id, period)
);

comment on table operator_contact_reports is
  'Monthly emails to unclaimed operators stating how many people opened WhatsApp to them from their listing. Staged as drafts by scripts/stage-contact-reports.mjs; sent only by scripts/send-contact-reports.mjs with --confirm.';
comment on column operator_contact_reports.contacts is
  'The number the message states, frozen when it was drafted: distinct people who opened a WhatsApp chat from the listing, counted from no earlier than 2026-11-08.';

create index if not exists operator_contact_reports_batch on operator_contact_reports (batch, status);

alter table operator_contact_reports enable row level security;
create policy operator_contact_reports_admin on operator_contact_reports
  for all to authenticated using (is_admin()) with check (is_admin());

commit;
