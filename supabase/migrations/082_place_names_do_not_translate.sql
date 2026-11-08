-- ===========================================================================
-- 082 — Place names do not translate, and the slug should not pretend they do
--
-- Twenty-eight destination slugs carry the locale code as a suffix:
--
--   en  arusha            de  arusha-de        fr  arusha-fr        it  arusha-it
--   en  dar-es-salaam                          fr  dar-es-salaam-fr it  dar-es-salaam-it
--   en  mount-kenya       de  mount-kenya-de
--
-- These are not translations. Arusha is Arusha in German, French and Italian —
-- `name` is identical in all four rows — and the suffix exists only because
-- the seed wrote one slug per locale and needed them to differ. They did not
-- need to differ: the unique index is on (locale, slug), so the same slug in
-- four languages has always been allowed.
--
-- The cost is measured, not theoretical. Search Console on 8 November 2026:
--
--   dar es salaam              279 impressions, 0 clicks
--   mount kenya accommodation  191 impressions, 0 clicks
--   mount kenya hotels         182 impressions, 0 clicks
--   mafia island tour operators  1 impression,  1 click
--
-- Four of the site's highest-impression queries name destinations whose
-- non-English URLs are /de/reiseziele/mount-kenya-de and
-- /fr/destinations/dar-es-salaam-fr. Nobody searches for "mount-kenya-de", and
-- /fr/destinations/arusha — the URL a reader would actually type or link —
-- answered 404 and appears in Google's "Not found" report as one of the 94
-- broken localised URLs.
--
-- Afterwards every one of these is the same slug in all four languages, which
-- is the honest answer for a proper noun. The hreflang cluster still names four
-- URLs; three of them simply agree, exactly as they already do for the shared
-- business slugs.
--
-- The retired URLs are not abandoned. lib/seo/slug-rescue.ts 301s a slug no
-- locale knows to the one its language uses, and it strips a trailing locale
-- code precisely so these twenty-eight keep their accumulated rank instead of
-- becoming twenty-eight more 404s.
--
-- Only the placeholders move. A real translation — aberdare-nationalpark,
-- parc-national-des-aberdare — is a slug a reader searches for and is left
-- alone. The WHERE clause expresses that: the slug must be exactly the English
-- slug plus the locale code, which no translated slug can be.
-- ===========================================================================

begin;

-- Guard: the rename must not collide inside a locale. Checked here rather than
-- trusted, because a collision would abort the statement with a constraint
-- error that says nothing about why these rows exist.
do $$
declare
  n integer;
begin
  select count(*) into n
    from destination_translations t
    join destination_translations en
      on en.destination_id = t.destination_id and en.locale = 'en'
   where t.locale <> 'en'
     and t.slug = en.slug || '-' || t.locale
     and exists (
       select 1 from destination_translations o
        where o.locale = t.locale and o.slug = en.slug and o.id <> t.id
     );
  if n > 0 then
    raise exception '082: % placeholder slug(s) would collide with a real slug in the same locale', n;
  end if;
end $$;

update destination_translations t
   set slug = en.slug,
       updated_at = now()
  from destination_translations en
 where en.destination_id = t.destination_id
   and en.locale = 'en'
   and t.locale <> 'en'
   and t.slug = en.slug || '-' || t.locale;

-- And prove it: no slug in any locale may end in one of our own locale codes.
-- A destination genuinely called something ending in "-de" would trip this, and
-- that is the right time to think about it rather than to let the pattern back.
do $$
declare
  n integer;
begin
  select count(*) into n
    from destination_translations
   where slug ~ '-(en|de|fr|it|sw|zh|ar|ru|hi)$';
  if n > 0 then
    raise exception '082: % destination slug(s) still end in a locale code', n;
  end if;
end $$;

commit;
