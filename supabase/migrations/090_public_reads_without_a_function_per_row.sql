-- ===========================================================================
-- 090 — Public reads without a function call per row
--
-- Found on 14 November 2026 while asking why Search Console shows thousands
-- of impressions and thirty clicks. Part of the answer was not ranking at
-- all: the live site was answering 504 on /hotels/mount-kenya and
-- /hotels/serengeti, taking 35 seconds on /directory, and five seconds to
-- first byte on a page already in the cache. The database was the reason.
--
-- pg_stat_statements, the same day:
--
--   the listing-card query   387,715 calls   502 ms mean   54 hours in total
--   and the next eleven entries are the same query with other filters
--
-- Every public child table of `businesses` — translations, categories,
-- destinations, activities, intents, registers, services, media, packages —
-- decides visibility with `business_is_public(business_id)`. That function is
-- SECURITY DEFINER with a SET search_path, and Postgres can neither inline
-- such a function nor plan around it: it is started and torn down once for
-- every row the query looks at. Measured as the anon role, which is every
-- crawler and every visitor who is not signed in:
--
--                                              before        after
--   count listings that have a translation     17,405 ms     466 ms
--   read business_destinations                    446 ms       4 ms
--   read business_categories                      143 ms       4 ms
--
-- with identical rows returned. anon's statement_timeout is three seconds, so
-- under load these reads were being cancelled, the page fell back to curated
-- placeholder content or timed out, and Google and AdSense were both shown a
-- site that was slow, sometimes broken and sometimes not its real self.
--
-- The policies now say the same thing as a subquery the planner can see into.
-- `businesses` has its own row security, and a subquery in a policy runs as
-- the caller, so the conditions are written out rather than left to that:
-- the answer does not depend on who is asking, exactly as with the function.
--
-- The `_own` policies — owner or admin, authenticated only — are untouched.
-- `business_is_public` and `package_is_public` stay defined; triggers and
-- other code still call them one row at a time, where the cost is nothing.
-- ===========================================================================
begin;

-- Proof that each rewritten predicate selects exactly the rows the function
-- did, checked as the migration role (which bypasses row security) before any
-- policy is touched. If one differs, nothing is changed.
do $$
declare
  t      text;
  a      bigint;
  b      bigint;
begin
  foreach t in array array[
    'business_translations', 'business_categories', 'business_destinations',
    'business_activities', 'business_intents', 'business_registers'
  ] loop
    execute format('select count(*) from %I x where business_is_public(x.business_id)', t) into a;
    execute format(
      'select count(*) from %I x where exists (
         select 1 from businesses b
         where b.id = x.business_id and b.status = ''approved'' and b.deleted_at is null)', t) into b;
    if a <> b then
      raise exception '090: % would show % rows instead of %', t, b, a;
    end if;
  end loop;

  select count(*) into a from media m
   where (m.business_id is not null and business_is_public(m.business_id))
      or (m.package_id is not null and package_is_public(m.package_id));
  select count(*) into b from media m
   where (m.business_id is not null and exists (
            select 1 from businesses bz
            where bz.id = m.business_id and bz.status = 'approved' and bz.deleted_at is null))
      or (m.package_id is not null and exists (
            select 1 from packages p join businesses bz on bz.id = p.business_id
            where p.id = m.package_id and p.status = 'published' and p.deleted_at is null
              and bz.status = 'approved' and bz.deleted_at is null));
  if a <> b then
    raise exception '090: media would show % rows instead of %', b, a;
  end if;

  select count(*) into a from packages p
   where p.status = 'published' and p.deleted_at is null and business_is_public(p.business_id);
  select count(*) into b from packages p
   where p.status = 'published' and p.deleted_at is null and exists (
           select 1 from businesses bz
           where bz.id = p.business_id and bz.status = 'approved' and bz.deleted_at is null);
  if a <> b then
    raise exception '090: packages would show % rows instead of %', b, a;
  end if;
end $$;

alter policy business_tr_read on business_translations using (
  exists (select 1 from businesses b
          where b.id = business_translations.business_id
            and b.status = 'approved' and b.deleted_at is null));

alter policy business_categories_read on business_categories using (
  exists (select 1 from businesses b
          where b.id = business_categories.business_id
            and b.status = 'approved' and b.deleted_at is null));

alter policy business_destinations_read on business_destinations using (
  exists (select 1 from businesses b
          where b.id = business_destinations.business_id
            and b.status = 'approved' and b.deleted_at is null));

alter policy business_activities_read on business_activities using (
  exists (select 1 from businesses b
          where b.id = business_activities.business_id
            and b.status = 'approved' and b.deleted_at is null));

alter policy business_intents_read on business_intents using (
  exists (select 1 from businesses b
          where b.id = business_intents.business_id
            and b.status = 'approved' and b.deleted_at is null));

alter policy business_registers_read on business_registers using (
  exists (select 1 from businesses b
          where b.id = business_registers.business_id
            and b.status = 'approved' and b.deleted_at is null));

alter policy business_services_read on business_services using (
  is_active
  and exists (select 1 from businesses b
              where b.id = business_services.business_id
                and b.status = 'approved' and b.deleted_at is null));

alter policy business_service_tr_read on business_service_translations using (
  exists (select 1
          from business_services s
          join businesses b on b.id = s.business_id
          where s.id = business_service_translations.service_id
            and s.is_active
            and b.status = 'approved' and b.deleted_at is null));

alter policy packages_read_public on packages using (
  status = 'published'
  and deleted_at is null
  and exists (select 1 from businesses b
              where b.id = packages.business_id
                and b.status = 'approved' and b.deleted_at is null));

alter policy media_read on media using (
  (business_id is not null and exists (
     select 1 from businesses b
     where b.id = media.business_id and b.status = 'approved' and b.deleted_at is null))
  or (package_id is not null and exists (
     select 1 from packages p
     join businesses b on b.id = p.business_id
     where p.id = media.package_id
       and p.status = 'published' and p.deleted_at is null
       and b.status = 'approved' and b.deleted_at is null))
  or (guide_id is not null and exists (
     select 1 from guides g
     where g.id = media.guide_id and g.status = 'published'))
  or (destination_id is not null and exists (
     select 1 from destinations d
     where d.id = media.destination_id and d.is_active and d.deleted_at is null))
);

commit;
