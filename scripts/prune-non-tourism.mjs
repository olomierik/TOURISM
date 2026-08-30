import { pool } from './db.mjs';

/**
 * Takes plainly non-tourism listings off the public site.
 *
 * Found by looking at "Things to do in Serengeti", which was listing auto body
 * shops in Mwanza. Seven listings out of 1,336 — a nursery school, four garages,
 * two auto parts stores — but they held 63 destination attachments between them,
 * because 'activities' and 'car-rental' are in the importer's SELLS_NATIONWIDE
 * set and a nationwide business is attached to every destination in its country.
 *
 * So a rounding error in the classifier reached up to 63 pages, each of them
 * titled "Things to do in <somewhere a traveller wants to go>". A page like that
 * is worse than no page: it tells a reader the directory does not know what it
 * contains.
 *
 * Suspended rather than deleted. The rows came from a real Google Maps record
 * and the misclassification is ours, not theirs; a status change is reversible
 * and a delete is not. Their taxonomy links go, because those are what put them
 * on the pages.
 *
 *   node scripts/prune-non-tourism.mjs            # report only
 *   node scripts/prune-non-tourism.mjs --apply    # suspend and unlink
 */

const apply = process.argv.includes('--apply');

/**
 * Google's own category text, which the importer copied into the description.
 *
 * Matched against that rather than against the business name: "Ndapu Car Hire
 * and General Supplies" reads like a car rental and is an auto body shop, and
 * the name is the thing that fooled the classifier in the first place.
 */
const NOT_TOURISM = [
  'auto repair', 'auto parts', 'auto body', 'car repair', 'mechanic',
  'spare part', 'welding', 'hardware store', 'petrol', 'filling station',
  'supermarket', 'pharmacy', 'nursery school', 'primary school',
  'electronics store', 'furniture', 'stationery', 'butcher',
  'clothing store', 'money transfer', 'law firm',
];

const client = await pool.connect();

try {
  const pattern = NOT_TOURISM.join('|');

  const { rows } = await client.query(
    `select b.id, b.name, b.city, b.country_code,
            left(bt.short_description, 60) as descr,
            (select count(*) from business_destinations d where d.business_id = b.id) as links
       from businesses b
       join business_translations bt
         on bt.business_id = b.id and bt.locale = 'en'
      where b.status = 'approved'
        and b.deleted_at is null
        and bt.short_description ~* $1
      order by links desc`,
    [pattern],
  );

  if (rows.length === 0) {
    console.log('\n  Nothing to prune — no approved listing matches a non-tourism category.\n');
  } else {
    console.log(`\n  ${rows.length} listings, holding ${rows.reduce((n, r) => n + Number(r.links), 0)} destination attachments:\n`);
    for (const r of rows) {
      console.log(`    ${String(r.links).padStart(3)} links  ${r.country_code}  ${r.name.slice(0, 44)}`);
      console.log(`               ${r.descr}`);
    }

    if (!apply) {
      console.log('\n  Report only. Re-run with --apply to suspend these and remove their links.\n');
    } else {
      const ids = rows.map((r) => r.id);
      await client.query('begin');

      // The links are what put them on category x destination pages, so they go
      // first — a suspended listing with stale links is still a row a future
      // query could pick up.
      const { rowCount: unlinkedDest } = await client.query(
        'delete from business_destinations where business_id = any($1)',
        [ids],
      );
      const { rowCount: unlinkedCat } = await client.query(
        'delete from business_categories where business_id = any($1)',
        [ids],
      );
      await client.query(
        `update businesses set status = 'suspended', updated_at = now() where id = any($1)`,
        [ids],
      );

      await client.query('commit');
      console.log(`\n  Suspended ${ids.length}. Removed ${unlinkedDest} destination and ${unlinkedCat} category links.`);
      console.log('  Reversible: set status back to approved and re-run the importer to relink.\n');
    }
  }
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('  Failed, nothing changed:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
