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
 * is the editing workflow, the same as the guide seeders.
 */

const LOCALES = ['en', 'de', 'fr', 'it'];
const client = await pool.connect();

let rows = 0;
let translations = 0;
const missing = [];

try {
  await client.query('begin');

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

    for (let m = 1; m <= 12; m += 1) {
      const i = m - 1;
      const rain = profile.rain[i];
      const weather = profile.weather[i];

      const { rows: saved } = await client.query(
        `insert into destination_seasonality
           (destination_id, month, wildlife_rating, weather_rating, crowd_level,
            rainfall_mm, temp_min_c, temp_max_c, is_peak_season, highlight_key)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (destination_id, month) do update set
           wildlife_rating = excluded.wildlife_rating,
           weather_rating  = excluded.weather_rating,
           crowd_level     = excluded.crowd_level,
           rainfall_mm     = excluded.rainfall_mm,
           temp_min_c      = excluded.temp_min_c,
           temp_max_c      = excluded.temp_max_c,
           is_peak_season  = excluded.is_peak_season,
           highlight_key   = excluded.highlight_key
         returning id`,
        [
          dest.id,
          m,
          spec.wildlife ? spec.wildlife[i] : null,
          weather,
          spec.crowd[i],
          rain,
          baseLo + profile.loDelta[i],
          baseHi + profile.hiDelta[i],
          peak.has(m),
          spec.highlights[m]?.key ?? null,
        ],
      );

      rows += 1;
      const seasonalityId = saved[0].id;
      const override = spec.highlights[m];
      const fallback = DEFAULT_TEXT[defaultKeyFor(rain, weather)];

      for (const locale of LOCALES) {
        await client.query(
          `insert into destination_seasonality_translations (seasonality_id, locale, highlight)
           values ($1,$2,$3)
           on conflict (seasonality_id, locale) do update set highlight = excluded.highlight`,
          [seasonalityId, locale, override ? override[locale] : fallback[locale]],
        );
        translations += 1;
      }
    }

    process.stdout.write(`  ${dest.country_code} ${dest.key}\n`);
  }

  await client.query('commit');

  console.log(`\n  ${rows} months across ${destinations.length - missing.length} destinations.`);
  console.log(`  ${translations} translations in ${LOCALES.length} locales.`);
  if (missing.length) {
    console.log(`\n  NOT COVERED — add these to seasonality-destinations.mjs:`);
    missing.forEach((m) => console.log(`    ${m}`));
    process.exitCode = 1;
  }
} catch (err) {
  await client.query('rollback');
  console.error('\n  Seeding failed, nothing written:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
