-- ===========================================================================
-- 072 — Sighting photos must not be enumerable
--
-- 070 created the `sighting-photos` bucket public and gave it this policy:
--
--   create policy "sighting photos are readable by address"
--     on storage.objects for select
--     to anon, authenticated
--     using (bucket_id = 'sighting-photos');
--
-- with the stated intent that "the path is <profile_id>/<random uuid>.<ext>,
-- so a photo can only be found by someone given its address".
--
-- That intent did not hold. A SELECT policy on storage.objects governs the
-- list API as well as metadata reads, so `to anon` made the whole bucket
-- browsable. Measured against production before this migration, with one
-- throwaway object uploaded and then deleted:
--
--   anon list('')        -> ['00000000-0000-4000-8000-00000000beef']
--   anon list(<folder>)  -> ['probe-1794110707769.png']
--   anon GET public URL  -> 200, 70 bytes
--
-- So an anonymous caller needed no prior knowledge at all: list the root to
-- harvest profile_ids, list each folder to harvest filenames, then read every
-- photo by its public URL. The random uuid was never the secret it was
-- described as, and "private to the traveller" — 070's own first promise —
-- was not true of the photos.
--
-- The fix is to scope listing to the owner. Reads by address are unaffected:
-- the bucket stays public, and a public bucket serves /object/public/... with
-- no RLS check, which is the path `getPublicUrl` builds and the only way the
-- app ever fetches a photo.
--
-- Nothing in the app lists this bucket. lib/wildlife/actions.ts uses exactly
-- three operations -- upload, getPublicUrl and remove -- so the owner-scoped
-- policy below is strictly more than the product needs today; it is kept
-- rather than dropped outright because `remove` resolves the object first and
-- because a traveller browsing their own folder is a reasonable thing to add.
--
-- Caught while applying 070/071 on 2026-11-07. `wildlife_sightings` had 0 rows
-- at the time, so no real traveller photo was ever exposed.
-- ===========================================================================

drop policy if exists "sighting photos are readable by address" on storage.objects;

create policy "travellers list their own sighting photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
