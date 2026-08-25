-- ===========================================================================
-- 025 — Claiming a listing
--
-- The supply problem is the whole business problem: a directory with one
-- operator has nothing to sell a traveller and nothing to sell an operator. The
-- way out is the one Yelp and TripAdvisor used — publish listings built from
-- public licensing registries, then invite the operator to take theirs over.
--
-- businesses.owner_id has always been nullable, so an unowned listing already
-- worked. What was missing is the transfer: a way for someone to say "this is
-- mine", and for an admin to decide whether it is.
--
-- The security property that matters: approving a claim hands over control of a
-- listing — its contact details, its enquiries, its lead routing. That decision
-- must be admin-only and must be impossible to reach from the client, in the
-- same way tier and verification already are. A claimant who could approve
-- their own claim could take over any listing on the site.
-- ===========================================================================

create type claim_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

-- Null means nobody has taken this listing over yet, which the public page says
-- out loud. Set when a claim is approved, and never cleared by hand: an
-- ownership transfer should leave the audit trail the claims table provides.
alter table businesses add column if not exists claimed_at timestamptz;

create table business_claims (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,

  -- The account that will receive the listing. Required: a claim that cannot be
  -- granted to anyone is a contact form, not a claim.
  claimant_id  uuid not null references profiles(id) on delete cascade,

  -- Captured at submission rather than read from the profile at review time.
  -- These are what the reviewer checked against the licensing registry, and a
  -- claimant who edits their profile afterwards must not silently rewrite the
  -- evidence the decision was made on.
  contact_name  text not null,
  contact_email text not null,
  contact_phone text,

  -- Free text: licence number, registered address, company registration, a
  -- domain that matches the listed website. The reviewer's actual material.
  evidence     text,

  status       claim_status not null default 'pending',

  reviewed_by  uuid references profiles(id) on delete set null,
  reviewed_at  timestamptz,
  review_note  text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint claim_contact_email_valid check (position('@' in contact_email) > 1),
  -- A decision has to record who made it and when.
  constraint claim_reviewed_complete check (
    status in ('pending', 'withdrawn')
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

-- One open claim per person per listing. Two people may both claim the same
-- listing — that is a real case and the reviewer needs to see both — but one
-- person opening five claims on the same listing is noise.
create unique index business_claims_one_open
  on business_claims (business_id, claimant_id)
  where status = 'pending';

create index business_claims_review_queue
  on business_claims (status, created_at)
  where status = 'pending';
create index business_claims_business_idx on business_claims (business_id, created_at desc);

create trigger business_claims_set_updated_at
  before update on business_claims
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Approval transfers the listing.
--
-- Done in a trigger rather than in application code so the two writes cannot
-- come apart: an approved claim whose business still has no owner would show a
-- reviewer a completed task and leave the operator locked out, with nothing in
-- either table saying so.
--
-- Competing claims on the same listing are rejected in the same statement.
-- Leaving them pending would offer a second reviewer the chance to hand the
-- same listing to someone else.
-- ---------------------------------------------------------------------------
create or replace function business_claims_apply_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and coalesce(old.status, 'pending') <> 'approved' then
    update businesses
       set owner_id = new.claimant_id,
           claimed_at = now()
     where id = new.business_id;

    -- The claimant needs the role, or they cannot reach the dashboard they were
    -- just given. Never downgrade an admin.
    update profiles
       set role = 'business_owner'
     where id = new.claimant_id
       and role = 'traveler';

    update business_claims
       set status = 'rejected',
           reviewed_by = new.reviewed_by,
           reviewed_at = now(),
           review_note = coalesce(review_note, 'Listing claimed by another applicant.')
     where business_id = new.business_id
       and id <> new.id
       and status = 'pending';
  end if;

  return new;
end;
$$;

create trigger business_claims_apply_approval_trigger
  after update on business_claims
  for each row execute function business_claims_apply_approval();

-- ---------------------------------------------------------------------------
-- Only an admin decides.
--
-- RLS below already restricts UPDATE to admins, but a policy is one line away
-- from being loosened by someone adding a convenience path later. This makes
-- the rule an invariant of the table rather than of its current policy set —
-- the same belt-and-braces the tier and verification guards use, and for the
-- same reason: the failure is silent and the blast radius is every listing.
-- ---------------------------------------------------------------------------
create or replace function business_claims_guard_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected')
     and not is_admin() then
    raise exception 'Only an administrator may decide a listing claim'
      using errcode = 'insufficient_privilege';
  end if;

  -- The claimant may withdraw, and that is all they may change.
  if not is_admin() then
    if new.business_id is distinct from old.business_id
       or new.claimant_id is distinct from old.claimant_id
       or new.evidence is distinct from old.evidence
       or new.reviewed_by is distinct from old.reviewed_by then
      raise exception 'A claim may only be withdrawn by its claimant'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger business_claims_guard_decision_trigger
  before update on business_claims
  for each row execute function business_claims_guard_decision();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table business_claims enable row level security;

-- A claimant sees their own claims and nobody else's. Claims name a person, an
-- email and a phone number; they are not public.
create policy business_claims_read_own on business_claims
  for select to authenticated
  using (claimant_id = (select auth.uid()) or is_admin());

-- You may only file a claim as yourself, and only on a listing that is actually
-- unclaimed. Without the second test this is a way to contest a live operator's
-- listing and generate review work indefinitely.
create policy business_claims_insert on business_claims
  for insert to authenticated
  with check (
    claimant_id = (select auth.uid())
    and exists (
      select 1 from businesses b
      where b.id = business_id
        and b.owner_id is null
        and b.status = 'approved'
        and b.deleted_at is null
    )
  );

create policy business_claims_update on business_claims
  for update to authenticated
  using (is_admin() or claimant_id = (select auth.uid()))
  with check (is_admin() or claimant_id = (select auth.uid()));

-- No delete policy. A withdrawn or rejected claim is the record of who asked
-- for a listing and what was decided, which is exactly what you want when two
-- people claim the same operator.

-- ---------------------------------------------------------------------------
-- Unclaimed listings must be identifiable by an anonymous visitor, so the
-- public page can say so and offer the claim link. owner_id itself stays
-- unreadable — a nullable uuid is not something to expose — so this is a
-- derived boolean instead.
-- ---------------------------------------------------------------------------
create or replace function business_is_unclaimed(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from businesses
    where id = target
      and owner_id is null
      and status = 'approved'
      and deleted_at is null
  );
$$;

grant execute on function business_is_unclaimed(uuid) to anon, authenticated;
