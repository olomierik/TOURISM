-- 064 — Verified traveller reviews, by invitation after a won enquiry.
--
-- 022 marks a review "verified enquiry" when the author really sent the
-- enquiry to this business. This adds the stronger mark: the operator marked
-- that enquiry won, so the author travelled with them. Like the enquiry mark,
-- it is set by trigger from the database's own records and can never be set
-- or changed by a client.
--
-- The invitation: when an enquiry is marked won, the traveller is emailed a
-- link carrying the lead_businesses row's review key. Travellers who enquired
-- without an account review from that link too; the server attaches the
-- enquiry to an account for their email address before writing the review.

alter table reviews
  add column if not exists is_verified_booking boolean not null default false;

comment on column reviews.is_verified_booking is
  'True when the enquiry behind this review was marked won by this business: the author travelled with them. Set by trigger, never by the client.';

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
    new.is_verified_booking := false;
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
  new.is_verified_booking := exists (
    select 1 from lead_businesses lb
    where lb.lead_id = new.lead_id
      and lb.business_id = new.business_id
      and lb.status = 'won'
  );
  return new;
end;
$$;

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
  new.is_verified_booking := old.is_verified_booking;
  return new;
end;
$$;

alter table lead_businesses
  add column if not exists review_token uuid not null default gen_random_uuid(),
  add column if not exists review_invited_at timestamptz;

create unique index if not exists lead_businesses_review_token_idx on lead_businesses (review_token);
