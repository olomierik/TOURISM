import { pool } from './db.mjs';
import { COSTS, FEES_AS_OF } from '../supabase/seed/destination-costs.mjs';

/**
 * Publishes indicative day-rate bands and park fees.
 *
 * Idempotent on destination_id. Destinations absent from COSTS get no row on
 * purpose — a capital city has hotel rates, not safari rates, and a band that
 * implied otherwise would mislead in the direction of the sale.
 */
const client = await pool.connect();
let wrote = 0;
const unknown = [];

try {
  await client.query('begin');
  const { rows: dests } = await client.query(
    `select id, key from destinations where is_active and deleted_at is null`,
  );
  const byKey = new Map(dests.map((d) => [d.key, d.id]));

  for (const [key, c] of Object.entries(COSTS)) {
    const id = byKey.get(key);
    if (!id) { unknown.push(key); continue; }

    await client.query(
      `insert into destination_costs
         (destination_id, budget_low, budget_high, midrange_low, midrange_high,
          luxury_low, luxury_high, park_fee_low, park_fee_high,
          notable_fee_key, notable_fee_amount, authority, fees_as_of)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (destination_id) do update set
         budget_low=excluded.budget_low, budget_high=excluded.budget_high,
         midrange_low=excluded.midrange_low, midrange_high=excluded.midrange_high,
         luxury_low=excluded.luxury_low, luxury_high=excluded.luxury_high,
         park_fee_low=excluded.park_fee_low, park_fee_high=excluded.park_fee_high,
         notable_fee_key=excluded.notable_fee_key,
         notable_fee_amount=excluded.notable_fee_amount,
         authority=excluded.authority, fees_as_of=excluded.fees_as_of`,
      [
        id,
        c.budget?.[0] ?? null, c.budget?.[1] ?? null,
        c.midrange?.[0] ?? null, c.midrange?.[1] ?? null,
        c.luxury?.[0] ?? null, c.luxury?.[1] ?? null,
        c.fees?.[0] ?? null, c.fees?.[1] ?? null,
        c.notable?.key ?? null, c.notable?.amount ?? null,
        c.authority ?? null, FEES_AS_OF,
      ],
    );
    wrote += 1;
  }

  await client.query('commit');
  console.log(`\n  ${wrote} destinations priced (${dests.length - wrote} left without a band on purpose).`);
  if (unknown.length) {
    console.log(`  KEYS NOT IN THE DATABASE: ${unknown.join(', ')}`);
    process.exitCode = 1;
  }
} catch (err) {
  await client.query('rollback');
  console.error('  Failed, nothing written:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
