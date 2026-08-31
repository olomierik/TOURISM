import { pool } from './db.mjs';
import { HIDDEN_GEMS } from '../supabase/seed/hidden-gems.mjs';

/**
 * Publishes the hidden gems.
 *
 * Idempotent on destination_id, which is unique — a place can only be pitched
 * once, so editing the seed file and re-running edits rather than duplicates.
 *
 * Both destination keys are resolved before anything is written, and an
 * unresolved one is reported rather than skipped quietly. A gem pointing at a
 * destination that does not exist would render as "Instead of" followed by
 * nothing, which is worse than the row being absent.
 */
const client = await pool.connect();
let wrote = 0;
const unknown = [];

try {
  const { rows: dests } = await client.query(
    `select id, key from destinations where is_active and deleted_at is null`,
  );
  const byKey = new Map(dests.map((d) => [d.key, d.id]));

  for (const g of HIDDEN_GEMS) {
    const destinationId = byKey.get(g.destination);
    if (!destinationId) {
      unknown.push(`gem ${g.destination}`);
      continue;
    }

    const insteadOfId = g.insteadOf ? byKey.get(g.insteadOf) : null;
    if (g.insteadOf && !insteadOfId) {
      unknown.push(`${g.destination} -> instead of ${g.insteadOf}`);
      continue;
    }

    await client.query('begin');
    const { rows: saved } = await client.query(
      `insert into hidden_gems (destination_id, instead_of_id, sort_order)
       values ($1,$2,$3)
       on conflict (destination_id) do update set
         instead_of_id = excluded.instead_of_id,
         sort_order    = excluded.sort_order,
         is_active     = true
       returning id`,
      [destinationId, insteadOfId, g.sort],
    );

    await client.query(
      `insert into hidden_gem_translations (hidden_gem_id, locale, pitch, trade_off)
       values ($1,'en',$2,$3)
       on conflict (hidden_gem_id, locale) do update set
         pitch = excluded.pitch, trade_off = excluded.trade_off`,
      [saved[0].id, g.pitch, g.tradeOff],
    );
    await client.query('commit');

    wrote += 1;
    process.stdout.write(
      `  ${g.destination.padEnd(38)} ${g.insteadOf ? `instead of ${g.insteadOf}` : '(stands alone)'}\n`,
    );
  }

  const { rows: linked } = await client.query(
    `select count(distinct instead_of_id) n from hidden_gems
      where is_active and instead_of_id is not null`,
  );
  console.log(`\n  ${wrote} gems, offered against ${linked[0].n} well-known destinations.`);

  if (unknown.length) {
    console.log('\n  DESTINATION NOT FOUND:');
    unknown.forEach((u) => console.log(`    ${u}`));
    process.exitCode = 1;
  }
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('\n  Failed:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
