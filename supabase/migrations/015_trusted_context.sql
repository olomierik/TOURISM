-- ===========================================================================
-- 015 — Let trusted server contexts through the privileged-field guards
--
-- The guards added in 013 reject writes to status, tier, verification and
-- ownership unless is_admin() passes. That is right for a browser session, but
-- it also blocks the service role and direct database connections — which is
-- how migrations, seeds and server-side jobs run. Those contexts have no
-- auth.uid() at all, so is_admin() is false and legitimate writes fail.
--
-- Treating "no authenticated user" as trusted is safe here because it is not
-- reachable from the client: an anon PostgREST request never satisfies the RLS
-- policies that gate these tables in the first place (they all require
-- owner_id = auth.uid() or is_admin()), so the trigger is never reached. The
-- only callers with a null auth.uid() are the ones holding the service key or a
-- direct connection, both of which already bypass RLS entirely.
-- ===========================================================================

create or replace function is_trusted_context()
returns boolean
language sql
stable
as $$
  -- No authenticated user => service role, direct connection, or a migration.
  select auth.uid() is null;
$$;

create or replace function businesses_guard_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_trusted_context() or is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
     and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
    raise exception 'Business status is set by review, not by the owner'
      using errcode = 'insufficient_privilege';
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.verified_by is distinct from old.verified_by then
    raise exception 'Verification is an administrator decision'
      using errcode = 'insufficient_privilege';
  end if;

  if new.tier is distinct from old.tier then
    raise exception 'Tier follows the active subscription'
      using errcode = 'insufficient_privilege';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'Ownership cannot be reassigned by the owner'
      using errcode = 'insufficient_privilege';
  end if;

  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.response_rate := old.response_rate;
  new.avg_response_minutes := old.avg_response_minutes;

  return new;
end;
$$;

create or replace function profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not is_admin()
     and not is_trusted_context() then
    raise exception 'Only an administrator may change a user role'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create or replace function lead_businesses_guard_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_trusted_context() or is_admin() then
    return new;
  end if;

  if new.lead_id is distinct from old.lead_id
     or new.business_id is distinct from old.business_id
     or new.rank is distinct from old.rank
     or new.match_reason is distinct from old.match_reason
     or new.sent_at is distinct from old.sent_at then
    raise exception 'Lead distribution records cannot be rewritten'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create or replace function reviews_guard_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_trusted_context() or is_admin() then
    return new;
  end if;

  if owns_business(new.business_id) and new.author_id <> (select auth.uid()) then
    if new.rating is distinct from old.rating
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.status is distinct from old.status then
      raise exception 'A business may reply to a review but not alter it'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Review publication is a moderation decision'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create or replace function reviews_require_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_demo or is_admin() or is_trusted_context() then
    return new;
  end if;

  if new.lead_id is null then
    raise exception 'A review must reference the enquiry it came from'
      using errcode = 'check_violation';
  end if;

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

  return new;
end;
$$;
