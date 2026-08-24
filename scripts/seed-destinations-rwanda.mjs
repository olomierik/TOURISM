import { pool } from './db.mjs';
import { rwandaDestinations } from '../supabase/seed/destinations-rwanda.mjs';

/**
 * Publishes Rwanda's destinations.
 *
 * Idempotent and keyed on `destinations.key`, so revising the content file and
 * re-running is the editing workflow — the same shape as the guide seeder.
 *
 * Cover images are deliberately left alone. Every photograph on this site was
 * uploaded by hand through the admin cover uploader, and a seeder that invented
 * one would either duplicate another destination's picture or point at nothing.
 * A destination with no cover falls back to the generated placeholder, which is
 * what that fallback is for; re-running after an upload will not overwrite it.
 */

const client = await pool.connect();

try {
  await client.query('begin');

  for (const d of rwandaDestinations) {
    const { rows: region } = await client.query(
      "select id from regions where country_code = 'RW' and name = $1",
      [d.region],
    );
    if (!region.length) throw new Error(`No Rwandan region named "${d.region}"`);

    const { rows: existing } = await client.query(
      'select id from destinations where key = $1',
      [d.key],
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      await client.query(
        `update destinations
           set country_code = 'RW', region_id = $2, latitude = $3, longitude = $4,
               is_featured = $5, sort_order = $6, is_active = true,
               is_demo = false, deleted_at = null
         where id = $1`,
        [id, region[0].id, d.latitude, d.longitude, d.featured ?? false, d.sortOrder ?? 0],
      );
    } else {
      const { rows } = await client.query(
        `insert into destinations
           (key, country_code, region_id, latitude, longitude, is_featured, sort_order,
            is_active, is_demo)
         values ($1,'RW',$2,$3,$4,$5,$6,true,false) returning id`,
        [d.key, region[0].id, d.latitude, d.longitude, d.featured ?? false, d.sortOrder ?? 0],
      );
      id = rows[0].id;
    }

    const locales = Object.entries(d.translations);

    for (const [locale, t] of locales) {
      await client.query(
        `insert into destination_translations
           (destination_id, locale, name, slug, summary, description, best_time,
            travel_tips, seo_title, seo_description)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$3,$5)
         on conflict (destination_id, locale) do update
           set name = excluded.name, slug = excluded.slug, summary = excluded.summary,
               description = excluded.description, best_time = excluded.best_time,
               travel_tips = excluded.travel_tips, seo_title = excluded.seo_title,
               seo_description = excluded.seo_description`,
        [id, locale, t.name, t.slug, t.summary, t.description, t.bestTime, t.travelTips],
      );
    }

    // hreflang is generated from these rows, so a locale dropped from the content
    // file has to stop being advertised — Google discards the whole cluster when
    // one member 404s.
    await client.query(
      `delete from destination_translations
       where destination_id = $1 and locale <> all($2::text[])`,
      [id, locales.map(([locale]) => locale)],
    );

    let months = 0;
    if (d.seasonality?.length) {
      for (const m of d.seasonality) {
        await client.query(
          `insert into destination_seasonality
             (destination_id, month, wildlife_rating, weather_rating, crowd_level,
              rainfall_mm, temp_min_c, temp_max_c, is_peak_season)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (destination_id, month) do update
             set wildlife_rating = excluded.wildlife_rating,
                 weather_rating = excluded.weather_rating,
                 crowd_level = excluded.crowd_level,
                 rainfall_mm = excluded.rainfall_mm,
                 temp_min_c = excluded.temp_min_c,
                 temp_max_c = excluded.temp_max_c,
                 is_peak_season = excluded.is_peak_season`,
          [id, m.month, m.wildlife, m.weather, m.crowd, m.rain, m.min, m.max, m.peak],
        );
        months++;
      }
    }

    const { rows: cover } = await client.query(
      'select cover_image_url from destinations where id = $1',
      [id],
    );

    console.log(
      `  ${existing.length ? 'updated  ' : 'created  '}${d.key}` +
        `  (${locales.map(([l]) => l).join(', ')}` +
        ` | ${d.region}` +
        ` | ${months ? `${months} months` : 'no seasonality'}` +
        ` | cover: ${cover[0]?.cover_image_url ? 'yes' : 'NONE — upload one in admin'})`,
    );
  }

  await client.query('commit');
  console.log(`\n  ${rwandaDestinations.length} Rwandan destinations published.`);
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
