-- ===========================================================================
-- 069 — WhatsApp chats, counted as contacts
--
-- In Tanzania WhatsApp is how operators answer, and three in four listings have
-- a phone but no email. A traveller who taps "Chat on WhatsApp" has contacted
-- the operator as surely as one who sends an enquiry, and until now nothing
-- recorded it where the operator could see it: the one whatsapp_clicked event
-- in analytics_events carries no business and is admin-only.
--
-- Every chat goes through /api/whatsapp/<business>, which writes a row here and
-- then opens WhatsApp. One row per business, visitor and day: tapping twice, or
-- a link preview fetching the URL, is still one chat.
--
-- Written by the server with the service role. Owners read their own rows;
-- admins read all. visitor_hash is the same rotating daily hash the view beacon
-- uses, so nothing here identifies a person.
-- ===========================================================================

create table contact_clicks (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  channel       text not null default 'whatsapp' check (channel in ('whatsapp')),
  -- Where the chat started: a card, the listing's page, a package page, or the
  -- confirmation after an enquiry.
  source        text not null check (source in ('card', 'profile', 'package', 'enquiry')),
  -- Set when the chat followed an enquiry this operator received.
  lead_id       uuid references leads(id) on delete set null,
  visitor_hash  text not null,
  day           date not null default (now() at time zone 'utc')::date,
  created_at    timestamptz not null default now()
);

create unique index contact_clicks_once_a_day
  on contact_clicks (business_id, channel, visitor_hash, day);
create index contact_clicks_business_time on contact_clicks (business_id, created_at desc);

alter table contact_clicks enable row level security;

create policy contact_clicks_read on contact_clicks
  for select to authenticated
  using (owns_business(business_id) or is_admin());
