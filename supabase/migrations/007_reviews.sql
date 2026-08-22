-- ===========================================================================
-- 007 — Reviews
--
-- Reviews are gated on a real interaction: the author must have submitted an
-- enquiry that was actually distributed to that business. A directory whose
-- reviews can be manufactured is worth less than one with no reviews at all,
-- and operators will not pay for placement next to obviously fake ratings.
-- ===========================================================================

create table reviews (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete cascade,

  -- The interaction that entitles this review to exist.
  lead_id      uuid references leads(id) on delete set null,

  rating       smallint not null,
  title        text,
  body         text,
  locale       text not null default 'en' references locales(code),

  status       review_status not null default 'pending',

  -- Owner's public reply. One per review; threading adds moderation burden
  -- without adding much for the reader.
  owner_reply       text,
  owner_replied_at  timestamptz,

  moderated_by uuid references profiles(id) on delete set null,
  moderated_at timestamptz,
  moderation_note text,

  is_demo      boolean not null default false,

  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  constraint reviews_rating_range check (rating between 1 and 5),
  -- One review per person per business.
  unique (business_id, author_id)
);

create index reviews_business_idx
  on reviews (business_id, status, created_at desc)
  where deleted_at is null;
create index reviews_status_idx on reviews (status) where deleted_at is null;
create index reviews_author_idx on reviews (author_id);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Proof-of-interaction gate
--
-- Demo seed rows and admin-created records bypass this; everything originating
-- from a real user must be backed by a distributed lead.
-- ---------------------------------------------------------------------------
create or replace function reviews_require_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_demo or is_admin() then
    return new;
  end if;

  if new.lead_id is null then
    raise exception 'A review must reference the enquiry it came from'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
    from lead_businesses lb
    join leads l on l.id = lb.lead_id
    where lb.lead_id = new.lead_id
      and lb.business_id = new.business_id
      and l.traveler_id = new.author_id
  ) then
    raise exception 'Enquiry % was never sent to this business by this traveler', new.lead_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger reviews_require_interaction_trigger
  before insert on reviews
  for each row execute function reviews_require_interaction();

-- ---------------------------------------------------------------------------
-- Keep the denormalized rating on businesses current.
--
-- Only published, non-deleted reviews count, so moderating a review immediately
-- moves the business's public score.
-- ---------------------------------------------------------------------------
create or replace function refresh_business_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.business_id, old.business_id);
begin
  update businesses b
  set rating_avg = coalesce(stats.avg_rating, 0),
      rating_count = coalesce(stats.n, 0)
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*) as n
    from reviews
    where business_id = target
      and status = 'published'
      and deleted_at is null
  ) stats
  where b.id = target;

  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on reviews
  for each row execute function refresh_business_rating();

create or replace function reviews_stamp_published()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  if new.owner_reply is distinct from old.owner_reply and new.owner_reply is not null then
    new.owner_replied_at = now();
  end if;
  return new;
end;
$$;

create trigger reviews_stamp_published_trigger
  before update on reviews
  for each row execute function reviews_stamp_published();
