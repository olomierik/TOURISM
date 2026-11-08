-- ===========================================================================
-- 076 — Searching for an operator by name finds the operator
--
-- `business_translations_tsv` has indexed 'tagline:A', 'short_description:B',
-- 'description:C' since migration 011. The business name is not in that list,
-- and it never has been — it lives on `businesses`, which the trigger cannot
-- see.
--
-- This looked like it worked for three years because 059's imported listings
-- carry a template description with the operator's name interpolated into it,
-- so a name search matched the description by accident. Migration 075's import
-- added 513 listings with no description at all — correctly, because inventing
-- one is what got the directory an AdSense rejection — and those 513 became
-- unfindable by name. Searching "acatree" returned nothing while
-- /business/acatree-tours-and-safaris sat there answering 200.
--
-- Two triggers, because the name and the translation change independently:
--
--   on business_translations — fold the parent's name in at write time
--   on businesses            — re-stamp the translations when the name changes
--
-- Weight A, the same as the tagline. A name match is the strongest signal a
-- directory search has: somebody typing "Acatree" wants Acatree, not every
-- listing whose body text mentions it.
-- ===========================================================================

create or replace function update_business_translation_search_vector()
returns trigger
language plpgsql
as $$
declare
  cfg      regconfig;
  bizname  text;
begin
  select l.pg_catalog into cfg from locales l where l.code = new.locale;
  if cfg is null then
    cfg := 'simple'::regconfig;
  end if;

  select b.name into bizname from businesses b where b.id = new.business_id;

  new.search_vector :=
      setweight(to_tsvector(cfg, coalesce(bizname, '')), 'A')
   || setweight(to_tsvector(cfg, coalesce(new.tagline, '')), 'A')
   || setweight(to_tsvector(cfg, coalesce(new.short_description, '')), 'B')
   || setweight(to_tsvector(cfg, coalesce(new.description, '')), 'C');

  return new;
end;
$$;

comment on function update_business_translation_search_vector() is
  'Builds business_translations.search_vector. Unlike the shared update_search_vector(), this one reaches across to businesses.name so a listing is findable by the name people actually type — including the 513 register imports, which deliberately carry no description.';

drop trigger if exists business_translations_tsv on business_translations;
create trigger business_translations_tsv
  before insert or update on business_translations
  for each row execute function update_business_translation_search_vector();

-- A renamed business has stale vectors on every one of its translation rows.
-- Cheap: a business has at most five.
create or replace function restamp_business_translations()
returns trigger
language plpgsql
as $$
begin
  if new.name is distinct from old.name then
    update business_translations
       set updated_at = updated_at
     where business_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_restamp_translations on businesses;
create trigger businesses_restamp_translations
  after update of name on businesses
  for each row execute function restamp_business_translations();

-- ---------------------------------------------------------------------------
-- Backfill
--
-- A no-op update fires the tsv trigger and rebuilds every vector. The touch
-- trigger has to come off first, and this is not housekeeping:
-- `set_updated_at()` would stamp now() on all 19,260 rows, and
-- lib/queries/sitemap.ts derives each business's lastmod from the newest of
-- its translation rows. Leaving it on would announce to Google that all 3,854
-- business pages changed on the day this migration ran — the precise
-- "unreliable lastmod" that sitemap.ts's own comment says gets lastmod
-- ignored across a whole site.
--
-- Only the touch trigger is disabled, by name. session_replication_role would
-- have taken the tsv trigger down with it and written 19,260 null vectors.
-- ---------------------------------------------------------------------------
alter table business_translations disable trigger business_translations_set_updated_at;

update business_translations set updated_at = updated_at;

alter table business_translations enable trigger business_translations_set_updated_at;

