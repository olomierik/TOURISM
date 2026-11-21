-- ===========================================================================
-- 093 — SEO brief Phase 3 (21 Nov 2026): trust, badges, richer tours
--
-- T13  Reviews: an operator may reply to a review and do nothing else to it.
--      reviews_guard_fields stopped owners changing rating, title, body and
--      status, but not deleted_at, lead_id or business_id, so an operator
--      could make a bad review vanish by soft-deleting it. Owners now change
--      only owner_reply and owner_replied_at; anything else is refused.
--
-- T14  Verification: what was checked, when, and by whom, so the public
--      "Verified" chip can say exactly what it means. Licence (TALA/ZATI) is
--      already recorded (license_*); this adds business registration, an ID
--      check and a note. license_checked_* were not guarded and an owner
--      could mark their own licence as checked; every checked/verified field
--      is now preserved against owner writes.
--
--      location_flag: a listing whose address names a foreign country, or
--      whose pin is outside East Africa, is flagged for manual review before
--      its map is shown (the brief's example, an Arusha operator with a New
--      York address, is real: one listing on 21 Nov 2026). The rule avoids
--      "Usa River", a Tanzanian town, and "Indian Street".
--
-- T12  Badges: impressions per listing per day and the sites that show the
--      badge, written by the badge endpoint with the service role. No personal
--      data: a domain and a count, never an IP or a full referring URL.
--
-- T15  Tours: park fees included or not, the vehicle, prices by season and
--      group size, and start dates.
-- ===========================================================================
begin;

-- ---------------------------------------------------------------------------
-- T13: an operator may reply, nothing more.
-- ---------------------------------------------------------------------------
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

  -- The business replying to a review of itself.
  if owns_business(old.business_id) and new.author_id is not distinct from old.author_id
     and old.author_id <> (select auth.uid()) then
    if (to_jsonb(new) - array['owner_reply', 'owner_replied_at', 'updated_at'])
       is distinct from (to_jsonb(old) - array['owner_reply', 'owner_replied_at', 'updated_at']) then
      raise exception 'A business may reply to a review but not alter, hide or move it'
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

-- ---------------------------------------------------------------------------
-- T14: verification record and the location flag.
-- ---------------------------------------------------------------------------
alter table businesses
  add column if not exists registration_number text,
  add column if not exists registration_checked_at timestamptz,
  add column if not exists identity_checked_at timestamptz,
  add column if not exists verification_notes text,
  add column if not exists location_flag text,
  add column if not exists location_reviewed_at timestamptz;

comment on column businesses.registration_number is 'Business registration (BRELA or equivalent), as given by the operator.';
comment on column businesses.registration_checked_at is 'When an administrator checked the registration number against the registry. Admin-only.';
comment on column businesses.identity_checked_at is 'When an administrator checked the owner''s identity document. Admin-only; the document itself is never stored.';
comment on column businesses.location_flag is 'Why the address or pin looks wrong for the operating country, set by trigger. The public map is hidden until location_reviewed_at is set.';

create or replace function business_location_flag(addr text, lat numeric, lng numeric)
returns text
language sql
immutable
as $$
  select case
    when lat is not null and lng is not null
         and (lat not between -12.5 and 5.5 or lng not between 28 and 42.5)
      then 'Map pin is outside East Africa'
    when addr ~* '(\munited states\M|\musa\M(?![\s-]*(river|mto))|\mu\.s\.a\M|\mnew york\M|,\s*ny\s+\d{5}|\mcalifornia\M|\mtexas\M|\mflorida\M|\munited kingdom\M|\mengland\M|\mlondon\M|\mgermany\M|\mdeutschland\M|\mnetherlands\M|\mfrance\M|\mitaly\M|\mcanada\M|\maustralia\M|\mindia\M|\mdubai\M|\munited arab emirates\M)'
      then 'Address names a country outside East Africa'
    else null
  end;
$$;

create or replace function businesses_set_location_flag()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT'
     or new.address is distinct from old.address
     or new.latitude is distinct from old.latitude
     or new.longitude is distinct from old.longitude then
    new.location_flag := business_location_flag(new.address, new.latitude, new.longitude);
    -- A changed address is a new address: it needs looking at again.
    if new.location_flag is not null and tg_op = 'UPDATE' then
      new.location_reviewed_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_location_flag on businesses;
create trigger businesses_location_flag
  before insert or update on businesses
  for each row execute function businesses_set_location_flag();

update businesses
   set location_flag = business_location_flag(address, latitude, longitude)
 where business_location_flag(address, latitude, longitude) is not null;

create or replace function businesses_guard_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

  -- What an administrator checked, and when (093). Preserved rather than
  -- refused, so an owner's profile form that happens to send them back
  -- unchanged still saves. Changing the licence or registration number itself
  -- is the owner's to do, and clears the check: a new number is unchecked.
  new.verified_at := old.verified_at;
  new.verification_notes := old.verification_notes;
  new.identity_checked_at := old.identity_checked_at;
  new.location_reviewed_at := old.location_reviewed_at;
  new.license_checked_by := old.license_checked_by;
  new.license_checked_source := old.license_checked_source;
  new.license_checked_at := case when new.license_number is distinct from old.license_number then null else old.license_checked_at end;
  new.registration_checked_at := case when new.registration_number is distinct from old.registration_number then null else old.registration_checked_at end;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- T12: badge impressions and the sites showing the badge.
-- ---------------------------------------------------------------------------
create table if not exists badge_impressions (
  business_id uuid not null references businesses (id) on delete cascade,
  day         date not null default (now() at time zone 'utc')::date,
  hits        integer not null default 0,
  primary key (business_id, day)
);

create table if not exists badge_referrers (
  business_id uuid not null references businesses (id) on delete cascade,
  domain      text not null check (domain ~ '^[a-z0-9.-]{1,253}$'),
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  hits        integer not null default 0,
  primary key (business_id, domain)
);

comment on table badge_impressions is 'Times a listing''s badge image was requested, per UTC day. Written by /badge/<slug>.svg with the service role.';
comment on table badge_referrers is 'Sites the badge is shown on: the referring host only, never a full URL or a visitor detail.';

alter table badge_impressions enable row level security;
alter table badge_referrers enable row level security;
create policy badge_impressions_read on badge_impressions
  for select to authenticated using (owns_business(business_id) or is_admin());
create policy badge_referrers_read on badge_referrers
  for select to authenticated using (owns_business(business_id) or is_admin());

/** One request: count it, and note the site it came from. Service role only. */
create or replace function record_badge_hit(target uuid, ref_domain text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into badge_impressions (business_id, day, hits)
  values (target, (now() at time zone 'utc')::date, 1)
  on conflict (business_id, day) do update set hits = badge_impressions.hits + 1;

  if ref_domain is not null and ref_domain ~ '^[a-z0-9.-]{1,253}$' then
    insert into badge_referrers (business_id, domain, hits)
    values (target, ref_domain, 1)
    on conflict (business_id, domain) do update
      set hits = badge_referrers.hits + 1, last_seen = now();
  end if;
end;
$$;

revoke execute on function record_badge_hit(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- T15: richer tours.
-- ---------------------------------------------------------------------------
alter table packages
  add column if not exists park_fees_included boolean,
  add column if not exists vehicle text;

comment on column packages.park_fees_included is 'Whether the price includes park and conservation fees. Null when the operator has not said.';
comment on column packages.vehicle is 'The vehicle, in the operator''s words: "4x4 Land Cruiser with pop-up roof".';

create table if not exists package_rates (
  id               uuid primary key default gen_random_uuid(),
  package_id       uuid not null references packages (id) on delete cascade,
  season           text not null default 'all' check (season in ('all', 'high', 'low')),
  group_min        integer not null default 1 check (group_min >= 1),
  group_max        integer check (group_max is null or group_max >= group_min),
  price_per_person numeric(10, 2) not null check (price_per_person > 0),
  created_at       timestamptz not null default now()
);

create table if not exists package_departures (
  id          uuid primary key default gen_random_uuid(),
  package_id  uuid not null references packages (id) on delete cascade,
  start_date  date not null,
  seats       integer check (seats is null or seats >= 0),
  created_at  timestamptz not null default now(),
  unique (package_id, start_date)
);

create index if not exists package_rates_package on package_rates (package_id);
create index if not exists package_departures_date on package_departures (start_date, package_id);

comment on table package_rates is 'Price per person by season and group size. The headline price_from stays on packages.';
comment on table package_departures is 'Fixed start dates. A tour with none runs on request.';

alter table package_rates enable row level security;
alter table package_departures enable row level security;

create policy package_rates_read on package_rates for select using (
  exists (select 1 from packages p where p.id = package_id and p.status = 'published' and p.deleted_at is null)
);
create policy package_rates_owner on package_rates for all to authenticated
  using (exists (select 1 from packages p where p.id = package_id and (owns_business(p.business_id) or is_admin())))
  with check (exists (select 1 from packages p where p.id = package_id and (owns_business(p.business_id) or is_admin())));

create policy package_departures_read on package_departures for select using (
  exists (select 1 from packages p where p.id = package_id and p.status = 'published' and p.deleted_at is null)
);
create policy package_departures_owner on package_departures for all to authenticated
  using (exists (select 1 from packages p where p.id = package_id and (owns_business(p.business_id) or is_admin())))
  with check (exists (select 1 from packages p where p.id = package_id and (owns_business(p.business_id) or is_admin())));

grant select on package_rates, package_departures to anon, authenticated;
grant insert, update, delete on package_rates, package_departures to authenticated;

commit;
