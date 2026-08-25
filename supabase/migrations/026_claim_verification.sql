-- ===========================================================================
-- 026 — Proving a claim by the address the register already published
--
-- The claim flow shipped with evidence text and manual review: a claimant types
-- a licence number and an admin checks it by hand. That works for a handful and
-- does not work for 1,336 listings, and it asks the reviewer to authenticate
-- someone from a paragraph they wrote about themselves.
--
-- The stronger signal was there all along. 403 listings carry an email address
-- that came from KATO's members directory or the Uganda Tourism Board register —
-- published by the operator, to the regulator, as their contact address. Send a
-- code there and only someone with access to that mailbox can complete the
-- claim. That is a fact about control, not an assertion about identity.
--
-- The code never touches a table the claimant can read. business_claims is
-- readable by its claimant, and a six-digit code has a million possibilities —
-- a hash sitting in a row they can select is a hash they can brute-force
-- offline in seconds. So it lives here, in a table with RLS on and no policy at
-- all, which makes it invisible to anon and authenticated alike. Only the
-- service role reaches it, the same way schema_migrations is handled.
-- ===========================================================================

create table claim_verifications (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,

  -- HMAC of the code, never the code. Verifying is recomputing and comparing.
  code_hash     text not null,
  -- The address it went to, kept so a reviewer can see which mailbox proved it.
  sent_to       text not null,

  attempts      smallint not null default 0,
  expires_at    timestamptz not null,
  verified_at   timestamptz,

  created_at    timestamptz not null default now(),

  -- One live challenge per person per listing. Re-requesting replaces it.
  unique (business_id, profile_id)
);

create index claim_verifications_expiry on claim_verifications (expires_at)
  where verified_at is null;

-- RLS on, no policies: invisible to every client role. Deliberate.
alter table claim_verifications enable row level security;

-- ---------------------------------------------------------------------------
-- How the claim was proved, for the reviewer and for the record.
--
-- 'email' means someone opened the mailbox the licensing register publishes for
-- this business. 'manual' means an admin read the evidence and decided. The
-- distinction matters when a claim is contested later.
-- ---------------------------------------------------------------------------
create type claim_verification_method as enum ('email', 'manual');

alter table business_claims
  add column if not exists verified_at timestamptz,
  add column if not exists verification_method claim_verification_method,
  add column if not exists verified_contact text;

-- A verified claim is the one a reviewer should see first: it needs the least
-- work and it is the one an operator is waiting on.
create index if not exists business_claims_verified_first
  on business_claims (status, verified_at desc nulls last, created_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- A claimant must not be able to mark their own claim verified.
--
-- The columns above are written by the server after a code matches. RLS already
-- lets a claimant update their own row so they can withdraw it, which means
-- without this they could set verified_at themselves and walk past the strongest
-- signal the reviewer has.
-- ---------------------------------------------------------------------------
create or replace function business_claims_guard_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    if new.verified_at is distinct from old.verified_at
       or new.verification_method is distinct from old.verification_method
       or new.verified_contact is distinct from old.verified_contact then
      raise exception 'Claim verification is set by the server, not by the claimant'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger business_claims_guard_verification_trigger
  before update on business_claims
  for each row execute function business_claims_guard_verification();
