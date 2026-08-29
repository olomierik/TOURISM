-- ===========================================================================
-- 030 — The two things an operator profile is missing
--
-- SafariBookings leads every operator profile with the same handful of facts:
--
--   Size:        5-10 employees (Founded in 2023)
--   Member Of:   TTB & AMREF FLYING DOCTORS
--   Price Range: $160 to $1,200 per person per day
--
-- Founded and size already exist here and already render. The other two do not,
-- and they are the two doing the most work.
--
-- Membership is the trust signal that matters in this market specifically.
-- TATO, KATO, AUTO and RTTA membership is checkable, and AMREF Flying Doctors
-- cover is the difference between an evacuation and a long drive. A traveller
-- comparing two strangers on a screen has almost nothing else to go on.
--
-- The day rate is the number that makes a directory comparable at all. Without
-- it a reader cannot tell whether the quote in their inbox is ordinary or
-- absurd, which is the judgement they came here to make — and it is exactly the
-- gap that leaves this site reading as a phone book. Set by the operator rather
-- than derived, because deriving it needs published packages and there are two
-- in the database.
--
-- Deliberately not shown as a claim of quality. A price range is a fact about
-- what someone charges, and membership is a fact about a register. Neither is an
-- endorsement, and the UI must not dress them as one.
-- ===========================================================================

alter table businesses
  add column if not exists associations  text,
  add column if not exists day_rate_low  integer,
  add column if not exists day_rate_high integer,
  add column if not exists day_rate_currency char(3) not null default 'USD';

comment on column businesses.associations is
  'Free text as the operator states it — "TATO, AMREF Flying Doctors". Not validated: we do not hold these registers and a dropdown would imply we had checked.';
comment on column businesses.day_rate_low is
  'All-in per person per day, on the ground, excluding international flights. The same basis the destination cost bands use, so the two can be read side by side.';

-- A single-sided range is meaningless on a page that prints "X to Y", and an
-- inverted one is a data-entry slip that would render as nonsense.
alter table businesses
  add constraint businesses_day_rate_ordered check (
    (day_rate_low is null) = (day_rate_high is null)
    and (day_rate_low is null or day_rate_low <= day_rate_high)
  );

-- Sanity bounds. A safari day under US$20 or over US$20,000 is a typo, and a
-- typo priced at $5 would sort to the top of any cheapest-first view.
alter table businesses
  add constraint businesses_day_rate_sane check (
    day_rate_low is null or (day_rate_low >= 20 and day_rate_high <= 20000)
  );

create index businesses_day_rate_idx on businesses (day_rate_low)
  where day_rate_low is not null and deleted_at is null;
