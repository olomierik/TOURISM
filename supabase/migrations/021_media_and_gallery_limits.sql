-- ===========================================================================
-- 021 — Destination media, image captions, and an enforced gallery quota
--
-- Three related changes, all in service of letting people actually put pictures
-- on this site:
--
-- 1. media gains destination_id. Destinations previously had a single
--    cover_image_url and no gallery at all, so there was nowhere to put the
--    photographs that make a destination page worth reading.
--
-- 2. media gains caption. alt_text already existed but is a different job:
--    alt_text describes the image for someone who cannot see it and should be
--    terse and literal, while a caption is editorial and shown to everyone.
--    Overloading one field would have forced a choice between accessibility and
--    the visible description the brief asks for.
--
-- 3. The gallery quota is enforced in the database, not just the UI.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Destination media
-- ---------------------------------------------------------------------------
alter table media add column if not exists destination_id uuid
  references destinations(id) on delete cascade;

alter table media add column if not exists caption text;

-- The original constraint predates destination media and would reject every
-- destination image as ownerless.
alter table media drop constraint if exists media_has_owner;
alter table media add constraint media_has_owner check (
  business_id is not null
  or package_id is not null
  or guide_id is not null
  or destination_id is not null
);

create index if not exists media_destination_idx
  on media (destination_id, sort_order);

-- ---------------------------------------------------------------------------
-- Gallery quota
--
-- The brief is "ten images, then subscribe". That number is an entitlement, so
-- it lives in subscription_plans alongside the others rather than as a constant
-- in application code — raising it for a promotion must not require a deploy.
-- ---------------------------------------------------------------------------
update subscription_plans set max_gallery_images = 10 where key = 'free';

/**
 * The gallery limit for a business, resolved through its active subscription.
 *
 * A business with no active subscription is on the free plan; that is the normal
 * state for a new listing, not an error, so it resolves to the free plan's limit
 * rather than to zero or to unlimited. A null limit on a plan means unlimited
 * and is returned as null.
 *
 * past_due deliberately does not count as active. A lapsed payment should stop
 * new uploads rather than silently keep granting the paid allowance — existing
 * images are never deleted, so nothing the business already published is lost.
 */
create or replace function gallery_limit_for(p_business_id uuid)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.max_gallery_images
      from subscriptions s
      join subscription_plans p on p.id = s.plan_id
      where s.business_id = p_business_id
        and s.status = 'active'
      order by p.lead_priority
      limit 1
    ),
    (select max_gallery_images from subscription_plans where key = 'free')
  );
$$;

/**
 * Rejects a gallery image that would take a business past its plan's limit.
 *
 * This is the paywall's teeth. The dashboard checks the count before offering
 * the upload control, but that check runs in a browser and protects nothing on
 * its own: the storage API is reachable directly with the publishable key, so a
 * limit enforced only in the UI is a limit enforced only against people who do
 * not look. Raising here means the constraint holds regardless of how the row
 * arrives.
 *
 * Only 'gallery' images count. A logo and a cover are structural — a business
 * with no logo looks broken — and charging for them would make the free tier
 * look deliberately crippled rather than merely limited.
 */
create or replace function enforce_gallery_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit smallint;
  v_count integer;
begin
  if new.business_id is null or new.kind <> 'gallery' then
    return new;
  end if;

  -- Admins curate on behalf of businesses and are not the ones being metered.
  if is_admin() then
    return new;
  end if;

  v_limit := gallery_limit_for(new.business_id);
  if v_limit is null then
    return new;  -- unlimited plan
  end if;

  select count(*) into v_count
  from media
  where business_id = new.business_id
    and kind = 'gallery'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_count >= v_limit then
    raise exception 'gallery_limit_reached'
      using hint = v_limit::text,
            errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists media_enforce_gallery_limit on media;
create trigger media_enforce_gallery_limit
  before insert on media
  for each row execute function enforce_gallery_limit();

-- ---------------------------------------------------------------------------
-- RLS for destination media
--
-- Destinations are editorial content owned by the platform, so writes are
-- admin-only. The existing media_own policy has no destination branch, which
-- would leave admins able to write them (it ends in `or is_admin()`) but makes
-- the intent invisible; spelling it out keeps the table's rules readable.
-- ---------------------------------------------------------------------------
drop policy if exists media_read on media;
create policy media_read on media
  for select to anon, authenticated
  using (
    (business_id is not null and business_is_public(business_id))
    or (package_id is not null and package_is_public(package_id))
    or (guide_id is not null and exists (
      select 1 from guides g where g.id = guide_id and g.status = 'published'
    ))
    or (destination_id is not null and exists (
      select 1 from destinations d
      where d.id = destination_id and d.is_active and d.deleted_at is null
    ))
  );

drop policy if exists media_own on media;
create policy media_own on media
  for all to authenticated
  using (
    (business_id is not null and owns_business(business_id))
    or (package_id is not null and owns_package(package_id))
    or is_admin()
  )
  with check (
    (business_id is not null and owns_business(business_id))
    or (package_id is not null and owns_package(package_id))
    or is_admin()
  );

-- ---------------------------------------------------------------------------
-- destination-media bucket
--
-- Separate from business-media because the write rule is categorically
-- different: business-media authorizes by folder ownership, this authorizes by
-- role. Mixing them would mean one policy trying to express both.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'destination-media', 'destination-media', true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "destination media is publicly readable" on storage.objects;
create policy "destination media is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'destination-media');

drop policy if exists "admins manage destination media" on storage.objects;
create policy "admins manage destination media"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'destination-media' and is_admin())
  with check (bucket_id = 'destination-media' and is_admin());
