-- ===========================================================================
-- 011 — Full-text search, per locale
--
-- Each translation row is indexed with the Postgres dictionary for its own
-- language, so German compounds stem as German and French elisions as French.
-- Searching "Safaris" finds "Safari"; searching "Reiseziele" finds "Reiseziel".
-- A single shared 'simple' configuration would lose all of that.
--
-- The vector cannot be a generated column: the text-search configuration varies
-- per row (driven by `locale`), and generated columns require an immutable
-- expression. A trigger is the correct mechanism here.
-- ===========================================================================

alter table destination_translations add column search_vector tsvector;
alter table category_translations    add column search_vector tsvector;
alter table business_translations    add column search_vector tsvector;
alter table package_translations     add column search_vector tsvector;
alter table guide_translations       add column search_vector tsvector;

-- ---------------------------------------------------------------------------
-- Generic vector builder.
--
-- Trigger arguments are 'column:weight' pairs, e.g. 'title:A', 'body:C'.
-- Reading the row through to_jsonb lets one function serve every table rather
-- than duplicating near-identical code five times.
--
-- Weights follow the usual convention: A = name/title, B = summary,
-- C = body, D = supporting text. ts_rank then scores a title hit far above a
-- passing mention in the body.
-- ---------------------------------------------------------------------------
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

  -- Unknown locale: index without stemming rather than failing the write.
  if cfg is null then
    cfg := 'simple'::regconfig;
  end if;

  foreach spec in array tg_argv loop
    parts  := string_to_array(spec, ':');
    col    := parts[1];
    weight := coalesce(parts[2], 'D')::"char";

    vec := vec || setweight(
      to_tsvector(cfg, coalesce(rec ->> col, '')),
      weight
    );
  end loop;

  new.search_vector := vec;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wire it up
-- ---------------------------------------------------------------------------
create trigger destination_translations_tsv
  before insert or update on destination_translations
  for each row execute function update_search_vector(
    'name:A', 'summary:B', 'description:C', 'travel_tips:D', 'best_time:D'
  );

create trigger category_translations_tsv
  before insert or update on category_translations
  for each row execute function update_search_vector(
    'name:A', 'name_singular:A', 'summary:B', 'description:C'
  );

create trigger business_translations_tsv
  before insert or update on business_translations
  for each row execute function update_search_vector(
    'tagline:A', 'short_description:B', 'description:C'
  );

create trigger package_translations_tsv
  before insert or update on package_translations
  for each row execute function update_search_vector(
    'title:A', 'summary:B', 'description:C', 'itinerary:D'
  );

create trigger guide_translations_tsv
  before insert or update on guide_translations
  for each row execute function update_search_vector(
    'title:A', 'excerpt:B', 'body:C'
  );

-- ---------------------------------------------------------------------------
-- Indexes
--
-- GIN for the vectors; trigram for typo tolerance on the names people actually
-- mistype ("Serengetti", "Ngorogoro", "Kilimandscharo").
-- ---------------------------------------------------------------------------
create index destination_tr_search_idx on destination_translations using gin (search_vector);
create index category_tr_search_idx    on category_translations    using gin (search_vector);
create index business_tr_search_idx    on business_translations    using gin (search_vector);
create index package_tr_search_idx     on package_translations     using gin (search_vector);
create index guide_tr_search_idx       on guide_translations       using gin (search_vector);

create index destination_tr_name_trgm_idx on destination_translations using gin (name gin_trgm_ops);
create index package_tr_title_trgm_idx    on package_translations     using gin (title gin_trgm_ops);
create index guide_tr_title_trgm_idx      on guide_translations       using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Backfill anything already inserted.
-- ---------------------------------------------------------------------------
update destination_translations set locale = locale;
update category_translations    set locale = locale;
update business_translations    set locale = locale;
update package_translations     set locale = locale;
update guide_translations       set locale = locale;

-- ---------------------------------------------------------------------------
-- Search helper
--
-- Turns raw user input into a tsquery without throwing on the punctuation people
-- actually type. websearch_to_tsquery handles quotes and OR the way a search box
-- is expected to behave, and unaccent means "Sansibar" matches "Zanzibar" text
-- entered with diacritics.
-- ---------------------------------------------------------------------------
create or replace function build_search_query(input text, loc text default 'en')
returns tsquery
language plpgsql
stable
as $$
declare
  cfg regconfig;
  cleaned text := trim(coalesce(input, ''));
begin
  if cleaned = '' then
    return null;
  end if;

  select l.pg_catalog into cfg from locales l where l.code = loc;
  if cfg is null then
    cfg := 'simple'::regconfig;
  end if;

  return websearch_to_tsquery(cfg, unaccent(cleaned));
exception
  when others then
    -- Never let a malformed query 500 the search page.
    return null;
end;
$$;
