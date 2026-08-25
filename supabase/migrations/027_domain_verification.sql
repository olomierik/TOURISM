-- ===========================================================================
-- 027 — Proving a claim by the domain the listing already publishes
--
-- 026 sends a code to the address the register published. Measured against the
-- data, that route reaches 403 of 1,335 unclaimed listings, and 394 of those are
-- Kenyan: KATO's members directory carries contact emails, and the Google Maps
-- imports that make up Tanzania and Rwanda carry none at all. TZ and RW sit at
-- zero percent. A verification route that covers one country is not a route.
--
-- 831 listings publish a website instead. Someone signed in as
-- sales@wildfrontiers.co.tz who claims the listing whose website is
-- wildfrontiers.co.tz already holds a mailbox on that domain, and Supabase
-- confirmed that address at sign-up. There is nothing left to send and nothing
-- left to prove. Together the two routes reach 1,029 listings — 77%.
--
-- The proof is only worth what the domain is worth, so lib/claims/domain-match.ts
-- refuses shared hosts: a gmail.com match, a wixsite.com subdomain or a Facebook
-- page proves that two people use the same free service. That list lives in
-- application code rather than here because it needs revising as hosts appear,
-- and a data-shaped judgement in a migration is a judgement nobody revisits.
-- ===========================================================================

-- 'domain' joins 'email' and 'manual'. Enum values cannot be added inside a
-- transaction block in older Postgres; 17 permits it, and this migration runner
-- wraps each file in one.
alter type claim_verification_method add value if not exists 'domain';

-- Which route produced the row. 026 stored the address but not the method,
-- because there was only one. Existing rows are all code exchanges.
alter table claim_verifications
  add column if not exists method claim_verification_method not null default 'email';

comment on column claim_verifications.method is
  'email = a code was sent to the register address and returned. domain = the signed-in address sits on the domain the listing publishes.';

-- A domain proof is born verified, so the partial index on unverified rows that
-- 026 created for expiry sweeping never sees it. Nothing to change there.
