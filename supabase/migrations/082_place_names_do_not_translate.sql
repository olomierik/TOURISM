-- ===========================================================================
-- 082 — Place names do not translate, and the slug should not pretend they do
--
-- Thirty destination slugs end in their own locale code:
--
--   en  arusha            de  arusha-de        fr  arusha-fr        it  arusha-it
--   en  dar-es-salaam                          fr  dar-es-salaam-fr it  dar-es-salaam-it
--   en  mount-kenya       de  mount-kenya-de
--   en  maasai-mara       de  masai-mara       fr  masai-mara-fr    it  masai-mara-it
--
-- These are not translations. Arusha is Arusha in German, French and Italian —
-- `name` is identical in all four rows — and the suffix exists only because
-- the seed wrote one slug per locale and needed them to differ. They did not
-- need to differ: the unique index is on (locale, slug), so the same slug in
-- four languages has always been allowed. Masai Mara proves it from the other
-- direction: German already holds the bare `masai-mara` while French and
-- Italian carry the suffixed form of the same spelling.
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
-- The retired URLs are not abandoned. lib/seo/slug-rescue.ts redirects a slug
-- no locale knows to the one its language uses, and it strips a trailing
-- locale code as its last candidate precisely so these thirty keep the rank
-- they earned instead of becoming thirty more 404s.
--
-- Only the suffixed slugs move. A real translation —
-- `aberdare-nationalpark`, `parc-national-des-aberdare` — is a slug a reader
-- searches for and is left alone.
--
-- The rule is "the slug is some base plus this row's own locale code", not the
-- narrower "plus the English slug". The narrower one was written first and the
-- guard at the foot caught it two rows short: Masai Mara's French and Italian
-- slugs are built on `masai-mara`, not on the English `maasai-mara`, so they
-- would have survived the update and then failed the assertion — aborting the
-- migration in production rather than here. That is the guard working.
-- ===========================================================================

begin;

-- Nothing may collide inside a locale. Checked rather than trusted, because a
-- collision would surface as a unique-violation that says nothing about why
-- these rows exist. Two ways to collide: onto a slug already held by another
-- row in that locale, or two suffixed rows stripping to the same slug.
do $$
declare
  n integer;
begin
  with fixed as (
    select id, locale, regexp_replace(slug, '-' || locale || '$', '') want
      from destination_translations
     where slug ~ ('-' || locale || '$')
  ),
  counted as (
    select f.*, count(*) over (partition by f.locale, f.want) same_target from fixed f
  )
  select count(*) into n from counted c
   where c.same_target > 1
      or exists (
        select 1 from destination_translations o
         where o.locale = c.locale and o.slug = c.want and o.id <> c.id
      );
  if n > 0 then
    raise exception '082: % slug(s) would collide inside their locale', n;
  end if;
end $$;

update destination_translations
   set slug = regexp_replace(slug, '-' || locale || '$', ''),
       updated_at = now()
 where slug ~ ('-' || locale || '$');

-- And prove it: no slug in any locale may end in one of our own locale codes.
-- A destination genuinely named something ending in those two letters would
-- trip this, and that is the right moment to think about it rather than to let
-- the pattern back in quietly.
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
