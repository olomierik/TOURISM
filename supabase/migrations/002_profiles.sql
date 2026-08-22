-- ===========================================================================
-- 002 — Profiles
--
-- Mirrors auth.users with the application-level fields. Supabase owns auth.users
-- and it cannot carry custom columns or be referenced by RLS conveniently, so the
-- role lives here and everything else foreign-keys to profiles.
-- ===========================================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role   not null default 'traveler',
  email         citext,
  full_name     text,
  phone         text,
  -- Stored separately from `phone` because WhatsApp is the dominant business
  -- channel in Tanzania and is frequently a different number to the landline.
  whatsapp      text,
  avatar_url    text,
  locale        text        not null default 'en' references locales(code),
  marketing_opt_in boolean  not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index profiles_role_idx on profiles (role) where deleted_at is null;
create index profiles_email_idx on profiles (email) where deleted_at is null;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Provision a profile whenever Supabase creates an auth user.
--
-- Runs as a trigger rather than from application code so a profile always exists
-- regardless of how the user signed up — email, OAuth, or an admin invite.
-- The role is read from signup metadata but can only ever be traveler or
-- business_owner: admin is never self-assignable from a public signup.
-- ---------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  insert into profiles (id, email, full_name, avatar_url, locale, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(
      nullif(new.raw_user_meta_data ->> 'locale', ''),
      'en'
    ),
    case
      when requested = 'business_owner' then 'business_owner'::user_role
      else 'traveler'::user_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Role helpers used throughout the RLS policies.
--
-- security definer so they can read `profiles` without the caller needing a
-- policy that would itself recurse into profiles. search_path is pinned to
-- defeat search_path injection, which security definer functions are exposed to.
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'admin'
      and deleted_at is null
  );
$$;

create or replace function current_role_is(target user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = target
      and deleted_at is null
  );
$$;
