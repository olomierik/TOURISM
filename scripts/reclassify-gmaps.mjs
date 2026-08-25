import { readFileSync, readdirSync } from 'node:fs';

import { pool } from './db.mjs';

/**
 * Recomputes the category of every Maps-imported listing.
 *
 *   node scripts/reclassify-gmaps.mjs [--dry]
 *
 * The importer inserts category links with `on conflict do nothing`, which is
 * right for a re-run that must not disturb an operator's own edits — and wrong
 * when the classifier itself was the thing that was broken. This exists to
 * correct that one case without re-running the whole import.
 *
 * Only touches unclaimed listings, and only ones whose slug matches a place in
 * the seed files, so an operator's own categorisation is never overwritten.
 */

const DRY = process.argv.includes('--dry');

const CATEGORY_RULES = [
  [/car (rental|hire|leasing)|rent a car|vehicle hire/i, 'car-rental'],
  [/lodge|hotel|resort|camp(site)?|guest ?house|hostel|motel|lodging|accommodation|bed (and|&) breakfast|serviced apartment/i, 'hotels'],
  [/tour(ist)? guide|tourist information/i, 'tour-guides'],
  [/restaurant(?! supply)|cafe\b|café|bar (and|&) grill|coffee shop|bakery|bistro|eatery|fine dining|steakhouse|pizzeria/i, 'restaurants'],
  [/tour operator|safari|travel agency|tour agency|adventure/i, 'safaris'],
  [/attraction|museum|national park|activit|excursion|balloon|diving|rafting/i, 'activities'],
];

function categoryFor(place) {
  for (const [pattern, key] of CATEGORY_RULES) {
    if (place.categoryName && pattern.test(place.categoryName)) return key;
  }
  const secondary = (place.categories ?? []).join(' | ');
  for (const [pattern, key] of CATEGORY_RULES) {
    if (pattern.test(secondary)) return key;
  }
  return 'activities';
}

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');

const bySlug = new Map();
for (const file of readdirSync('supabase/seed').filter(
  (f) => f.startsWith('operators-gmaps-') && f.endsWith('.json'),
)) {
  for (const p of JSON.parse(readFileSync(`supabase/seed/${file}`, 'utf8')).places) {
    const slug = slugify(p.name);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, p);
  }
}

const client = await pool.connect();
let changed = 0;
let unchanged = 0;
const moves = new Map();

try {
  await client.query('begin');

  const { rows: cats } = await client.query('select id, key from categories');
  const catId = new Map(cats.map((c) => [c.key, c.id]));
  const keyById = new Map(cats.map((c) => [c.id, c.key]));

  const { rows: listings } = await client.query(
    `select b.id, b.slug,
            (select bc.category_id from business_categories bc
              where bc.business_id = b.id and bc.is_primary limit 1) as primary_category
       from businesses b
      where b.owner_id is null and b.deleted_at is null`,
  );

  for (const listing of listings) {
    const place = bySlug.get(listing.slug);
    if (!place) continue;

    const wanted = catId.get(categoryFor(place));
    if (!wanted || wanted === listing.primary_category) {
      unchanged++;
      continue;
    }

    const from = keyById.get(listing.primary_category) ?? 'none';
    const to = keyById.get(wanted);
    moves.set(`${from} -> ${to}`, (moves.get(`${from} -> ${to}`) ?? 0) + 1);

    // Drop the old primary link entirely rather than demoting it: it was wrong,
    // not merely secondary, and leaving it would keep the listing on a category
    // page it does not belong to.
    if (listing.primary_category) {
      await client.query(
        'delete from business_categories where business_id = $1 and category_id = $2',
        [listing.id, listing.primary_category],
      );
    }

    await client.query(
      `insert into business_categories (business_id, category_id, is_primary)
       values ($1,$2,true)
       on conflict (business_id, category_id) do update set is_primary = true`,
      [listing.id, wanted],
    );
    changed++;
  }

  if (DRY) {
    await client.query('rollback');
    console.log('\n  DRY RUN — rolled back');
  } else {
    await client.query('commit');
  }

  console.log(`\n  reclassified ${changed}, unchanged ${unchanged}\n`);
  for (const [move, n] of [...moves.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${move}`);
  }
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
