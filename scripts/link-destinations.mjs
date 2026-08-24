import { pool } from './db.mjs';

/**
 * Attaches a business or a package to the destinations it serves.
 *
 *   node scripts/link-destinations.mjs business <slug> <dest-key>...
 *   node scripts/link-destinations.mjs package  <slug> <dest-key>...
 *
 * This mapping is not cosmetic. Category x destination pages — the commercial
 * surface the whole SEO architecture is built around — are generated from pairs
 * that have an approved business attached, so a directory whose listings have no
 * destinations produces exactly zero of them however much content sits behind
 * it. It also decides lead routing: match_lead_to_businesses scores on whether
 * the business serves the enquiry's destination.
 *
 * Replace, not merge. The admin CRUD settled on the same semantics for the same
 * reason: a merge makes removing a destination impossible through the only
 * interface anyone uses, and a listing that silently keeps claiming a park it
 * dropped keeps receiving leads for it.
 *
 * Built for the supply push. Attaching destinations one listing at a time
 * through the admin form does not survive contact with 150 of them.
 */

const [kind, slug, ...keys] = process.argv.slice(2);

const USAGE = 'usage: node scripts/link-destinations.mjs <business|package> <slug> <dest-key>...';

if (!['business', 'package'].includes(kind) || !slug || keys.length === 0) {
  console.error(USAGE);
  process.exit(1);
}

const table = kind === 'business' ? 'businesses' : 'packages';
const linkTable = kind === 'business' ? 'business_destinations' : 'package_destinations';
const fk = kind === 'business' ? 'business_id' : 'package_id';

const client = await pool.connect();

try {
  await client.query('begin');

  const { rows: owner } = await client.query(
    `select id from ${table} where slug = $1 and deleted_at is null`,
    [slug],
  );
  if (!owner.length) throw new Error(`No ${kind} with slug "${slug}"`);
  const ownerId = owner[0].id;

  const { rows: dests } = await client.query(
    'select id, key from destinations where key = any($1::text[]) and deleted_at is null',
    [keys],
  );

  // Fail on an unknown key rather than silently linking the subset that matched.
  // A typo would otherwise leave a listing quietly serving fewer destinations
  // than intended, and nothing downstream would ever report it.
  const found = new Set(dests.map((d) => d.key));
  const missing = keys.filter((k) => !found.has(k));
  if (missing.length) throw new Error(`Unknown destination key(s): ${missing.join(', ')}`);

  const { rows: before } = await client.query(
    `select d.key from ${linkTable} l join destinations d on d.id = l.destination_id
     where l.${fk} = $1 order by d.key`,
    [ownerId],
  );

  await client.query(`delete from ${linkTable} where ${fk} = $1`, [ownerId]);

  // Argument order is meaningful: the first key is the primary destination for a
  // business, and the itinerary order for a package.
  let position = 0;
  for (const key of keys) {
    const id = dests.find((d) => d.key === key).id;
    if (kind === 'business') {
      await client.query(
        'insert into business_destinations (business_id, destination_id, is_primary) values ($1,$2,$3)',
        [ownerId, id, position === 0],
      );
    } else {
      await client.query(
        'insert into package_destinations (package_id, destination_id, sort_order) values ($1,$2,$3)',
        [ownerId, id, position],
      );
    }
    position++;
  }

  await client.query('commit');

  console.log(`  ${kind} ${slug}`);
  console.log(`    was: ${before.map((r) => r.key).join(', ') || '(none)'}`);
  console.log(`    now: ${keys.join(', ')}`);
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
