-- ===========================================================================
-- 014 — Storage buckets and policies
--
-- Path convention is load-bearing. Every business asset is stored as
--   business-media/{business_id}/{filename}
-- and the write policies check that first path segment against ownership. That
-- is what stops one operator overwriting a competitor's gallery — a real risk,
-- since bucket-level permissions alone would let any authenticated business
-- write anywhere in the bucket.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'business-media', 'business-media', true,
    10485760,  -- 10 MB; travel galleries are photo-heavy but originals belong offline
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'guide-covers', 'guide-covers', true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'avatars', 'avatars', true,
    2097152,   -- 2 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- business-media
-- ---------------------------------------------------------------------------
create policy "business media is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'business-media');

create policy "owners write their own business folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-media'
    -- First path segment must be a business id owned by the caller.
    and owns_business(((storage.foldername(name))[1])::uuid)
  );

create policy "owners update their own business folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'business-media'
    and owns_business(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'business-media'
    and owns_business(((storage.foldername(name))[1])::uuid)
  );

create policy "owners delete from their own business folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-media'
    and owns_business(((storage.foldername(name))[1])::uuid)
  );

create policy "admins manage all business media"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'business-media' and is_admin())
  with check (bucket_id = 'business-media' and is_admin());

-- ---------------------------------------------------------------------------
-- guide-covers — editorial imagery, admin-managed
-- ---------------------------------------------------------------------------
create policy "guide covers are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'guide-covers');

create policy "admins manage guide covers"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'guide-covers' and is_admin())
  with check (bucket_id = 'guide-covers' and is_admin());

-- ---------------------------------------------------------------------------
-- avatars — path is avatars/{user_id}/...
-- ---------------------------------------------------------------------------
create policy "avatars are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "users write their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
