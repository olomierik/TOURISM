-- ===========================================================================
-- 060 — Kiswahili
--
-- The build brief asks for "English and Swahili initially". 001 made locales a
-- table rather than an enum for exactly this moment: adding a language is a row.
--
-- Without the row a Swahili visitor cannot sign up or send an enquiry:
-- profiles.locale, leads and every *_translations table reference locales(code),
-- so the first insert carrying 'sw' fails its foreign key.
--
-- pg_catalog is 'simple'. Postgres ships no Swahili stemmer, and 'simple' (lower
-- case, no stemming, no stop words) is the honest choice for a language it does
-- not know; the search trigger in 016 falls back to it anyway.
--
-- No content rows are added. Swahili pages read English content until a listing,
-- guide or destination has its own Swahili translation (i18n/routing.ts
-- contentLocale); copying 2,618 English descriptions in as "Swahili" would be a
-- duplicate presented as a translation.
-- ===========================================================================

insert into locales (code, name, native_name, pg_catalog, sort_order)
values ('sw', 'Swahili', 'Kiswahili', 'simple', 5)
on conflict (code) do nothing;
