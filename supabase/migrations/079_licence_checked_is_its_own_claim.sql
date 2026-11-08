-- ===========================================================================
-- 079 — "Licence checked" becomes a claim somebody has to earn
--
-- The verified badge tells the traveller:
--
--   "Our team has checked that this business is real and that its licence and
--    contact details are genuine."
--
-- and the badge variant is defined in code as "§6.4 Licence checked: verified
-- against the licensing records". Measured today, of 31 approved listings
-- carrying it, **23 have no licence number in the row at all** — there was
-- nothing to check. Nine more hold a licence number and carry no badge. The
-- whole approved table holds 17 licence numbers.
--
-- Worse, the admin copy taught reviewers that this is what the switch means:
-- "verifying says the licence and the contact details check out". The badge
-- did not drift; it was being applied exactly as described, against data that
-- was not there.
--
-- docs/bookings-and-visibility.md §7 item 0 offered two ways out. This is the
-- chosen one: narrow the claim. `is_verified` keeps its 31 listings and starts
-- saying only what was actually done — the operator is real and reachable —
-- and a licence check becomes a separate, rarer mark that cannot be asserted
-- without a number, a date and a source.
--
-- No date is backfilled onto the 17 existing numbers. We hold no record of
-- when or whether anyone checked them, and inventing one is the exact failure
-- this migration exists to stop. The new mark therefore starts at zero and is
-- earned one listing at a time, which is what makes it worth anything.
-- ===========================================================================

alter table businesses
  add column license_checked_at     timestamptz,
  add column license_checked_by     uuid references profiles(id) on delete set null,
  add column license_checked_source text;

comment on column businesses.license_checked_at is
  'When an administrator last checked this operator''s licence against a source. Null means nobody has, which is the default and is not a defect. Never set without license_number and license_checked_source — the check constraint enforces it.';

comment on column businesses.license_checked_by is
  'The administrator who performed the check, so the claim has somebody''s name behind it.';

comment on column businesses.license_checked_source is
  'What the number was checked against, in words a traveller can act on: the issuing register, portal or document seen. "tanzaniaoperators.com" is a third-party compilation, not a licensing authority, and does not qualify on its own.';

-- A licence check with no licence number, or no statement of what it was
-- checked against, is the thing we are fixing. The schema refuses it rather
-- than relying on every future caller to remember.
alter table businesses
  add constraint businesses_licence_check_is_evidenced
  check (
    license_checked_at is null
    or (
      license_number is not null and btrim(license_number) <> ''
      and license_checked_source is not null and btrim(license_checked_source) <> ''
    )
  );

-- Finding the listings worth a reviewer's attention: a number on file that
-- nobody has checked yet. Nine of those exist today.
create index businesses_licence_unchecked_idx
  on businesses (license_checked_at)
  where license_number is not null and license_checked_at is null;
