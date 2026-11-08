-- ===========================================================================
-- 081 — Chinese, Arabic, Russian and Hindi
--
-- Four locales for inbound source markets, added alongside the interface
-- catalogues in messages/{zh,ar,ru,hi}.json.
--
-- This migration does one thing: it registers the codes. Every
-- *_translations.locale column carries a foreign key to locales(code), so
-- without these rows the database would refuse a translated row for any of the
-- four — including the shells an import script writes.
--
-- What it deliberately does NOT do is create those shells.
-- `contentLocale()` in i18n/routing.ts maps all four to English, exactly as it
-- already does for Swahili: the site has 2,756 approved listings written in
-- English and nobody to translate them, so a Chinese reader gets a Chinese
-- interface over English descriptions. Writing 2,756 × 4 empty rows would not
-- change a single page — the queries never ask for locale = 'zh' — and the
-- directory would start reporting eleven thousand translations that do not
-- exist. When a locale genuinely gets content, take it out of
-- CONTENT_FALLBACK and sweep shells for it then, the way 078 did.
--
-- pg_catalog is the Postgres text-search configuration for the language, used
-- by the search vectors. Three of the four have a real stemmer in this
-- cluster (checked against pg_ts_config): arabic, russian and hindi all
-- exist. Chinese does not and cannot — stemming is meaningless without word
-- segmentation, which core Postgres does not do for Hanzi — so zh takes
-- 'simple', the same honest choice 'sw' already makes.
-- ===========================================================================

insert into locales (code, name, native_name, pg_catalog, is_active, sort_order)
values
  ('zh', 'Chinese', '中文',       'simple',  true, 6),
  ('ar', 'Arabic',  'العربية',    'arabic',  true, 7),
  ('ru', 'Russian', 'Русский',    'russian', true, 8),
  ('hi', 'Hindi',   'हिन्दी',      'hindi',   true, 9)
on conflict (code) do update
   set name        = excluded.name,
       native_name = excluded.native_name,
       pg_catalog  = excluded.pg_catalog,
       is_active   = excluded.is_active,
       sort_order  = excluded.sort_order;
