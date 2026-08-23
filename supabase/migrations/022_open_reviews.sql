-- ===========================================================================
-- 022 — Let travelers review without a prior enquiry
--
-- reviews_require_interaction() rejected any review whose lead_id was not a real
-- enquiry distributed to that business by that traveler. As anti-fraud design
-- that is strong: you cannot review a company you never contacted.
--
-- As product design on a directory with almost no traffic it is fatal. It means
-- the only people who can review are those who happened to send an enquiry
-- through this specific site, so a traveler who used an operator last year and
-- wants to say so is refused — and in practice the review count stays at zero,
-- which is precisely what makes a directory look abandoned.
--
-- The gate is removed. What the gate was actually protecting — the reader's
-- ability to tell a real customer from a stranger — is preserved instead as a
-- visible mark, which is the more honest mechanism: it adds information rather
-- than removing the ability to speak.
--
-- Three defences remain, and they are the ones that matter:
--
--   * one review per person per business, enforced by the existing unique
--     constraint on (business_id, author_id);
--   * an owner may not review their own listing, checked in the action;
--   * a supplied lead_id is still validated, so the verified mark cannot be
--     claimed by inventing an enquiry id.
-- ===========================================================================

alter table reviews add column if not exists is_verified_enquiry boolean not null default false;

comment on column reviews.is_verified_enquiry is
  'True when this review is backed by an enquiry the author actually sent to this business through the platform. Set by trigger, never by the client.';

create or replace function reviews_require_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_demo or is_admin() then
    return new;
  end if;

  -- No enquiry supplied: allowed, and plainly marked as unverified.
  if new.lead_id is null then
    new.is_verified_enquiry := false;
    return new;
  end if;

  -- An enquiry WAS supplied, so it must be genuine. Without this check the
  -- verified mark would be self-assignable and therefore worthless.
  if not exists (
    select 1
    from lead_businesses lb
    join leads l on l.id = lb.lead_id
    where lb.lead_id = new.lead_id
      and lb.business_id = new.business_id
      and l.traveler_id = new.author_id
  ) then
    raise exception 'Enquiry % was never sent to this business by this traveler', new.lead_id
      using errcode = 'check_violation';
  end if;

  new.is_verified_enquiry := true;
  return new;
end;
$$;

-- The client must never be able to set the mark directly. An UPDATE policy on
-- reviews already lets an author edit their own row, so without this an author
-- could flip the flag on afterwards.
create or replace function reviews_protect_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;
  new.is_verified_enquiry := old.is_verified_enquiry;
  return new;
end;
$$;

drop trigger if exists reviews_protect_verified_trigger on reviews;
create trigger reviews_protect_verified_trigger
  before update on reviews
  for each row execute function reviews_protect_verified();

-- ---------------------------------------------------------------------------
-- Backfill: every review that already exists got in under the old rule, so by
-- definition it was backed by a real enquiry.
-- ---------------------------------------------------------------------------
update reviews set is_verified_enquiry = true where lead_id is not null;
