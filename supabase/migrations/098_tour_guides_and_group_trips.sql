-- ===========================================================================
-- 098 — Local tour guides, their verification, and group trips (24 Nov 2026)
--
-- The owner: a low-cost way for groups (churches, schools, backpackers) to see
-- Tanzania with a local guide, staying in hostels and eating local food; a
-- place for local guides to register; guides verified with an ID, a photo and
-- a letter from the Ward Executive Officer (WEO) or a passport; the site
-- charges per traveller, after the trip.
--
-- A tour guide is a listing in the existing tour-guides category, so the
-- dashboard, quotes, the conversation, BOOKED, the trip document and reviews
-- all work for them unchanged. What is new:
--
--   tour_guide_profiles   what a group needs to know about a guide
--   tour_guide_documents  the verification uploads, in a PRIVATE bucket
--   platform_fees         the per-traveller fee, one row per booking, due
--                         after the trip
--   leads.group_kind /    who the group is, so a guide can answer a church
--   leads.organisation    choir differently from a backpacker
-- ===========================================================================
begin;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists tour_guide_profiles (
  business_id          uuid primary key references businesses (id) on delete cascade,
  -- 'licensed' holds a tour guide licence; 'community' is a village or
  -- cultural-programme guide for walks and visits outside the parks.
  guide_kind           text not null default 'community' check (guide_kind in ('licensed', 'community')),
  licence_number       text,
  languages            text[] not null default '{}',
  areas                text[] not null default '{}',
  specialties          text[] not null default '{}',
  audiences            text[] not null default '{}',
  day_rate             numeric(10, 2) check (day_rate is null or day_rate >= 0),
  day_rate_currency    char(3) not null default 'USD',
  max_group            smallint check (max_group is null or max_group between 1 and 500),
  bio                  text,
  verification_status  text not null default 'not_submitted'
                         check (verification_status in ('not_submitted', 'submitted', 'verified', 'rejected')),
  verification_note    text,
  submitted_at         timestamptz,
  verified_at          timestamptz,
  verified_by          uuid references profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table tour_guide_profiles enable row level security;

-- The public sees a guide's profile once the listing is public; the owner
-- always sees their own; admins see all. Verification fields are written only
-- by admins (trigger below).
drop policy if exists tour_guide_profiles_read on tour_guide_profiles;
create policy tour_guide_profiles_read on tour_guide_profiles
  for select to anon, authenticated
  using (business_is_public(business_id) or owns_business(business_id) or is_admin());

drop policy if exists tour_guide_profiles_owner_write on tour_guide_profiles;
create policy tour_guide_profiles_owner_write on tour_guide_profiles
  for insert to authenticated with check (owns_business(business_id));

drop policy if exists tour_guide_profiles_owner_update on tour_guide_profiles;
create policy tour_guide_profiles_owner_update on tour_guide_profiles
  for update to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

grant select on tour_guide_profiles to anon, authenticated;
grant insert, update on tour_guide_profiles to authenticated;

create or replace function tour_guide_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if is_trusted_context() or is_admin() then
    return new;
  end if;
  -- An owner may submit (not_submitted/rejected -> submitted) and nothing more.
  if tg_op = 'INSERT' then
    new.verification_status := 'not_submitted';
    new.verified_at := null;
    new.verified_by := null;
    new.verification_note := null;
    return new;
  end if;
  if new.verification_status is distinct from old.verification_status then
    if not (new.verification_status = 'submitted' and old.verification_status in ('not_submitted', 'rejected')) then
      raise exception 'Verification is decided by the site, not the guide' using errcode = 'insufficient_privilege';
    end if;
    new.submitted_at := now();
  end if;
  new.verified_at := old.verified_at;
  new.verified_by := old.verified_by;
  new.verification_note := case when new.verification_status = 'submitted' then null else old.verification_note end;
  return new;
end;
$$;

drop trigger if exists tour_guide_profiles_guard on tour_guide_profiles;
create trigger tour_guide_profiles_guard
  before insert or update on tour_guide_profiles
  for each row execute function tour_guide_profiles_guard();

create index if not exists tour_guide_profiles_status_idx on tour_guide_profiles (verification_status);

-- ---------------------------------------------------------------------------
-- Verification documents (private)
-- ---------------------------------------------------------------------------
create table if not exists tour_guide_documents (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  kind         text not null check (kind in ('national_id', 'photo', 'weo_letter', 'passport', 'licence')),
  path         text not null,
  uploaded_at  timestamptz not null default now(),
  unique (business_id, kind)
);

alter table tour_guide_documents enable row level security;

drop policy if exists tour_guide_documents_rw on tour_guide_documents;
create policy tour_guide_documents_rw on tour_guide_documents
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id));

grant select, insert, update, delete on tour_guide_documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guide-verification', 'guide-verification', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "guide verification: owner writes own folder" on storage.objects;
create policy "guide verification: owner writes own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'guide-verification' and owns_business(((storage.foldername(name))[1])::uuid));

drop policy if exists "guide verification: owner or admin reads" on storage.objects;
create policy "guide verification: owner or admin reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'guide-verification'
    and (owns_business(((storage.foldername(name))[1])::uuid) or is_admin())
  );

drop policy if exists "guide verification: owner replaces own" on storage.objects;
create policy "guide verification: owner replaces own"
  on storage.objects for update to authenticated
  using (bucket_id = 'guide-verification' and owns_business(((storage.foldername(name))[1])::uuid));

drop policy if exists "guide verification: owner deletes own" on storage.objects;
create policy "guide verification: owner deletes own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'guide-verification' and owns_business(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Per-traveller fee, due after the trip
-- ---------------------------------------------------------------------------
insert into platform_settings (key, value, description)
values ('group_trip_fee_per_person', '{"amount": 3, "currency": "USD"}'::jsonb,
        'Fee per traveller charged to a tour guide for each booked group trip, due after the trip ends.')
on conflict (key) do nothing;

create table if not exists platform_fees (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null unique references bookings (id) on delete restrict,
  business_id     uuid references businesses (id) on delete set null,
  travellers      integer not null check (travellers >= 1),
  fee_per_person  numeric(10, 2) not null check (fee_per_person >= 0),
  currency        char(3) not null default 'USD',
  amount          numeric(12, 2) generated always as (travellers * fee_per_person) stored,
  -- The trip's last day; the fee is shown as due from the day after.
  due_on          date not null,
  status          text not null default 'open' check (status in ('open', 'paid', 'waived')),
  paid_at         timestamptz,
  paid_reference  text,
  note            text,
  created_at      timestamptz not null default now()
);

alter table platform_fees enable row level security;

drop policy if exists platform_fees_read on platform_fees;
create policy platform_fees_read on platform_fees
  for select to authenticated
  using ((business_id is not null and owns_business(business_id)) or is_admin());

grant select on platform_fees to authenticated;

create index if not exists platform_fees_business_idx on platform_fees (business_id, due_on desc);
create index if not exists platform_fees_status_idx on platform_fees (status, due_on);

-- ---------------------------------------------------------------------------
-- Who the group is
-- ---------------------------------------------------------------------------
alter table leads
  add column if not exists group_kind   text check (group_kind is null or group_kind in ('church', 'school', 'backpackers', 'other')),
  add column if not exists organisation text;

commit;
