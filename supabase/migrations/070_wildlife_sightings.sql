-- ===========================================================================
-- 070 — Wildlife sightings: a traveller's personal safari diary
--
-- The wildlife guide (/wildlife) lists about a hundred animals from a file in
-- the code (lib/wildlife/species.ts), not from the database: the list changes
-- when a person edits the text, never at runtime. What does live here is what
-- a traveller saw: one row per sighting, with the date, an optional place and
-- map point, a note and an optional photo.
--
-- species_slug points into that file rather than at a table, so it is checked
-- for shape only. A slug that later disappears from the file simply stops
-- showing; the traveller's row is never lost.
--
-- Private to the traveller. Nobody else, operators and admins included, reads
-- another person's diary; there is no public or shared view in this release.
-- ===========================================================================

create table wildlife_sightings (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null default auth.uid() references profiles(id) on delete cascade,
  species_slug  text not null check (species_slug ~ '^[a-z0-9-]{2,80}$'),
  seen_on       date not null default (now() at time zone 'utc')::date,
  place_name    text check (char_length(place_name) <= 120),
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  notes         text check (char_length(notes) <= 1000),
  -- Path inside the sighting-photos bucket: <profile_id>/<uuid>.<ext>.
  photo_path    text check (char_length(photo_path) <= 300),
  photo_url     text check (char_length(photo_url) <= 600),
  created_at    timestamptz not null default now(),

  -- A point is both coordinates or neither.
  constraint wildlife_sightings_point check ((lat is null) = (lng is null))
);

create index wildlife_sightings_profile_time
  on wildlife_sightings (profile_id, seen_on desc, created_at desc);

grant select, insert, update, delete on wildlife_sightings to authenticated;
grant all on wildlife_sightings to service_role;

alter table wildlife_sightings enable row level security;

create policy wildlife_sightings_own on wildlife_sightings
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Photos attached to a sighting.
--
-- Public bucket so the diary can show them with a plain URL, but the path is
-- <profile_id>/<random uuid>.<ext>, so a photo can only be found by someone
-- given its address. Only the owner may write or remove files in their folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sighting-photos', 'sighting-photos', true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "sighting photos are readable by address"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'sighting-photos');

create policy "travellers upload sighting photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "travellers remove their own sighting photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
