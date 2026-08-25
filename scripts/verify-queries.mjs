import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createDirectoryFixtures, dropDirectoryFixtures } from './fixtures.mjs';

/**
 * Smoke-tests the PostgREST shapes used by lib/queries.
 *
 * These joins are easy to get subtly wrong — an `!inner` in the wrong place
 * silently empties a listing rather than erroring — so each one is exercised
 * against real seeded data and asserted on row counts, not just on "no error".
 */

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

const TS_CONFIG = { en: 'english', de: 'german', fr: 'french', it: 'italian' };

// Mirrors lib/queries/search-term.ts — the stored vectors are unaccented, so the
// query must be folded the same way before it reaches websearch_to_tsquery.
const fold = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  console.log('\n--- Taxonomy ---');
  for (const locale of ['en', 'de', 'fr', 'it']) {
    const { data, error } = await db
      .from('destinations')
      .select('id, key, destination_translations!inner (locale, name, slug, summary)')
      .eq('destination_translations.locale', locale)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order');
    // A floor rather than the seed's exact count. Admins create destinations
    // now — Kenya arriving broke this, which makes it the fifth assertion in
    // these suites to fail because the site is being used rather than because
    // anything regressed. The invariant that matters is that every advertised
    // locale resolves its destinations, not how many there are.
    check(`${locale}: destinations resolve with translations`,
      !error && (data?.length ?? 0) >= 8, error?.message ?? `got ${data?.length}`);
  }

  const { data: deSlug } = await db
    .from('destinations')
    .select('key, destination_translations!inner (slug)')
    .eq('destination_translations.locale', 'de')
    .eq('destination_translations.slug', 'sansibar')
    .maybeSingle();
  check('de: lookup by localized slug "sansibar" resolves Zanzibar',
    deSlug?.key === 'zanzibar', `got ${deSlug?.key}`);

  const { data: cats, error: catErr } = await db
    .from('categories')
    .select('id, key, category_translations!inner (locale, name, slug, combo_heading)')
    .eq('category_translations.locale', 'it')
    .eq('is_active', true);
  check('it: 6 categories with translations', !catErr && cats?.length === 6,
    catErr?.message ?? `got ${cats?.length}`);

  console.log('\n--- Directory ---');
  const CARD = `
    id, slug, name, logo_url, cover_image_url, city, is_verified, is_demo,
    tier, rating_avg, rating_count, response_rate, avg_response_minutes, whatsapp,
    business_translations!inner (locale, tagline, short_description)`;

  const { data: all, error: allErr, count } = await db
    .from('businesses')
    .select(CARD, { count: 'exact' })
    .eq('business_translations.locale', 'en')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('tier', { ascending: false })
    .range(0, 11);
  // Asserts the page size and that the count is at least the seed's, not an
  // exact total. Every real listing added to the directory pushed this over its
  // hardcoded number — the third assertion in this suite to fail because the
  // site started being used, which is not what a test should report.
  // Page size is capped at 12 and never exceeds the total. Asserting a *full*
  // page assumed a seeded directory; what the pagination actually has to get
  // right is that it never returns more than a page and never more than exists.
  check('unfiltered directory paginates correctly',
    !allErr && (all?.length ?? 0) === Math.min(12, count ?? 0) && (count ?? 0) > 0,
    allErr?.message ?? `page of ${all?.length} out of ${count}`);
  check('tier descending puts a paying business first',
    all?.[0]?.tier !== 'free', `first was ${all?.[0]?.tier}`);

  // Category filter
  const { data: safariCat } = await db.from('categories').select('id').eq('key', 'safaris').single();
  const { data: byCat, error: catFilterErr } = await db
    .from('businesses')
    .select(`${CARD}, business_categories!inner (category_id)`)
    .eq('business_translations.locale', 'en')
    .eq('business_categories.category_id', safariCat.id)
    .eq('status', 'approved')
    .is('deleted_at', null);
  // "Narrows" means fewer than the unfiltered total, which is what the previous
  // version claimed to assert and did not: it compared against a hardcoded 17,
  // taken from the directory size at the time it was written. Seeding four
  // hundred operators from the licensing registers broke it, and the failure
  // said nothing about the category filter — only that the site had grown.
  //
  // Compared against the live total instead, so it stays true at any size.
  check('category filter narrows to safari operators',
    !catFilterErr && (byCat?.length ?? 0) > 0 && (byCat?.length ?? 0) < (count ?? 0),
    catFilterErr?.message ?? `got ${byCat?.length} of ${count}`);

  // Destination filter
  const { data: serengeti } = await db.from('destinations').select('id').eq('key', 'serengeti').single();
  const { data: byDest, error: destErr } = await db
    .from('businesses')
    .select(`${CARD}, business_destinations!inner (destination_id)`)
    .eq('business_translations.locale', 'en')
    .eq('business_destinations.destination_id', serengeti.id)
    .eq('status', 'approved')
    .is('deleted_at', null);
  check('destination filter narrows to Serengeti operators',
    !destErr && byDest?.length > 0, destErr?.message ?? `got ${byDest?.length}`);

  // Combined category x destination — the commercial combo page query
  const { data: combo, error: comboErr } = await db
    .from('businesses')
    .select(`${CARD}, business_categories!inner (category_id), business_destinations!inner (destination_id)`)
    .eq('business_translations.locale', 'en')
    .eq('business_categories.category_id', safariCat.id)
    .eq('business_destinations.destination_id', serengeti.id)
    .eq('status', 'approved')
    .is('deleted_at', null);
  check('category x destination combo returns only matching businesses',
    !comboErr && combo?.length > 0 && combo.length <= byDest.length,
    comboErr?.message ?? `got ${combo?.length}`);

  // Verified filter
  const { data: verified, error: vErr } = await db
    .from('businesses')
    .select(CARD)
    .eq('business_translations.locale', 'en')
    .eq('status', 'approved')
    .eq('is_verified', true)
    .is('deleted_at', null);
  check('verified filter returns only verified businesses',
    !vErr && verified?.length > 0 && verified.length < 16,
    vErr?.message ?? `got ${verified?.length}`);

  // Price filter joins through packages
  const { data: cheap, error: priceErr } = await db
    .from('businesses')
    .select(`${CARD}, packages!inner (price_from, status)`)
    .eq('business_translations.locale', 'en')
    .eq('status', 'approved')
    .eq('packages.status', 'published')
    .lte('packages.price_from', 500)
    .is('deleted_at', null);
  check('price filter joins through packages without erroring',
    !priceErr && Array.isArray(cheap), priceErr?.message ?? '');

  console.log('\n--- Full-text search, per locale ---');
  for (const [locale, term, label] of [
    ['en', 'safari', 'safari'],
    ['de', 'Safari', 'Safari'],
    ['fr', 'plongee', 'plongee (query unaccented)'],
    ['fr', 'plongée', 'plongee (query accented)'],
    ['it', 'safari', 'safari'],
  ]) {
    const { data, error } = await db
      .from('businesses')
      .select(CARD)
      .eq('business_translations.locale', locale)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .textSearch('business_translations.search_vector', fold(term), {
        type: 'websearch',
        config: TS_CONFIG[locale],
      });
    check(`${locale}: search "${label}" returns results`,
      !error && data?.length > 0, error?.message ?? `got ${data?.length}`);
  }

  console.log('\n--- Packages ---');
  const PKG = `
    id, slug, duration_days, duration_nights, price_from, currency, price_unit,
    cover_image_url, is_featured, is_demo,
    package_translations!inner (locale, title, summary),
    businesses!inner (slug, name, is_verified, status, deleted_at)`;

  const { data: pkgs, error: pkgErr } = await db
    .from('packages')
    .select(`${PKG}, package_destinations!inner (destination_id)`)
    .eq('package_translations.locale', 'de')
    .eq('package_destinations.destination_id', serengeti.id)
    .eq('status', 'published')
    .eq('businesses.status', 'approved')
    .is('deleted_at', null)
    .order('price_from', { ascending: true, nullsFirst: false });
  check('de: packages for Serengeti resolve with business join',
    !pkgErr && pkgs?.length > 0, pkgErr?.message ?? `got ${pkgs?.length}`);
  check('packages come back cheapest first',
    !pkgs || pkgs.length < 2 || Number(pkgs[0].price_from) <= Number(pkgs[1].price_from));

  const { data: detail, error: detErr } = await db
    .from('packages')
    .select(
      `id, slug, package_translations!inner (locale, title, description),
       businesses!inner (slug, name, status, deleted_at),
       package_inclusions (id, is_included, sort_order,
         package_inclusion_translations (locale, label))`,
    )
    .eq('package_translations.locale', 'fr')
    // A fixture slug, not a seeded one. The demo package this named has been
    // deleted, and .maybeSingle() on a missing row returns null rather than an
    // error — so the assertion failed on absent data while looking like a broken
    // join.
    .eq('slug', 'fixture-package-1')
    .eq('status', 'published')
    .eq('businesses.status', 'approved')
    .maybeSingle();
  check('fr: package detail with inclusions resolves',
    !detErr && detail?.package_inclusions?.length > 0,
    detErr?.message ?? `${detail?.package_inclusions?.length} inclusions`);

  const frLabels = detail?.package_inclusions
    ?.flatMap((i) => i.package_inclusion_translations)
    .filter((t) => t.locale === 'fr');
  check('fr: inclusion labels are translated', (frLabels?.length ?? 0) > 0,
    `${frLabels?.length ?? 0} french labels`);

  console.log('\n--- Guides ---');
  // Asserted as locale parity rather than an exact count. The previous version
  // hardcoded the number of guides in the seed, so publishing or retiring one
  // broke four assertions that had nothing to say about whether anything was
  // actually wrong. What matters is that a locale advertised in the switcher and
  // in hreflang carries the same guides as English — a locale silently falling
  // behind is the real defect, and an exact count buries it in noise.
  const perLocale = {};
  for (const locale of ['en', 'de', 'fr', 'it']) {
    const { data, error } = await db
      .from('guides')
      .select('id, guide_translations!inner (locale, title, slug, excerpt)')
      .eq('guide_translations.locale', locale)
      .eq('status', 'published')
      .is('deleted_at', null);
    perLocale[locale] = error ? null : (data?.length ?? 0);
  }

  check('en: publishes at least one guide', (perLocale.en ?? 0) > 0, `got ${perLocale.en}`);

  // Parity used to be the assertion here: every locale had to publish exactly
  // what English published, because a missing translation was always a mistake.
  //
  // It is not any more. The German-market guides — visa rules for a German
  // passport, Rückholversicherung, school-holiday timing — are deliberately
  // German-only, because an English version of them would have no readership.
  // German is now deeper than English on purpose, and the invariant worth
  // holding is that no locale has *less* than English, which is still a fault.
  for (const locale of ['de', 'fr', 'it']) {
    check(`${locale}: publishes at least as many guides as en`,
      (perLocale[locale] ?? 0) >= (perLocale.en ?? 0),
      `${locale}=${perLocale[locale]} vs en=${perLocale.en}`);
  }

  const { data: guide, error: gErr } = await db
    .from('guides')
    .select('id, allow_ads, guide_translations!inner (locale, title, body, slug)')
    .eq('guide_translations.locale', 'de')
    .eq('guide_translations.slug', 'tansania-safari-kosten')
    .eq('status', 'published')
    .maybeSingle();
  check('de: guide lookup by localized slug resolves with body',
    !gErr && (guide?.guide_translations?.[0]?.body?.length ?? 0) > 200,
    gErr?.message ?? '');
}

try {
  // The directory assertions need operators to rank, match and search.
  // Built here rather than assumed, so the suite does not depend on the demo
  // seed or on whatever the live site currently contains.
  await createDirectoryFixtures();
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  await dropDirectoryFixtures();
  console.log(`\n${'='.repeat(46)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(46) + '\n');
  if (fail > 0) process.exitCode = 1;
}
