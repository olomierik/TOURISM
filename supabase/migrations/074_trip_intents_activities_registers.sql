-- ===========================================================================
-- 074 — What the traveller came for, what the operator does, and who says so
--
-- Our six categories are business types: safaris, hotels, car-rental,
-- activities, tour-guides, restaurants. They answer "what kind of company is
-- this", which is a question nobody arrives asking. A traveller arrives with a
-- trip in mind — a safari, Kilimanjaro, Zanzibar, or two of those stitched
-- together — and the directory has no way to express that. 1,254 listings sit
-- in `safaris` with nothing to distinguish the Serengeti outfit from the
-- Kilimanjaro outfit from the one that does both.
--
-- Three tables, because this is three separate facts that kept getting
-- conflated:
--
--   business_intents     what trip this operator is for          (4 values)
--   business_activities  what they actually run                  (9 values)
--   business_registers   which register says so, and when we read it
--
-- The third is the one worth having. Everything else in this schema records
-- presence: a row exists, therefore something is true. A register check has to
-- record absence too — "not on the TLTO list when read on 24 Oct 2026" is a
-- fact about the operator and a fact about our diligence, and a missing row
-- cannot say whether we looked and found nothing or never looked. So `listed`
-- is a boolean and `checked_on` is not null.
--
-- None of this touches is_verified. That badge means a licence number we have
-- seen, and it stays that way; a register listing is a weaker claim and is
-- shown as the weaker claim.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Trip intents
-- ---------------------------------------------------------------------------
do $$ begin
  create type trip_intent as enum ('safari', 'mountain', 'beach', 'combo');
exception when duplicate_object then null; end $$;

create table if not exists business_intents (
  business_id uuid not null references businesses (id) on delete cascade,
  intent      trip_intent not null,
  -- How this was decided, so a wrong one can be traced back rather than argued
  -- about: 'register' (the operator's own register entry names it),
  -- 'owner' (set in the dashboard), 'admin'.
  source      text not null default 'register',
  created_at  timestamptz not null default now(),
  primary key (business_id, intent)
);

comment on table business_intents is
  'What kind of trip an operator is for, as a traveller would say it. Independent of categories, which records what kind of company it is. An operator may carry several: combo is its own intent rather than a derived one, because an operator who sells a Serengeti-plus-Zanzibar itinerary is selling something neither single intent describes.';

create index if not exists business_intents_intent_idx on business_intents (intent, business_id);

-- ---------------------------------------------------------------------------
-- Activities
-- ---------------------------------------------------------------------------
do $$ begin
  create type trip_activity as enum (
    'walking_safaris', 'bird_watching', 'photography', 'balloon', 'day_trips',
    'cultural_tours', 'snorkeling', 'diving', 'spice_tours'
  );
exception when duplicate_object then null; end $$;

create table if not exists business_activities (
  business_id uuid not null references businesses (id) on delete cascade,
  activity    trip_activity not null,
  source      text not null default 'register',
  created_at  timestamptz not null default now(),
  primary key (business_id, activity)
);

comment on table business_activities is
  'The specific things an operator runs. Deliberately a short closed list rather than free tags: nine values a traveller might filter on, each of which either is or is not true of an operator. A free-text tag field would fill with marketing adjectives within a week.';

create index if not exists business_activities_activity_idx
  on business_activities (activity, business_id);

-- ---------------------------------------------------------------------------
-- Register checks
-- ---------------------------------------------------------------------------
do $$ begin
  create type operator_register as enum ('tato', 'tlto', 'zato', 'kinapa');
exception when duplicate_object then null; end $$;

create table if not exists business_registers (
  business_id uuid not null references businesses (id) on delete cascade,
  register    operator_register not null,
  -- False is a result, not a missing value. See the header.
  listed      boolean not null,
  checked_on  date not null,
  -- The page the check was made against, so a traveller or the operator can
  -- repeat it. Null only where the register was read offline.
  source_url  text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (business_id, register)
);

comment on table business_registers is
  'Whether an operator appears on a named industry register, and the date we read it. TATO membership is the strongest of these, because TATO requires its members to hold a valid TALA licence — but it is still membership, not the licence, and nothing here may be presented as one. There is no public TALA register to check: maliasili.go.tz has been broken since well before this migration.';

comment on column business_registers.listed is
  'True when the operator was found on the register, false when the register was read and did not carry them. A row with false is more useful than no row: it is the difference between a check that failed and a check that was never made.';

create index if not exists business_registers_listed_idx
  on business_registers (register, listed, business_id);

-- ---------------------------------------------------------------------------
-- Where a stub listing came from
-- ---------------------------------------------------------------------------
alter table businesses
  add column if not exists import_source text,
  add column if not exists import_checked_on date;

comment on column businesses.import_source is
  'Short name of the register or dataset a stub listing was built from, for example tato-register. Null for listings created by a person. Lets an import be re-run, audited or withdrawn as a unit — migration 059 imported 2,207 rows with nothing recording where they came from, and unpicking that has been guesswork ever since.';

-- ---------------------------------------------------------------------------
-- RLS — public when the parent listing is public, writable by owner or admin.
-- Same shape as business_categories in 013.
-- ---------------------------------------------------------------------------
alter table business_intents    enable row level security;
alter table business_activities enable row level security;
alter table business_registers  enable row level security;

create policy business_intents_read on business_intents
  for select to anon, authenticated using (business_is_public(business_id));
create policy business_intents_own on business_intents
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

create policy business_activities_read on business_activities
  for select to anon, authenticated using (business_is_public(business_id));
create policy business_activities_own on business_activities
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

-- Registers are readable like the others but NOT writable by the owner. An
-- operator editing their own register check would make the one trust signal on
-- the page worth nothing — it is the whole reason it is worth something.
create policy business_registers_read on business_registers
  for select to anon, authenticated using (business_is_public(business_id));
create policy business_registers_admin on business_registers
  for all to authenticated
  using (is_admin()) with check (is_admin());

grant select on business_intents, business_activities, business_registers to anon, authenticated;
grant insert, update, delete on business_intents, business_activities to authenticated;
grant insert, update, delete on business_registers to authenticated;
