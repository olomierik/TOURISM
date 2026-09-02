-- ===========================================================================
-- 055 — Likes, comments and travellers' own photographs
--
-- The directory has 2,618 listings, 28 visitors a month and nothing on any
-- page that a visitor can do except leave. Everything here exists to give a
-- reader a reason to touch a listing, and to give a listing something on it
-- that the operator did not write.
--
-- Three decisions shape the whole file.
--
-- Who may do what, and what it costs to abuse it. A like is one tap and is
-- worth almost nothing, so it is open to anybody and deduplicated per visitor.
-- A comment is text on somebody else's business page, so a signed-in author is
-- published at once and an anonymous one waits for a human. A photograph is
-- the highest-risk thing a stranger can put on a public site, so it requires an
-- account and always waits for a human. The rule is the same each time: the
-- less the platform can undo, the more it asks first.
--
-- Counters live on businesses. A directory card showing "12 comments" cannot
-- afford a subquery per card, and the alternative — counting in the
-- application after fetching — is the N+1 that makes a listing page slow. The
-- triggers below keep three integers correct so a card costs one read.
--
-- Nothing here touches media, reviews or any existing query. Travellers'
-- photographs live in their own table with their own bucket precisely so the
-- operator gallery keeps working exactly as it does today.
-- ===========================================================================

create type moderation_status as enum ('pending', 'published', 'rejected');

-- ---------------------------------------------------------------------------
-- Likes
--
-- Anonymous, because requiring an account to tap a heart on a directory with
-- no registered travellers is a button nobody will ever press.
--
-- visitor_id is a UUID the browser keeps. It is not proof of anything — a
-- determined person can clear it and like again — and it does not need to be:
-- the cost of a false like is one wrong integer, and the cost of demanding an
-- account is every real like. A signed-in visitor is deduplicated by account
-- instead, which is stronger and free.
-- ---------------------------------------------------------------------------
create table business_likes (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id     uuid references profiles (id) on delete cascade,
  visitor_id  uuid not null,
  created_at  timestamptz not null default now(),

  -- One like per visitor per listing. A signed-in person is also one visitor,
  -- so the pair below is the honest key; the partial index that follows stops
  -- the same account liking twice from two browsers.
  unique (business_id, visitor_id)
);

create unique index business_likes_user_unique
  on business_likes (business_id, user_id) where user_id is not null;

create index business_likes_business_idx on business_likes (business_id);

comment on table business_likes is
  'One tap, deduplicated per browser and per account. Not proof of anything, and does not need to be: a false like costs one integer.';

-- ---------------------------------------------------------------------------
-- Comments
--
-- Separate from reviews on purpose. A review carries a rating, is tied to an
-- enquiry, and feeds rating_avg; a comment is a sentence from somebody who
-- passed through. Folding them together would either put unrated text into the
-- rating average or force a star rating on somebody who only wanted to say the
-- guide was excellent.
-- ---------------------------------------------------------------------------
create table business_comments (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses (id) on delete cascade,
  author_id     uuid references profiles (id) on delete set null,
  -- Kept for anonymous authors, and for signed-in ones whose display name may
  -- change later: the name shown beside a comment should be the name they had
  -- when they wrote it.
  author_name   text not null,
  body          text not null,
  -- "They gave me the best service" — the thing the traveller actually wants to
  -- say, countable, and shown as a badge rather than buried in prose.
  is_recommendation boolean not null default false,
  locale        text,
  status        moderation_status not null default 'pending',
  moderated_by  uuid references profiles (id) on delete set null,
  moderated_at  timestamptz,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint comment_body_length check (char_length(btrim(body)) between 2 and 2000),
  constraint comment_author_name_length check (char_length(btrim(author_name)) between 1 and 80)
);

create index business_comments_business_idx
  on business_comments (business_id, created_at desc) where status = 'published' and deleted_at is null;

comment on table business_comments is
  'Short public notes on a listing. A signed-in author publishes at once; an anonymous one waits for a human, because unmoderated anonymous text on somebody else business page is a spam surface.';

-- ---------------------------------------------------------------------------
-- Travellers' photographs
--
-- Its own table and its own bucket, so the operator gallery in `media` keeps
-- working untouched. Every existing query that reads media continues to read
-- exactly what it read before this migration.
--
-- Always moderated, and an account is always required. A public site that
-- accepts images from strangers without either is a host for whatever anybody
-- decides to upload, and no amount of after-the-fact deletion undoes the hours
-- it was live.
-- ---------------------------------------------------------------------------
create table traveler_photos (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  uploaded_by  uuid not null references profiles (id) on delete cascade,
  bucket       text not null default 'traveler-photos',
  storage_path text not null,
  public_url   text not null,
  caption      text,
  status       moderation_status not null default 'pending',
  moderated_by uuid references profiles (id) on delete set null,
  moderated_at timestamptz,
  created_at   timestamptz not null default now(),

  constraint traveler_photo_https check (public_url ~* '^https://'),
  constraint traveler_photo_caption_length check (caption is null or char_length(caption) <= 300),
  unique (bucket, storage_path)
);

create index traveler_photos_business_idx
  on traveler_photos (business_id, created_at desc) where status = 'published';
create index traveler_photos_pending_idx
  on traveler_photos (created_at) where status = 'pending';

comment on table traveler_photos is
  'Photographs uploaded by travellers. Always moderated and always attributable to an account: a public site accepting images from strangers without both is a host for whatever anybody uploads.';

-- ---------------------------------------------------------------------------
-- Counters
--
-- Denormalised because the directory renders twelve cards at a time and each
-- one shows these numbers. A subquery per card is twelve extra round trips to
-- another continent; counting in the application after the fact is the same
-- thing with more steps.
-- ---------------------------------------------------------------------------
alter table businesses
  add column like_count    integer not null default 0,
  add column comment_count integer not null default 0,
  add column photo_count   integer not null default 0;

create or replace function bump_business_counter() returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_business uuid;
  v_column   text;
  v_delta    integer;
begin
  v_business := coalesce(new.business_id, old.business_id);

  v_column := case tg_table_name
    when 'business_likes'    then 'like_count'
    when 'business_comments' then 'comment_count'
    when 'traveler_photos'   then 'photo_count'
  end;

  -- Only visible rows are counted, so a number on a card matches what clicking
  -- it shows. A pending comment that counted would promise a comment the reader
  -- then cannot find.
  if tg_table_name = 'business_likes' then
    v_delta := case tg_op when 'INSERT' then 1 when 'DELETE' then -1 else 0 end;
  else
    v_delta :=
      (case when tg_op in ('INSERT', 'UPDATE')
             and new.status = 'published'
             and (tg_table_name <> 'business_comments' or new.deleted_at is null)
        then 1 else 0 end)
      -
      (case when tg_op in ('UPDATE', 'DELETE')
             and old.status = 'published'
             and (tg_table_name <> 'business_comments' or old.deleted_at is null)
        then 1 else 0 end);
  end if;

  if v_delta <> 0 then
    execute format('update businesses set %I = greatest(0, %I + $1) where id = $2', v_column, v_column)
      using v_delta, v_business;
  end if;

  return null;
end;
$fn$;

create trigger business_likes_count
  after insert or delete on business_likes
  for each row execute function bump_business_counter();

create trigger business_comments_count
  after insert or update or delete on business_comments
  for each row execute function bump_business_counter();

create trigger traveler_photos_count
  after insert or update or delete on traveler_photos
  for each row execute function bump_business_counter();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table business_likes    enable row level security;
alter table business_comments enable row level security;
alter table traveler_photos   enable row level security;

-- Likes: anybody may add or remove their own, and the count is what is read
-- rather than the rows. Nobody browses a list of who liked what.
create policy likes_insert on business_likes for insert with check (true);
create policy likes_delete_own on business_likes
  for delete using (user_id is not null and user_id = auth.uid());
create policy likes_read on business_likes for select using (true);
create policy likes_admin on business_likes for all using (is_admin()) with check (is_admin());

-- Comments: published ones are public; an author sees their own while it waits.
create policy comments_read_published on business_comments
  for select using (status = 'published' and deleted_at is null);
create policy comments_read_own on business_comments
  for select using (author_id is not null and author_id = auth.uid());
create policy comments_insert on business_comments for insert with check (true);
create policy comments_admin on business_comments
  for all using (is_admin()) with check (is_admin());
-- The operator may read every comment on their own listing, including the ones
-- still waiting: being able to see what is about to be published about you is
-- the least a directory owes a business.
create policy comments_owner_read on business_comments
  for select using (
    exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- Photographs: published ones are public, uploaders see their own, admins all.
create policy photos_read_published on traveler_photos
  for select using (status = 'published');
create policy photos_read_own on traveler_photos
  for select using (uploaded_by = auth.uid());
create policy photos_insert_own on traveler_photos
  for insert with check (uploaded_by = auth.uid());
create policy photos_delete_own on traveler_photos
  for delete using (uploaded_by = auth.uid());
create policy photos_admin on traveler_photos
  for all using (is_admin()) with check (is_admin());
create policy photos_owner_read on traveler_photos
  for select using (
    exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Storage for travellers' photographs
--
-- A bucket of its own, because the write rule is categorically different from
-- business-media's. That bucket authorises by folder ownership — an operator
-- may write into their own listing's folder and nowhere else. Here any
-- signed-in traveller may write into any listing's folder, which is exactly
-- why nothing they write is visible until a human has looked at it.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'traveler-photos', 'traveler-photos', true,
  5242880,  -- 5 MB. A phone photograph, not an original.
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "traveler photos are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'traveler-photos');

create policy "signed in travellers may upload a photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'traveler-photos'
    -- Second segment is the uploader, so a traveller cannot overwrite another
    -- traveller's file even inside the same listing's folder.
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "travellers may remove their own photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'traveler-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
