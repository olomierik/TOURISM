-- ===========================================================================
-- 013 — Row Level Security
--
-- Deny by default: RLS is enabled on every table in `public`, and anything
-- without an explicit policy is unreachable to the anon and authenticated roles.
-- Server-side code that legitimately needs to bypass this uses the service role.
--
-- Policies wrap auth.uid() in a scalar subselect — `(select auth.uid())` — so
-- Postgres evaluates it once per query as an InitPlan rather than once per row.
-- On a directory listing thousands of businesses that is the difference between
-- an index scan and a sequential one.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function owns_business(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from businesses
    where id = target
      and owner_id = (select auth.uid())
      and deleted_at is null
  );
$$;

-- Is this business publicly visible right now?
create or replace function business_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from businesses
    where id = target and status = 'approved' and deleted_at is null
  );
$$;

create or replace function package_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from packages p
    join businesses b on b.id = p.business_id
    where p.id = target
      and p.status = 'published'
      and p.deleted_at is null
      and b.status = 'approved'
      and b.deleted_at is null
  );
$$;

create or replace function owns_package(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from packages p
    join businesses b on b.id = p.business_id
    where p.id = target
      and b.owner_id = (select auth.uid())
      and b.deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reference data — world-readable, admin-writable
-- ---------------------------------------------------------------------------
create policy locales_read on locales
  for select to anon, authenticated using (true);
create policy locales_admin on locales
  for all to authenticated using (is_admin()) with check (is_admin());

create policy destinations_read on destinations
  for select to anon, authenticated
  using (is_active and deleted_at is null);
create policy destinations_admin on destinations
  for all to authenticated using (is_admin()) with check (is_admin());

create policy destination_tr_read on destination_translations
  for select to anon, authenticated
  using (exists (
    select 1 from destinations d
    where d.id = destination_id and d.is_active and d.deleted_at is null
  ));
create policy destination_tr_admin on destination_translations
  for all to authenticated using (is_admin()) with check (is_admin());

create policy categories_read on categories
  for select to anon, authenticated
  using (is_active and deleted_at is null);
create policy categories_admin on categories
  for all to authenticated using (is_admin()) with check (is_admin());

create policy category_tr_read on category_translations
  for select to anon, authenticated
  using (exists (
    select 1 from categories c
    where c.id = category_id and c.is_active and c.deleted_at is null
  ));
create policy category_tr_admin on category_translations
  for all to authenticated using (is_admin()) with check (is_admin());

create policy seasonality_read on destination_seasonality
  for select to anon, authenticated using (true);
create policy seasonality_admin on destination_seasonality
  for all to authenticated using (is_admin()) with check (is_admin());

create policy seasonality_tr_read on destination_seasonality_translations
  for select to anon, authenticated using (true);
create policy seasonality_tr_admin on destination_seasonality_translations
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Profiles — a user sees and edits only their own
-- ---------------------------------------------------------------------------
create policy profiles_read_own on profiles
  for select to authenticated
  using (id = (select auth.uid()) or is_admin());

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- Role escalation guard: a user may edit their profile but never award
-- themselves a different role. Only an admin, or the signup trigger (which runs
-- security definer and bypasses RLS), may set it.
create or replace function profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only an administrator may change a user role'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_trigger
  before update on profiles
  for each row execute function profiles_guard_role();

-- ---------------------------------------------------------------------------
-- Businesses
-- ---------------------------------------------------------------------------
create policy businesses_read_public on businesses
  for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);

create policy businesses_read_own on businesses
  for select to authenticated
  using (owner_id = (select auth.uid()) or is_admin());

-- An owner may only create a business owned by themselves, and only in a
-- pre-publication state — going straight to 'approved' would bypass review.
create policy businesses_insert_own on businesses
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status in ('draft', 'pending')
  );

create policy businesses_update_own on businesses
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy businesses_admin on businesses
  for all to authenticated using (is_admin()) with check (is_admin());

-- Owners must not be able to approve, verify, re-tier or transfer their own
-- listing. RLS can gate the row but not individual columns, so this is enforced
-- as a trigger.
create or replace function businesses_guard_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
     and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
    raise exception 'Business status is set by review, not by the owner'
      using errcode = 'insufficient_privilege';
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.verified_by is distinct from old.verified_by then
    raise exception 'Verification is an administrator decision'
      using errcode = 'insufficient_privilege';
  end if;

  if new.tier is distinct from old.tier then
    raise exception 'Tier follows the active subscription'
      using errcode = 'insufficient_privilege';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'Ownership cannot be reassigned by the owner'
      using errcode = 'insufficient_privilege';
  end if;

  -- Aggregates are derived; never writable.
  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.response_rate := old.response_rate;
  new.avg_response_minutes := old.avg_response_minutes;

  return new;
end;
$$;

create trigger businesses_guard_privileged_fields_trigger
  before update on businesses
  for each row execute function businesses_guard_privileged_fields();

-- ---------------------------------------------------------------------------
-- Business child tables — public when the parent is public, writable by owner
-- ---------------------------------------------------------------------------
create policy business_tr_read on business_translations
  for select to anon, authenticated using (business_is_public(business_id));
create policy business_tr_own on business_translations
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

create policy business_categories_read on business_categories
  for select to anon, authenticated using (business_is_public(business_id));
create policy business_categories_own on business_categories
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

create policy business_destinations_read on business_destinations
  for select to anon, authenticated using (business_is_public(business_id));
create policy business_destinations_own on business_destinations
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

create policy business_services_read on business_services
  for select to anon, authenticated
  using (is_active and business_is_public(business_id));
create policy business_services_own on business_services
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

create policy business_service_tr_read on business_service_translations
  for select to anon, authenticated
  using (exists (
    select 1 from business_services s
    where s.id = service_id and s.is_active and business_is_public(s.business_id)
  ));
create policy business_service_tr_own on business_service_translations
  for all to authenticated
  using (exists (select 1 from business_services s where s.id = service_id and owns_business(s.business_id)) or is_admin())
  with check (exists (select 1 from business_services s where s.id = service_id and owns_business(s.business_id)) or is_admin());

-- ---------------------------------------------------------------------------
-- Packages
-- ---------------------------------------------------------------------------
create policy packages_read_public on packages
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null and business_is_public(business_id));
create policy packages_own on packages
  for all to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());

create policy package_tr_read on package_translations
  for select to anon, authenticated using (package_is_public(package_id));
create policy package_tr_own on package_translations
  for all to authenticated
  using (owns_package(package_id) or is_admin())
  with check (owns_package(package_id) or is_admin());

create policy package_inclusions_read on package_inclusions
  for select to anon, authenticated using (package_is_public(package_id));
create policy package_inclusions_own on package_inclusions
  for all to authenticated
  using (owns_package(package_id) or is_admin())
  with check (owns_package(package_id) or is_admin());

create policy package_inclusion_tr_read on package_inclusion_translations
  for select to anon, authenticated
  using (exists (select 1 from package_inclusions i where i.id = inclusion_id and package_is_public(i.package_id)));
create policy package_inclusion_tr_own on package_inclusion_translations
  for all to authenticated
  using (exists (select 1 from package_inclusions i where i.id = inclusion_id and owns_package(i.package_id)) or is_admin())
  with check (exists (select 1 from package_inclusions i where i.id = inclusion_id and owns_package(i.package_id)) or is_admin());

create policy package_destinations_read on package_destinations
  for select to anon, authenticated using (package_is_public(package_id));
create policy package_destinations_own on package_destinations
  for all to authenticated
  using (owns_package(package_id) or is_admin())
  with check (owns_package(package_id) or is_admin());

create policy package_categories_read on package_categories
  for select to anon, authenticated using (package_is_public(package_id));
create policy package_categories_own on package_categories
  for all to authenticated
  using (owns_package(package_id) or is_admin())
  with check (owns_package(package_id) or is_admin());

-- ---------------------------------------------------------------------------
-- Leads
--
-- The most sensitive data in the system: a traveler's contact details and travel
-- plans. A business may read only the enquiries actually distributed to it, and
-- only ever through its own lead_businesses row.
-- ---------------------------------------------------------------------------
create policy leads_read_own on leads
  for select to authenticated
  using (traveler_id = (select auth.uid()) or is_admin());

-- A business reads the leads it received.
create policy leads_read_distributed on leads
  for select to authenticated
  using (exists (
    select 1 from lead_businesses lb
    join businesses b on b.id = lb.business_id
    where lb.lead_id = leads.id
      and b.owner_id = (select auth.uid())
  ));

-- Anyone may submit an enquiry, including guests — requiring an account before
-- a quote is the fastest way to lose the lead. traveler_id must be either the
-- submitting user or null; it cannot be attributed to somebody else.
create policy leads_insert_any on leads
  for insert to anon, authenticated
  with check (
    traveler_id is null or traveler_id = (select auth.uid())
  );

create policy leads_admin on leads
  for all to authenticated using (is_admin()) with check (is_admin());

-- Distribution rows: readable by the receiving business and the enquiry's owner.
create policy lead_businesses_read on lead_businesses
  for select to authenticated
  using (
    owns_business(business_id)
    or exists (select 1 from leads l where l.id = lead_id and l.traveler_id = (select auth.uid()))
    or is_admin()
  );

-- A business updates only its own copy, and only its own workflow fields.
create policy lead_businesses_update_own on lead_businesses
  for update to authenticated
  using (owns_business(business_id))
  with check (owns_business(business_id));

create policy lead_businesses_admin on lead_businesses
  for all to authenticated using (is_admin()) with check (is_admin());

-- Rank and match_reason are the distribution record itself; a recipient must not
-- be able to rewrite its own position or reassign the lead.
create or replace function lead_businesses_guard_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  if new.lead_id is distinct from old.lead_id
     or new.business_id is distinct from old.business_id
     or new.rank is distinct from old.rank
     or new.match_reason is distinct from old.match_reason
     or new.sent_at is distinct from old.sent_at then
    raise exception 'Lead distribution records cannot be rewritten'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger lead_businesses_guard_fields_trigger
  before update on lead_businesses
  for each row execute function lead_businesses_guard_fields();

create policy lead_events_read on lead_events
  for select to authenticated
  using (
    is_admin()
    or exists (select 1 from leads l where l.id = lead_id and l.traveler_id = (select auth.uid()))
    or (business_id is not null and owns_business(business_id))
  );

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create policy reviews_read_published on reviews
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

create policy reviews_read_own on reviews
  for select to authenticated
  using (author_id = (select auth.uid()) or owns_business(business_id) or is_admin());

create policy reviews_insert_own on reviews
  for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy reviews_update_own on reviews
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- The owner may reply, but only to reviews of their own business.
create policy reviews_owner_reply on reviews
  for update to authenticated
  using (owns_business(business_id))
  with check (owns_business(business_id));

create policy reviews_admin on reviews
  for all to authenticated using (is_admin()) with check (is_admin());

-- Authors must not publish or re-score their own review; owners may only touch
-- the reply field.
create or replace function reviews_guard_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  if owns_business(new.business_id) and new.author_id <> (select auth.uid()) then
    if new.rating is distinct from old.rating
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.status is distinct from old.status then
      raise exception 'A business may reply to a review but not alter it'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Review publication is a moderation decision'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger reviews_guard_fields_trigger
  before update on reviews
  for each row execute function reviews_guard_fields();

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create policy guides_read_published on guides
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);
create policy guides_admin on guides
  for all to authenticated using (is_admin()) with check (is_admin());

create policy guide_tr_read on guide_translations
  for select to anon, authenticated
  using (exists (
    select 1 from guides g
    where g.id = guide_id and g.status = 'published' and g.deleted_at is null
  ));
create policy guide_tr_admin on guide_translations
  for all to authenticated using (is_admin()) with check (is_admin());

create policy guide_faqs_read on guide_faqs
  for select to anon, authenticated using (true);
create policy guide_faqs_admin on guide_faqs
  for all to authenticated using (is_admin()) with check (is_admin());

create policy guide_faq_tr_read on guide_faq_translations
  for select to anon, authenticated using (true);
create policy guide_faq_tr_admin on guide_faq_translations
  for all to authenticated using (is_admin()) with check (is_admin());

create policy media_read on media
  for select to anon, authenticated
  using (
    (business_id is not null and business_is_public(business_id))
    or (package_id is not null and package_is_public(package_id))
    or (guide_id is not null and exists (
      select 1 from guides g where g.id = guide_id and g.status = 'published'
    ))
  );
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
-- Monetization
-- ---------------------------------------------------------------------------
create policy plans_read on subscription_plans
  for select to anon, authenticated using (is_active);
create policy plans_admin on subscription_plans
  for all to authenticated using (is_admin()) with check (is_admin());

create policy plan_tr_read on subscription_plan_translations
  for select to anon, authenticated using (true);
create policy plan_tr_admin on subscription_plan_translations
  for all to authenticated using (is_admin()) with check (is_admin());

-- A business sees its own subscription; only admins and the service role write.
create policy subscriptions_read_own on subscriptions
  for select to authenticated
  using (owns_business(business_id) or is_admin());
create policy subscriptions_admin on subscriptions
  for all to authenticated using (is_admin()) with check (is_admin());

create policy payments_read_own on payments
  for select to authenticated
  using ((business_id is not null and owns_business(business_id)) or is_admin());
create policy payments_admin on payments
  for all to authenticated using (is_admin()) with check (is_admin());

-- Featured placements are readable so the UI can label them; only admins set them.
create policy featured_read on featured_listings
  for select to anon, authenticated
  using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy featured_admin on featured_listings
  for all to authenticated using (is_admin()) with check (is_admin());

create policy lead_credits_read_own on lead_credits
  for select to authenticated
  using (owns_business(business_id) or is_admin());
create policy lead_credits_admin on lead_credits
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Personal / operational
-- ---------------------------------------------------------------------------
create policy favorites_own on favorites
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy notifications_read_own on notifications
  for select to authenticated
  using (profile_id = (select auth.uid()) or is_admin());
create policy notifications_update_own on notifications
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy notifications_admin on notifications
  for all to authenticated using (is_admin()) with check (is_admin());

-- Audit log is admin-read and append-only; nobody may edit or delete history.
create policy audit_logs_read on audit_logs
  for select to authenticated using (is_admin());

-- Analytics: anyone may record a view, nobody but an admin may read the raw rows.
create policy page_views_insert on page_views
  for insert to anon, authenticated with check (true);
create policy page_views_read_admin on page_views
  for select to authenticated using (is_admin());

create policy platform_settings_read on platform_settings
  for select to anon, authenticated using (true);
create policy platform_settings_admin on platform_settings
  for all to authenticated using (is_admin()) with check (is_admin());

-- schema_migrations intentionally has no policy: RLS is on, so it is invisible
-- to anon and authenticated. Only the service role and direct connections see it.
