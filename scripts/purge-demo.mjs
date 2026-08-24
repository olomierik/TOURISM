import { pool } from './db.mjs';

/**
 * Removes the demo seed while preserving everything real.
 *
 * Destinations are deliberately NOT deleted. They were created by the seed and
 * carry the is_demo flag, but they are real places with real content in four
 * languages, and every category x destination page — the commercial search
 * surface — is generated from them. The flag is cleared instead, which stops the
 * "Demo" badges without destroying the pages.
 *
 * Runs in one transaction: a partial purge that removed businesses but left
 * their packages orphaned would be worse than not running at all.
 */

const client = await pool.connect();

try {
  const count = async (sql) => (await client.query(sql)).rows[0].n;

  const before = {
    businesses: await count('select count(*)::int n from businesses'),
    packages: await count('select count(*)::int n from packages'),
    guides: await count('select count(*)::int n from guides'),
    destinations: await count('select count(*)::int n from destinations'),
    media: await count('select count(*)::int n from media'),
    leads: await count('select count(*)::int n from leads'),
  };

  await client.query('begin');

  // Businesses cascade into packages, translations, categories, destination
  // links, media, reviews and lead_businesses.
  const biz = await client.query('delete from businesses where is_demo returning name');
  const guides = await client.query('delete from guides where is_demo returning id');

  // Any package or media row still flagged demo but not owned by a demo
  // business — belt and braces, since these carry their own flag.
  const pkgs = await client.query('delete from packages where is_demo returning id');

  // The destinations stay; only the label goes.
  const dest = await client.query(
    'update destinations set is_demo = false where is_demo returning key',
  );

  // Leads left with no business attached are noise, not history.
  const orphanLeads = await client.query(
    `delete from leads l
     where not exists (select 1 from lead_businesses lb where lb.lead_id = l.id)
     returning reference`,
  );

  await client.query('commit');

  console.log('  deleted businesses  :', biz.rowCount);
  console.log('  deleted guides      :', guides.rowCount);
  console.log('  deleted packages    :', pkgs.rowCount);
  console.log('  unflagged dests     :', dest.rowCount, '(' + dest.rows.map((r) => r.key).join(', ') + ')');
  console.log('  removed orphan leads:', orphanLeads.rowCount);

  const after = {
    businesses: await count('select count(*)::int n from businesses'),
    packages: await count('select count(*)::int n from packages'),
    guides: await count('select count(*)::int n from guides'),
    destinations: await count('select count(*)::int n from destinations'),
    media: await count('select count(*)::int n from media'),
    leads: await count('select count(*)::int n from leads'),
  };

  console.log('\n  table          before -> after');
  for (const k of Object.keys(before)) {
    console.log(`  ${k.padEnd(14)} ${String(before[k]).padStart(3)} -> ${after[k]}`);
  }

  const left = await client.query(
    'select count(*)::int n from businesses where is_demo or exists (select 1 from guides g where g.is_demo)',
  );
  console.log('\n  demo rows remaining:', left.rows[0].n);
} catch (err) {
  await client.query('rollback');
  console.error('\n  ROLLED BACK — nothing was deleted:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
