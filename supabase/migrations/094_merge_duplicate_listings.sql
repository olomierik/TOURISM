-- ===========================================================================
-- 094 — Merging duplicate listings (24 Nov 2026)
--
-- Six operators had two listings each: the one imported from a register or
-- Maps and claimed, and a second they built themselves from the dashboard
-- (found 22 Nov while fixing "getMyBusiness: multiple rows"). Two listings for
-- one company split its views and enquiries, show twice in the directory, and
-- in two cases hid the paid trial on the copy nobody could see.
--
-- merge_businesses(keep, dup) folds `dup` into `keep`:
--
--   * keep's identity stays: id, slug, claim, verification, import record,
--     subscription and tier. That is the listing Google has indexed and the
--     one every check was recorded against.
--   * What the owner typed into dup wins over imported values on keep:
--     contact details, website, images, facts, and any non-empty translated
--     text. City and map pin stay on keep (imported, geocoded) unless missing.
--   * Every row in every table that references dup is moved to keep. Rows
--     that would collide with one keep already has (the same category, the
--     same visitor's like, ...) are dropped as duplicates. The tables are
--     found from the foreign keys at run time, so a table added later is
--     still covered.
--   * dup is snapshotted into business_merges (row, translations,
--     subscriptions) and deleted. Its slug is recorded in
--     business_slug_redirects and the listing page sends it to keep with a
--     permanent redirect, so links and search results keep working.
--
-- Service role only: this is an admin operation with no undo button.
-- ===========================================================================
begin;

create table if not exists business_slug_redirects (
  slug        text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table business_slug_redirects enable row level security;
-- Public: a slug and where it now points, nothing else.
drop policy if exists business_slug_redirects_read on business_slug_redirects;
create policy business_slug_redirects_read on business_slug_redirects
  for select to anon, authenticated using (true);
grant select on business_slug_redirects to anon, authenticated;

create table if not exists business_merges (
  id               uuid primary key default gen_random_uuid(),
  kept_id          uuid not null references businesses(id) on delete cascade,
  merged_id        uuid not null,
  merged_slug      text not null,
  merged_row       jsonb not null,
  merged_children  jsonb not null default '{}'::jsonb,
  merged_at        timestamptz not null default now()
);
alter table business_merges enable row level security;
drop policy if exists business_merges_admin on business_merges;
create policy business_merges_admin on business_merges
  for select to authenticated using (is_admin());

create or replace function merge_businesses(p_keep uuid, p_dup uuid, p_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k businesses%rowtype;
  d businesses%rowtype;
  fk record;
begin
  if p_keep = p_dup then
    raise exception 'merge_businesses: keep and dup are the same listing';
  end if;
  select * into k from businesses where id = p_keep for update;
  select * into d from businesses where id = p_dup for update;
  if k.id is null or d.id is null then
    raise exception 'merge_businesses: listing not found';
  end if;
  if k.owner_id is distinct from d.owner_id and d.owner_id is not null and k.owner_id is not null then
    raise exception 'merge_businesses: % and % belong to different accounts', k.slug, d.slug;
  end if;

  -- 1. Snapshot, before anything moves.
  insert into business_merges (kept_id, merged_id, merged_slug, merged_row, merged_children)
  values (
    k.id, d.id, d.slug, to_jsonb(d),
    jsonb_build_object(
      'translations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from business_translations t where t.business_id = d.id),
      'subscriptions', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from subscriptions s where s.business_id = d.id),
      'keep_before', to_jsonb(k)
    )
  );

  -- 2. Text: the owner's words win, field by field, locale by locale.
  insert into business_translations (business_id, locale, tagline, short_description, description,
                                     seo_title, seo_description, is_machine_translated, reviewed_at)
  select k.id, t.locale, t.tagline, t.short_description, t.description,
         t.seo_title, t.seo_description, t.is_machine_translated, t.reviewed_at
  from business_translations t
  where t.business_id = d.id
    and coalesce(nullif(t.description, ''), nullif(t.short_description, ''), nullif(t.tagline, '')) is not null
  on conflict (business_id, locale) do update set
    tagline           = coalesce(nullif(excluded.tagline, ''), business_translations.tagline),
    short_description = coalesce(nullif(excluded.short_description, ''), business_translations.short_description),
    description       = coalesce(nullif(excluded.description, ''), business_translations.description),
    seo_title         = coalesce(nullif(excluded.seo_title, ''), business_translations.seo_title),
    seo_description   = coalesce(nullif(excluded.seo_description, ''), business_translations.seo_description),
    is_machine_translated = case when nullif(excluded.description, '') is not null
                                 then excluded.is_machine_translated
                                 else business_translations.is_machine_translated end,
    updated_at        = now();
  delete from business_translations where business_id = d.id;

  -- 3. One subscription per listing: keep's stands, dup's goes with dup.
  if exists (select 1 from subscriptions where business_id = k.id) then
    delete from subscriptions where business_id = d.id;
  end if;

  -- 4. Rows keep already has an equivalent of.
  delete from business_categories x using business_categories y
    where x.business_id = d.id and y.business_id = k.id and y.category_id = x.category_id;
  delete from business_destinations x using business_destinations y
    where x.business_id = d.id and y.business_id = k.id and y.destination_id = x.destination_id;
  delete from business_intents x using business_intents y
    where x.business_id = d.id and y.business_id = k.id and y.intent = x.intent;
  delete from business_activities x using business_activities y
    where x.business_id = d.id and y.business_id = k.id and y.activity = x.activity;
  delete from business_registers x using business_registers y
    where x.business_id = d.id and y.business_id = k.id and y.register = x.register;
  delete from lead_businesses x using lead_businesses y
    where x.business_id = d.id and y.business_id = k.id and y.lead_id = x.lead_id;
  delete from reviews x using reviews y
    where x.business_id = d.id and y.business_id = k.id and y.author_id = x.author_id;
  delete from claim_verifications x using claim_verifications y
    where x.business_id = d.id and y.business_id = k.id and y.profile_id = x.profile_id;
  delete from business_payment_methods x using business_payment_methods y
    where x.business_id = d.id and y.business_id = k.id and y.provider = x.provider;
  delete from business_likes x using business_likes y
    where x.business_id = d.id and y.business_id = k.id and y.visitor_id = x.visitor_id;
  delete from operator_contact_reports x using operator_contact_reports y
    where x.business_id = d.id and y.business_id = k.id and y.period = x.period;
  delete from badge_impressions x using badge_impressions y
    where x.business_id = d.id and y.business_id = k.id and y.day = x.day;
  delete from badge_referrers x using badge_referrers y
    where x.business_id = d.id and y.business_id = k.id and y.domain = x.domain;
  -- The partial unique indexes, the same way.
  delete from business_likes x using business_likes y
    where x.business_id = d.id and y.business_id = k.id and x.user_id is not null and y.user_id = x.user_id;
  delete from favorites x using favorites y
    where x.business_id = d.id and y.business_id = k.id and y.profile_id = x.profile_id;
  delete from contact_clicks x using contact_clicks y
    where x.business_id = d.id and y.business_id = k.id and y.channel = x.channel
      and y.visitor_hash = x.visitor_hash and y.day = x.day;
  delete from business_claims x using business_claims y
    where x.business_id = d.id and y.business_id = k.id and x.status = 'pending' and y.status = 'pending'
      and y.claimant_id = x.claimant_id;
  delete from featured_listings x using featured_listings y
    where x.business_id = d.id and y.business_id = k.id
      and x.created_by is null and x.placement = 'homepage' and y.created_by is null and y.placement = 'homepage';
  if exists (select 1 from operator_outreach where business_id = k.id) then
    delete from operator_outreach where business_id = d.id;
  end if;

  -- A listing has one primary category and one primary destination.
  if exists (select 1 from business_categories where business_id = k.id and is_primary) then
    update business_categories set is_primary = false where business_id = d.id;
  end if;
  if exists (select 1 from business_destinations where business_id = k.id and is_primary) then
    update business_destinations set is_primary = false where business_id = d.id;
  end if;

  -- 5. Everything else that points at dup now points at keep. Found from the
  --    foreign keys, so nothing is left behind for the delete to cascade away.
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.businesses'::regclass
      and c.conrelid not in ('public.business_merges'::regclass, 'public.business_slug_redirects'::regclass)
  loop
    execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col) using k.id, d.id;
  end loop;

  -- 6. The listing itself: owner-entered values over imported ones.
  update businesses set
    name              = coalesce(nullif(p_name, ''), k.name),
    legal_name        = coalesce(d.legal_name, k.legal_name),
    logo_url          = coalesce(d.logo_url, k.logo_url),
    cover_image_url   = coalesce(d.cover_image_url, k.cover_image_url),
    email             = coalesce(d.email, k.email),
    phone             = coalesce(nullif(d.phone, ''), k.phone),
    whatsapp          = coalesce(nullif(d.whatsapp, ''), k.whatsapp),
    website           = coalesce(nullif(d.website, ''), k.website),
    address           = coalesce(nullif(k.address, ''), d.address),
    city              = coalesce(nullif(k.city, ''), d.city),
    latitude          = case when k.latitude is null then d.latitude else k.latitude end,
    longitude         = case when k.latitude is null then d.longitude else k.longitude end,
    location_precision = case when k.latitude is null then d.location_precision else k.location_precision end,
    founded_year      = coalesce(d.founded_year, k.founded_year),
    team_size         = coalesce(d.team_size, k.team_size),
    license_number    = coalesce(nullif(d.license_number, ''), k.license_number),
    registration_number = coalesce(nullif(d.registration_number, ''), k.registration_number),
    associations      = coalesce(nullif(d.associations, ''), k.associations),
    day_rate_low      = coalesce(d.day_rate_low, k.day_rate_low),
    day_rate_high     = coalesce(d.day_rate_high, k.day_rate_high),
    day_rate_currency = coalesce(d.day_rate_currency, k.day_rate_currency),
    country_code      = coalesce(k.country_code, d.country_code),
    region_id         = coalesce(k.region_id, d.region_id),
    is_verified       = k.is_verified or d.is_verified,
    verified_at       = coalesce(k.verified_at, d.verified_at),
    claimed_at        = least(k.claimed_at, d.claimed_at),
    trial_started_at  = least(k.trial_started_at, d.trial_started_at),
    -- A listing the owner wrote is not a stub any more.
    is_stub           = k.is_stub and d.is_stub,
    status            = case when k.status = 'approved' or d.status = 'approved' then 'approved'::business_status else k.status end,
    submitted_at      = coalesce(k.submitted_at, d.submitted_at),
    published_at      = coalesce(k.published_at, d.published_at),
    like_count        = k.like_count + d.like_count,
    comment_count     = k.comment_count + d.comment_count,
    photo_count       = k.photo_count + d.photo_count,
    updated_at        = now()
  where id = k.id;

  -- 7. dup goes; its address forwards to keep.
  delete from businesses where id = d.id;
  update business_slug_redirects set business_id = k.id where business_id = d.id;
  insert into business_slug_redirects (slug, business_id) values (d.slug, k.id)
  on conflict (slug) do update set business_id = excluded.business_id;
end;
$$;

revoke all on function merge_businesses(uuid, uuid, text) from public, anon, authenticated;

commit;
