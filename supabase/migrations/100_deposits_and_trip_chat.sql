-- ===========================================================================
-- 100 — Mobile money deposits and a chat per group trip (24 Nov 2026)
--
-- Phase 3 of the owner's group trips.
--
-- Deposits. The site never holds money: a traveller pays the guide's own
-- mobile money number (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa) after
-- pressing BOOKED, reports the payment with its transaction ID, and the guide
-- confirms it. Both sides, and admin, see the same record, which is what
-- settles "I paid" against "I never got it".
--
-- Group chat. One conversation per open group trip, for the guide and every
-- traveller who has booked it: meeting times, what to pack, who is on which
-- bus. Only members read or write; nobody else can see who is going.
-- ===========================================================================
begin;

alter table tour_guide_profiles
  add column if not exists mobile_money_provider text
    check (mobile_money_provider is null or mobile_money_provider in ('mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'other')),
  add column if not exists mobile_money_number text,
  add column if not exists mobile_money_name text;

create table if not exists booking_payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings (id) on delete cascade,
  amount        numeric(12, 2) not null check (amount > 0),
  currency      char(3) not null default 'USD',
  method        text not null default 'mobile_money' check (method in ('mobile_money', 'bank', 'cash', 'other')),
  reference     text,
  status        text not null default 'reported' check (status in ('reported', 'confirmed', 'rejected')),
  reported_by   uuid references profiles (id) on delete set null,
  confirmed_by  uuid references profiles (id) on delete set null,
  confirmed_at  timestamptz,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists booking_payments_booking_idx on booking_payments (booking_id, created_at);

alter table booking_payments enable row level security;

drop policy if exists booking_payments_read on booking_payments;
create policy booking_payments_read on booking_payments
  for select to authenticated
  using (exists (
    select 1 from bookings b
    where b.id = booking_id
      and (b.traveler_id = (select auth.uid()) or (b.business_id is not null and owns_business(b.business_id)) or is_admin())
  ));

grant select on booking_payments to authenticated;

-- Who belongs to a group trip: its guide, and travellers with a live booking.
create or replace function is_departure_member(p_departure uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_admin()
    or exists (select 1 from group_departures d where d.id = p_departure and owns_business(d.business_id))
    or exists (
      select 1 from bookings b join leads l on l.id = b.lead_id
      where l.group_departure_id = p_departure and b.status = 'booked' and b.traveler_id = (select auth.uid())
    );
$$;

grant execute on function is_departure_member(uuid) to authenticated;

create table if not exists departure_messages (
  id            uuid primary key default gen_random_uuid(),
  departure_id  uuid not null references group_departures (id) on delete cascade,
  author_id     uuid references profiles (id) on delete set null,
  author_name   text not null,
  is_guide      boolean not null default false,
  body          text not null check (length(body) between 1 and 2000),
  created_at    timestamptz not null default now()
);

create index if not exists departure_messages_idx on departure_messages (departure_id, created_at);

alter table departure_messages enable row level security;

drop policy if exists departure_messages_read on departure_messages;
create policy departure_messages_read on departure_messages
  for select to authenticated using (is_departure_member(departure_id));

drop policy if exists departure_messages_write on departure_messages;
create policy departure_messages_write on departure_messages
  for insert to authenticated
  with check (is_departure_member(departure_id) and author_id = (select auth.uid()));

grant select, insert on departure_messages to authenticated;

commit;
