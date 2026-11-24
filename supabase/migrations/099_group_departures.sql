-- ===========================================================================
-- 099 — Open group trips: fixed-date departures travellers join (24 Nov 2026)
--
-- Phase 2 of the owner's group trips. A verified local guide publishes a trip
-- with dates, a price per person, a number of seats and a day-by-day plan.
-- Travellers (a church group, a class, two backpackers) join seats until it
-- is full. Smaller parties get group prices without a group of their own.
--
-- Joining is an ordinary enquiry to that guide (leads.group_departure_id),
-- with the departure's price and plan written as the quote, so the traveller
-- can press BOOKED straight away and the trip document, the fee and the
-- review invitation all work as for any booking. Seats taken are counted
-- from live bookings, never stored, so they cannot drift.
-- ===========================================================================
begin;

create table if not exists group_departures (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses (id) on delete cascade,
  slug              text not null unique,
  title             text not null check (length(title) between 3 and 140),
  summary           text,
  region            text,
  start_date        date not null,
  end_date          date not null,
  price_per_person  numeric(10, 2) not null check (price_per_person > 0),
  currency          char(3) not null default 'USD',
  seats_total       smallint not null check (seats_total between 2 and 200),
  min_group         smallint check (min_group is null or min_group between 1 and 200),
  audiences         text[] not null default '{}',
  stay              text,
  includes          text,
  excludes          text,
  arrival_point     text,
  departure_point   text,
  itinerary         jsonb not null default '[]'::jsonb,
  status            text not null default 'open' check (status in ('draft', 'open', 'closed', 'cancelled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists group_departures_upcoming_idx on group_departures (status, start_date);
create index if not exists group_departures_business_idx on group_departures (business_id, start_date desc);

alter table group_departures enable row level security;

drop policy if exists group_departures_public_read on group_departures;
create policy group_departures_public_read on group_departures
  for select to anon, authenticated
  using ((status in ('open', 'closed') and business_is_public(business_id)) or owns_business(business_id) or is_admin());

drop policy if exists group_departures_owner_insert on group_departures;
create policy group_departures_owner_insert on group_departures
  for insert to authenticated with check (owns_business(business_id));

drop policy if exists group_departures_owner_update on group_departures;
create policy group_departures_owner_update on group_departures
  for update to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

grant select on group_departures to anon, authenticated;
grant insert, update on group_departures to authenticated;

alter table leads add column if not exists group_departure_id uuid references group_departures (id) on delete set null;
create index if not exists leads_group_departure_idx on leads (group_departure_id) where group_departure_id is not null;

-- Seats taken: travellers on live bookings for this departure. Public, as a
-- number only; who booked is never exposed.
create or replace function departure_seats_taken(p_departure uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(l.adults, 0) + coalesce(l.children, 0)), 0)::int
  from leads l
  join bookings b on b.lead_id = l.id and b.status = 'booked'
  where l.group_departure_id = p_departure;
$$;

grant execute on function departure_seats_taken(uuid) to anon, authenticated;

commit;
