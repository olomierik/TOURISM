import { pool } from './db.mjs';
import { PROFILES, DEFAULT_TEXT, defaultKeyFor } from '../supabase/seed/seasonality-profiles.mjs';
import { DESTINATIONS } from '../supabase/seed/seasonality-destinations.mjs';

/**
 * Publishes month-by-month conditions for every destination.
 *
 * The table held 24 rows covering 2 of 46 destinations. The renderer returns
 * null when a destination has none, so the other 44 pages were quietly missing
 * their most useful section — no error, no hole in the layout, just absence.
 * That is the failure mode this codebase keeps producing: something that looks
 * fine because the missing thing declines to announce itself.
 *
 * Idempotent on (destination_id, month). Re-running after editing the seed data
 * is the editing workflow, the same as the guide seeders — which is exactly why
 * it writes in batches rather than row by row. The first version issued one
 * round trip per month plus four per translation: 2,760 sequential queries over
 * a remote connection, twelve minutes, for a script whose whole purpose is to be
 * re-run after every edit. Two multi-row statements per destination instead.
 *
 * One transaction per destination rather than one for the whole run. Wrapping
 * all 46 in a single transaction held it open long enough to hit the server's
 * statement timeout, and it made the run all-or-nothing: a timeout on the
 * forty-fifth destination threw away the previous forty-four. Per-destination
 * commits mean a failure costs one destination, and because the writes are
 * upserts, re-running finishes the job rather than duplicating it.
 */

const LOCALES = ['en', 'de', 'fr', 'it'];
const client = await pool.connect();

let rows = 0;
let translations = 0;
let done = 0;
const missing = [];

try {
  const { rows: destinations } = await client.query(
    `select id, key, country_code from destinations
      where is_active and deleted_at is null order by key`,
  );

  // A destination in the database with no entry in the seed data is the case
  // that would silently reproduce the bug this script exists to fix, so it is
  // reported rather than skipped quietly.
  for (const d of destinations) {
    if (!DESTINATIONS[d.key]) missing.push(`${d.country_code} ${d.key}`);
  }

  for (const dest of destinations) {
    const spec = DESTINATIONS[dest.key];
    if (!spec) continue;

    const profile = PROFILES[spec.profile];
    if (!profile) throw new Error(`${dest.key}: unknown profile "${spec.profile}"`);

    const [baseLo, baseHi] = spec.temp;
    const peak = new Set(spec.peak);

    await client.query('begin');

    // One statement for the whole year: ($1..$10), ($11..$20), and so on.
    const monthValues = [];
    const monthParams = [];
    for (let m = 1; m <= 12; m += 1) {
      const i = m - 1;
      const n = monthParams.length;
      monthValues.push(
        `($${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5},` +
          `$${n + 6},$${n + 7},$${n + 8},$${n + 9},$${n + 10})`,
      );
      monthParams.push(
        dest.id,
        m,
        spec.wildlife ? spec.wildlife[i] : null,
        profile.weather[i],
        spec.crowd[i],
        profile.rain[i],
        baseLo + profile.loDelta[i],
        baseHi + profile.hiDelta[i],
        peak.has(m),
        spec.highlights[m]?.key ?? null,
      );
    }

    const { rows: saved } = await client.query(
      `insert into destination_seasonality
         (destination_id, month, wildlife_rating, weather_rating, crowd_level,
          rainfall_mm, temp_min_c, temp_max_c, is_peak_season, highlight_key)
       values ${monthValues.join(', ')}
       on conflict (destination_id, month) do update set
         wildlife_rating = excluded.wildlife_rating,
         weather_rating  = excluded.weather_rating,
         crowd_level     = excluded.crowd_level,
         rainfall_mm     = excluded.rainfall_mm,
         temp_min_c      = excluded.temp_min_c,
         temp_max_c      = excluded.temp_max_c,
         is_peak_season  = excluded.is_peak_season,
         highlight_key   = excluded.highlight_key
       returning id, month`,
      monthParams,
    );
    rows += saved.length;

    // Matched back by month, not by position. RETURNING does not promise the
    // order of the VALUES list, and getting it wrong would attach January's text
    // to July's row while still reporting a clean run.
    const idByMonth = new Map(saved.map((r) => [r.month, r.id]));

    const trValues = [];
    const trParams = [];
    for (let m = 1; m <= 12; m += 1) {
      const i = m - 1;
      const override = spec.highlights[m];
      const fallback = DEFAULT_TEXT[defaultKeyFor(profile.rain[i], profile.weather[i])];
      for (const locale of LOCALES) {
        const n = trParams.length;
        trValues.push(`($${n + 1},$${n + 2},$${n + 3})`);
        trParams.push(idByMonth.get(m), locale, override ? override[locale] : fallback[locale]);
        translations += 1;
      }
    }

    await client.query(
      `insert into destination_seasonality_translations (seasonality_id, locale, highlight)
       values ${trValues.join(', ')}
       on conflict (seasonality_id, locale) do update set highlight = excluded.highlight`,
      trParams,
    );

    await client.query('commit');
    done += 1;
    process.stdout.write(`  ${dest.country_code} ${dest.key}\n`);
  }

  console.log(`\n  ${rows} months across ${done} destinations.`);
  console.log(`  ${translations} translations in ${LOCALES.length} locales.`);
  if (missing.length) {
    console.log(`\n  NOT COVERED — add these to seasonality-destinations.mjs:`);
    missing.forEach((m) => console.log(`    ${m}`));
    process.exitCode = 1;
  }
} catch (err) {
  // Only the destination in flight is lost; everything committed before it
  // stands, and re-running upserts the rest.
  await client.query('rollback').catch(() => {});
  console.error(`\n  Failed after ${done} destinations:`, err.message);
  console.error('  Committed work is kept — re-run to finish.');
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
