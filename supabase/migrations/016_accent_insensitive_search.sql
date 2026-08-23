-- ===========================================================================
-- 016 — Make full-text search accent-insensitive on both sides
--
-- `build_search_query` already unaccents the query, but the stored vectors kept
-- their diacritics, so the two sides never normalised to the same token:
-- searching "plongee" could not match text containing "plongée".
--
-- Accents matter here more than in most projects. Three of the four locales use
-- them heavily, and travelers routinely type without them — either from an
-- English keyboard or simply out of habit.
--
-- Both sides are now folded. The application normalises the query in JS before
-- calling PostgREST's textSearch (which invokes websearch_to_tsquery directly
-- and would otherwise bypass build_search_query entirely).
-- ===========================================================================

create or replace function update_search_vector()
returns trigger
language plpgsql
as $$
declare
  cfg      regconfig;
  rec      jsonb := to_jsonb(new);
  vec      tsvector := ''::tsvector;
  spec     text;
  parts    text[];
  col      text;
  weight   "char";
begin
  select l.pg_catalog into cfg
  from locales l
  where l.code = rec ->> 'locale';

  if cfg is null then
    cfg := 'simple'::regconfig;
  end if;

  foreach spec in array tg_argv loop
    parts  := string_to_array(spec, ':');
    col    := parts[1];
    weight := coalesce(parts[2], 'D')::"char";

    vec := vec || setweight(
      -- unaccent before stemming so "Sansibar"/"Zanzibar" style queries and
      -- accented source text meet at the same token.
      to_tsvector(cfg, unaccent(coalesce(rec ->> col, ''))),
      weight
    );
  end loop;

  new.search_vector := vec;
  return new;
end;
$$;

-- Rebuild every stored vector under the new rule. Touching `locale` is enough to
-- fire the before-update trigger without changing any data.
update destination_translations set locale = locale;
update category_translations    set locale = locale;
update business_translations    set locale = locale;
update package_translations     set locale = locale;
update guide_translations       set locale = locale;
