import { pool } from './db.mjs';
import { safeImageUrl } from '../lib/images.ts';

/**
 * Assertions for the reference content added on top of the directory:
 * month-by-month seasonality, destination cost bands, operator day rates, and
 * the image guard.
 *
 * The image section is the one that matters most and reads the least
 * impressively. A single http:// URL in any image column throws inside
 * next/image, and a throw in a server component is a 500 for the entire page —
 * not a missing picture, a missing page. Sixteen listings carried one and
 * production answered 200 the whole time, because those pages had been
 * generated before the rows landed. It would have broken on the next deploy and
 * looked exactly like a deploy problem.
 */

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const client = await pool.connect();

try {
  const one = async (sql, params = []) => (await client.query(sql, params)).rows[0];

  console.log('\n--- Seasonality covers everything, in every locale ---');

  const dest = await one(
    `select count(*) n from destinations where is_active and deleted_at is null`,
  );
  const seas = await one(
    `select count(*) n, count(distinct destination_id) d from destination_seasonality`,
  );
  check('every active destination has seasonality',
    Number(seas.d) === Number(dest.n), `${seas.d} of ${dest.n}`);
  check('every destination has all twelve months',
    Number(seas.n) === Number(dest.n) * 12, `${seas.n} rows`);

  const partial = await one(
    `select count(*) n from (
       select destination_id from destination_seasonality
       group by destination_id having count(*) <> 12) x`,
  );
  check('no destination has a partial year', Number(partial.n) === 0, `${partial.n} partial`);

  const { rows: locs } = await client.query(
    `select locale, count(*) n, count(*) filter (where coalesce(highlight,'') <> '') filled
       from destination_seasonality_translations group by locale order by locale`,
  );
  check('all four locales are present', locs.length === 4, locs.map((l) => l.locale).join(', '));
  for (const l of locs) {
    check(`${l.locale}: every month has text`,
      Number(l.filled) === Number(seas.n), `${l.filled} of ${seas.n}`);
  }

  const bad = await one(
    `select count(*) n from destination_seasonality
      where temp_min_c >= temp_max_c
         or rainfall_mm < 0 or rainfall_mm > 2000
         or weather_rating not between 1 and 5
         or crowd_level not between 1 and 5
         or (wildlife_rating is not null and wildlife_rating not between 1 and 5)`,
  );
  check('no impossible month', Number(bad.n) === 0, `${bad.n} bad rows`);

  // A destination where every month is peak season is a data-entry slip, not a
  // destination: "high season" that never ends tells a reader nothing.
  const allPeak = await one(
    `select count(*) n from (
       select destination_id from destination_seasonality
       group by destination_id having bool_and(is_peak_season)) x`,
  );
  check('no destination is peak season all year', Number(allPeak.n) === 0);

  console.log('\n--- Cost bands are coherent ---');

  const costs = await one(`select count(*) n from destination_costs`);
  check('cost bands exist', Number(costs.n) > 0, `${costs.n} destinations`);

  const unordered = await one(
    `select count(*) n from destination_costs
      where budget_low > budget_high or midrange_low > midrange_high
         or luxury_low > luxury_high or park_fee_low > park_fee_high`,
  );
  check('no inverted band', Number(unordered.n) === 0);

  const overlap = await one(
    `select count(*) n from destination_costs
      where budget_high > midrange_high or midrange_high > luxury_high`,
  );
  check('budget ≤ mid-range ≤ luxury at the top of each band',
    Number(overlap.n) === 0, `${overlap.n} out of order`);

  // A fee floor above the budget day rate would mean the cheapest trip cannot
  // pay its own entry, which is either wrong or a genuinely useful thing to
  // know — and either way not something to publish without noticing.
  const impossible = await one(
    `select count(*) n from destination_costs
      where park_fee_low is not null and budget_low is not null
        and park_fee_low > budget_low`,
  );
  check('the fee floor never exceeds the budget day rate',
    Number(impossible.n) === 0, `${impossible.n} impossible`);

  const orphanFee = await one(
    `select count(*) n from destination_costs where park_fee_low is not null and authority is null`,
  );
  check('every quoted fee names its authority', Number(orphanFee.n) === 0);

  const staleYear = await one(
    `select count(*) n from destination_costs where fees_as_of < 2025`,
  );
  check('no cost row is dated before 2025', Number(staleYear.n) === 0);

  console.log('\n--- Operator day rates ---');

  let halfRange = null;
  try {
    await client.query(
      `insert into businesses (name, slug, status, country_code, day_rate_low)
       values ('Rate Probe', 'zzz-rate-probe', 'draft', 'TZ', 200)`,
    );
  } catch (err) {
    halfRange = err;
  }
  check('a one-sided day rate is rejected', Boolean(halfRange),
    halfRange?.constraint ?? 'no error');

  let inverted = null;
  try {
    await client.query(
      `insert into businesses (name, slug, status, country_code, day_rate_low, day_rate_high)
       values ('Rate Probe', 'zzz-rate-probe', 'draft', 'TZ', 900, 200)`,
    );
  } catch (err) {
    inverted = err;
  }
  check('an inverted day rate is rejected', Boolean(inverted), inverted?.constraint ?? 'no error');

  let silly = null;
  try {
    await client.query(
      `insert into businesses (name, slug, status, country_code, day_rate_low, day_rate_high)
       values ('Rate Probe', 'zzz-rate-probe', 'draft', 'TZ', 5, 9)`,
    );
  } catch (err) {
    silly = err;
  }
  check('a $5-a-day safari is rejected as a typo', Boolean(silly), silly?.constraint ?? 'no error');

  console.log('\n--- No image can 500 a page ---');

  for (const [table, column] of [
    ['businesses', 'logo_url'],
    ['businesses', 'cover_image_url'],
    ['categories', 'cover_image_url'],
    ['destinations', 'cover_image_url'],
    ['guides', 'cover_image_url'],
    ['packages', 'cover_image_url'],
    ['media', 'public_url'],
  ]) {
    const r = await one(`select count(*) n from ${table} where ${column} like 'http://%'`);
    check(`${table}.${column} holds no insecure URL`, Number(r.n) === 0, `${r.n} rows`);
  }

  check('the guard drops http', safeImageUrl('http://example.com/a.jpg') === null);
  check('the guard keeps https', safeImageUrl('https://example.com/a.jpg') !== null);
  check('the guard keeps our own relative paths', safeImageUrl('/img/a.png') === '/img/a.png');
  check('the guard drops a data URI', safeImageUrl('data:image/png;base64,AAA') === null);
  check('the guard drops nonsense rather than throwing',
    safeImageUrl('not a url') === null);
  check('the guard drops a bare hostname with no dot',
    safeImageUrl('https://localhost/a.png') === null);
  check('the guard passes null through', safeImageUrl(null) === null);
  check('the guard trims before deciding',
    safeImageUrl('  https://example.com/a.jpg  ') === 'https://example.com/a.jpg');
} catch (err) {
  failed += 1;
  console.error('\n  suite error:', err.message);
} finally {
  await client.query(`delete from businesses where slug = 'zzz-rate-probe'`);
  client.release();
  await pool.end();
}

console.log('\n==================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('==================================================\n');
process.exitCode = failed > 0 ? 1 : 0;
