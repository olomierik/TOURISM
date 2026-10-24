-- ===========================================================================
-- 067 — Claim links that work once, and what Resend says about delivery
--
-- The outreach email used to carry the bare claim page. Opening it proved
-- nothing: the operator still had to request a code to the same mailbox the
-- link had just arrived in, or write a paragraph of evidence. A link that only
-- the listing's published mailbox received is that proof already, so each
-- message now carries its own token:
--
--   * One token per message, made when the message is sent, never stored in
--     plain text (only its SHA-256 is kept here).
--   * Single use: redeeming it stamps used_at in the same statement that checks
--     it, so two tabs cannot both spend it.
--   * It expires (30 days from sending), so a forwarded message in an old inbox
--     stops being a key to the listing.
--   * It files a verified claim. An admin still approves it: the link proves
--     the mailbox, not the right to run the business.
--
-- email_events records Resend's webhook deliveries, one row per svix-id, so a
-- retried delivery is handled once. Hard bounces, complaints and Resend's own
-- suppressions go into outreach_suppressions (the existing list, which already
-- outranks everything that sends outreach).
-- ===========================================================================

create table claim_invites (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  outreach_id  uuid references operator_outreach(id) on delete set null,
  -- The address the link was sent to: the proof a redeemed invite carries.
  email        text not null,
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  used_by      uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  check ((used_at is null) = (used_by is null))
);

create index claim_invites_business on claim_invites (business_id);

alter table claim_invites enable row level security;

-- Written and read by the server with the service role. Admins may look.
create policy claim_invites_admin_read on claim_invites
  for select to authenticated using (is_admin());

create table email_events (
  -- svix-id: the same delivery retried carries the same id.
  id            text primary key,
  type          text not null,
  email         text,
  provider_ref  text,
  -- What we did about it: 'suppressed', 'ignored', 'recorded'.
  action        text not null default 'recorded',
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create index email_events_email on email_events (email);
create index email_events_provider_ref on email_events (provider_ref);

alter table email_events enable row level security;

create policy email_events_admin_read on email_events
  for select to authenticated using (is_admin());
