-- ===========================================================================
-- 097 — Itineraries on quotes, and bookings (24 Nov 2026)
--
-- The owner: once traveller and operator agree a price on this site, the
-- traveller presses BOOKED and both receive a document with the trip plan,
-- routes, arrival, hotels, cost and both parties' contacts, as a PDF. Admin
-- keeps a copy of every one.
--
-- Two parts.
--
-- 1. lead_quotes grows an itinerary: arrival and departure (date, place,
--    flight or pickup details) and a day-by-day plan, each day a route
--    (from -> to), what happens, where they sleep and the meals. The operator
--    fills it in the same form as the price; traveller and operator negotiate
--    in the existing conversation and the operator updates the quote.
--
-- 2. bookings: one row per booked trip, written only by the server when a
--    signed-in traveller presses BOOKED. Everything the document shows is
--    frozen into it at that moment (quote, itinerary, trip, both contacts),
--    so the PDF reads the same next year whatever later happens to the
--    listing or the quote. Readable by the traveller, the operator's owner
--    and admins; nobody writes to it through the API.
-- ===========================================================================
begin;

alter table lead_quotes
  add column if not exists arrival_date      date,
  add column if not exists arrival_point     text,
  add column if not exists arrival_details   text,
  add column if not exists departure_date    date,
  add column if not exists departure_point   text,
  add column if not exists itinerary         jsonb not null default '[]'::jsonb;

comment on column lead_quotes.itinerary is
  'Day-by-day plan: [{"day":1,"from":"Arusha","to":"Tarangire","plan":"...","overnight":"...","meals":"B,L,D"}]. Written by the operator with the quote.';

create sequence if not exists booking_reference_seq;

create table if not exists bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique
                      default ('BK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('booking_reference_seq')::text, 6, '0')),
  lead_business_id  uuid not null unique references lead_businesses (id) on delete restrict,
  lead_id           uuid not null references leads (id) on delete restrict,
  business_id       uuid references businesses (id) on delete set null,
  traveler_id       uuid not null references profiles (id) on delete restrict,
  status            text not null default 'booked' check (status in ('booked', 'cancelled')),
  quote             jsonb not null,
  trip              jsonb not null,
  traveller         jsonb not null,
  operator          jsonb not null,
  locale            text not null default 'en',
  booked_at         timestamptz not null default now(),
  emailed_at        timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- One live booking per enquiry: a traveller books one operator for a trip.
create unique index if not exists bookings_one_per_lead on bookings (lead_id) where status = 'booked';
create index if not exists bookings_business_idx on bookings (business_id, booked_at desc);
create index if not exists bookings_traveler_idx on bookings (traveler_id, booked_at desc);
create index if not exists bookings_booked_at_idx on bookings (booked_at desc);

alter table bookings enable row level security;

drop policy if exists bookings_read on bookings;
create policy bookings_read on bookings
  for select to authenticated
  using (
    traveler_id = (select auth.uid())
    or (business_id is not null and owns_business(business_id))
    or is_admin()
  );

grant select on bookings to authenticated;

commit;
