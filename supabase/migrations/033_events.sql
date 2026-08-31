-- ===========================================================================
-- 033 — Events
--
-- The one content type on this site with a reason to come back. A destination
-- page is read once; "when is Sauti za Busara" is asked every year by different
-- people, and answered by the same page.
--
-- The modelling question is recurrence, and getting it wrong in the obvious
-- direction would be expensive. Storing an event as a row with a start date
-- means publishing "Kwita Izina 2026" and then "Kwita Izina 2027" as separate
-- pages, splitting whatever ranking the first earned and leaving last year's
-- page live and wrong. Annual events are one page that stays true.
--
-- So an event carries what is actually known:
--
--   typical_month   the month it habitually falls in — the durable fact
--   next_start/end  the confirmed dates of the next edition, when confirmed
--
-- Both nullable, and that is the point. Most organisers announce dates a few
-- months out; until then the honest answer is "usually September", not a date
-- invented to fill a column. A page that guesses a festival date sends somebody
-- to an airport in the wrong week.
-- ===========================================================================

create type event_kind as enum (
  'music',
  'film',
  'culture',      -- a festival, a ceremony, a religious observance
  'sport',
  'wildlife',     -- a naming ceremony, a migration count, a conservation event
  'food',
  'trade'         -- a travel fair, a business expo
);

create table events (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique,

  destination_id uuid references destinations(id) on delete set null,
  country_code   char(2) references countries(code),
  kind           event_kind not null,

  -- True for anything that happens every year. False for a one-off.
  is_annual      boolean not null default true,
  -- 1-12. The durable fact about an annual event, and often the only one.
  typical_month  smallint,

  -- The next edition, once an organiser has said. Null means unannounced,
  -- which the page states rather than hiding.
  next_start     date,
  next_end       date,

  organiser      text,
  website        text,

  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint events_month_valid check (
    typical_month is null or typical_month between 1 and 12
  ),
  constraint events_dates_ordered check (
    next_start is null or next_end is null or next_start <= next_end
  ),
  -- An event with neither a month nor a date answers nothing. The page exists
  -- to say when, so a row that cannot is not publishable.
  constraint events_says_when check (
    typical_month is not null or next_start is not null
  ),
  -- An annual event without its habitual month would render as "sometimes".
  constraint events_annual_has_month check (
    not is_annual or typical_month is not null
  ),
  constraint events_website_shape check (
    website is null or website ~* '^https://'
  )
);

create index events_month on events (typical_month) where is_active;
create index events_destination on events (destination_id) where is_active;
create index events_upcoming on events (next_start) where is_active and next_start is not null;

create table event_translations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  locale     text not null references locales(code),

  name       text not null,
  slug       text not null,
  summary    text,
  -- What a traveller should actually do about it: book early, expect closures,
  -- bring cash. The part a listing of dates cannot carry.
  advice     text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (event_id, locale),
  unique (locale, slug)
);

create index event_translations_lookup on event_translations (locale, slug);

alter table events enable row level security;
alter table event_translations enable row level security;

create policy events_public_read on events
  for select to anon, authenticated using (is_active);
create policy events_admin_write on events
  for all to authenticated using (is_admin()) with check (is_admin());

create policy event_translations_public_read on event_translations
  for select to anon, authenticated using (true);
create policy event_translations_admin_write on event_translations
  for all to authenticated using (is_admin()) with check (is_admin());

create trigger events_touch before update on events
  for each row execute function set_updated_at();
create trigger event_translations_touch before update on event_translations
  for each row execute function set_updated_at();

comment on column events.typical_month is
  'The month it habitually falls in. For an annual event this is the durable fact and is required.';
comment on column events.next_start is
  'Confirmed dates of the next edition. NULL means unannounced — never a guess.';
