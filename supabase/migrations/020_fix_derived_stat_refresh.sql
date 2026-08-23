-- ===========================================================================
-- 020 — Let the internal refresh functions actually write derived aggregates
--
-- businesses_guard_privileged_fields (013) forces rating_avg, rating_count,
-- response_rate and avg_response_minutes back to their previous values on any
-- update that is not admin or trusted. That is correct for an owner editing
-- their profile — those columns are derived and must not be writable by hand.
--
-- But it also fires when refresh_business_response_stats and
-- refresh_business_rating write the values they have just computed. Those run
-- SECURITY DEFINER, which changes the privilege context but NOT auth.uid():
-- the setting still names the original caller, so is_trusted_context() is false,
-- is_admin() is false, and the guard reverts the write.
--
-- The failure is completely silent — the update reports success and the numbers
-- simply never change. It matters because those columns are the responsiveness
-- and rating signals that drive directory ranking and the public "typically
-- replies in ~Nh" badge, which is most of what a premium tier is selling.
--
-- Fix: the refresh functions announce themselves with a transaction-local
-- setting, and the guard steps aside for that one case. Transaction-local
-- (is_local = true) so the flag cannot leak into a later statement on a pooled
-- connection, and set only immediately around the write.
-- ===========================================================================

create or replace function refresh_business_response_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  perform set_config('app.internal_refresh', 'on', true);

  update businesses b
  set response_rate = stats.rate,
      avg_response_minutes = stats.avg_minutes
  from (
    select
      round(
        100.0 * count(*) filter (where responded_at is not null) / nullif(count(*), 0),
        2
      ) as rate,
      avg(response_minutes) filter (where response_minutes is not null)::integer as avg_minutes
    from lead_businesses
    where business_id = target
  ) stats
  where b.id = target;

  perform set_config('app.internal_refresh', 'off', true);
  return null;
end;
$$;

create or replace function refresh_business_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  perform set_config('app.internal_refresh', 'on', true);

  update businesses b
  set rating_avg = coalesce(stats.avg_rating, 0),
      rating_count = coalesce(stats.n, 0)
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*) as n
    from reviews
    where business_id = target
      and status = 'published'
      and deleted_at is null
  ) stats
  where b.id = target;

  perform set_config('app.internal_refresh', 'off', true);
  return null;
end;
$$;

create or replace function businesses_guard_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Set only by the two refresh functions above, immediately around their own
  -- write, and transaction-local. Nothing reachable from a client can set it:
  -- PostgREST does not expose set_config, and the flag is cleared before the
  -- surrounding statement completes.
  if coalesce(current_setting('app.internal_refresh', true), 'off') = 'on' then
    return new;
  end if;

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

  -- Derived aggregates remain unwritable by hand.
  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.response_rate := old.response_rate;
  new.avg_response_minutes := old.avg_response_minutes;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill: every business whose statistics were silently reverted while the
-- bug was live now has stale numbers. Recompute them all once.
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config('app.internal_refresh', 'on', true);

  update businesses b
  set response_rate = stats.rate,
      avg_response_minutes = stats.avg_minutes
  from (
    select business_id,
           round(100.0 * count(*) filter (where responded_at is not null) / nullif(count(*), 0), 2) as rate,
           avg(response_minutes) filter (where response_minutes is not null)::integer as avg_minutes
    from lead_businesses
    group by business_id
  ) stats
  where b.id = stats.business_id;

  update businesses b
  set rating_avg = coalesce(stats.avg_rating, 0),
      rating_count = coalesce(stats.n, 0)
  from (
    select business_id, round(avg(rating)::numeric, 2) as avg_rating, count(*) as n
    from reviews
    where status = 'published' and deleted_at is null
    group by business_id
  ) stats
  where b.id = stats.business_id;

  perform set_config('app.internal_refresh', 'off', true);
end;
$$;
