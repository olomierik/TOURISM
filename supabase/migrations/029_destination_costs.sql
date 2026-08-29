-- ===========================================================================
-- 029 — What a day at this destination costs
--
-- SafariBookings prints a price band on every country and every operator:
-- "$231 to $657 pp/day". It is the first number a shopper looks for and this
-- site shows a price on 2 listings out of 1,336. You cannot compare what you
-- cannot see, so the directory reads as a phone book rather than a place to
-- decide anything.
--
-- The obvious route — derive a band from what operators publish — needs
-- operators, and there are two packages in the database. The route that works
-- today is the one the site already uses in its cost guides: government park
-- fees are public, set by the authority, and identical for every operator, and
-- day-rate ranges by comfort level are well-established market knowledge.
--
-- These numbers are therefore NOT new research. They are the figures the site
-- already publishes in "How much does a Tanzania safari cost in 2026?", lifted
-- into structured data so a destination page can state them and a filter can
-- one day use them. Inventing a second set of numbers that disagreed with the
-- guides would be worse than having none.
--
-- Everything here is indicative and dated. Park fees change annually, several
-- are quoted before VAT, and a stale fee presented as current is more damaging
-- than an absent one — so fees_as_of and authority are NOT NULL, and the UI
-- prints both.
-- ===========================================================================

create table destination_costs (
  destination_id uuid primary key references destinations(id) on delete cascade,

  currency       char(3) not null default 'USD',

  -- All-in, per person per day, on the ground, excluding international flights.
  budget_low     integer,
  budget_high    integer,
  midrange_low   integer,
  midrange_high  integer,
  luxury_low     integer,
  luxury_high    integer,

  -- The portion no operator can discount, per person per day.
  park_fee_low   integer,
  park_fee_high  integer,

  -- One headline charge worth naming: a crater descent, a gorilla permit, a
  -- climbing package. Amount is in `currency`; the unit lives in the label
  -- because "per vehicle" and "per person" are both real and confusing them is
  -- a several-hundred-dollar mistake.
  notable_fee_key    text,
  notable_fee_amount integer,

  -- Who sets the fees. TANAPA, NCAA, KWS, UWA, RDB, or a county government.
  -- Nullable because a beach or a city has day rates but no gate to pay at;
  -- the check below makes it required exactly when a fee is quoted, so a fee can
  -- never appear on the page without someone's name attached to it.
  authority      text,
  -- The year these were last checked. Printed on the page, not hidden.
  fees_as_of     smallint not null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint destination_costs_bands_ordered check (
    (budget_low   is null or budget_high   is null or budget_low   <= budget_high) and
    (midrange_low is null or midrange_high is null or midrange_low <= midrange_high) and
    (luxury_low   is null or luxury_high   is null or luxury_low   <= luxury_high) and
    (park_fee_low is null or park_fee_high is null or park_fee_low <= park_fee_high)
  ),
  constraint destination_costs_year_sane check (fees_as_of between 2020 and 2100),
  constraint destination_costs_fee_needs_authority check (
    park_fee_low is null or authority is not null
  ),
  constraint destination_costs_notable_pairs check (
    (notable_fee_key is null) = (notable_fee_amount is null)
  )
);

-- Public read, admin write. Same shape as destinations themselves: this is
-- reference content, not user data.
alter table destination_costs enable row level security;

create policy destination_costs_public_read on destination_costs
  for select to anon, authenticated using (true);

create policy destination_costs_admin_write on destination_costs
  for all to authenticated using (is_admin()) with check (is_admin());

create trigger destination_costs_touch
  before update on destination_costs
  for each row execute function set_updated_at();

comment on table destination_costs is
  'Indicative day-rate bands and published park fees per destination. Dated on purpose — a stale fee shown as current is worse than none.';
