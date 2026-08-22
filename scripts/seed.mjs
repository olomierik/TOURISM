import { pool } from './db.mjs';
import { destinations, categories, seasonality } from '../supabase/seed/taxonomy.mjs';
import { businesses } from '../supabase/seed/businesses.mjs';
import { packages } from '../supabase/seed/packages.mjs';
import { guides } from '../supabase/seed/guides.mjs';

/**
 * Idempotent demo seed.
 *
 * Every insert is an upsert keyed on a stable natural key (`key` or `slug`), so
 * running this repeatedly converges rather than duplicating. Re-running after
 * editing a seed file updates the existing rows in place, which keeps UUIDs —
 * and therefore any links pointing at them — intact.
 *
 * Everything created here carries is_demo = true.
 */

const LOCALES = ['en', 'de', 'fr', 'it'];

let client;
const ids = { destinations: {}, categories: {}, businesses: {}, packages: {} };

const log = (msg) => console.log(`  ${msg}`);

async function seedDestinations() {
  for (const d of destinations) {
    const { rows } = await client.query(
      `insert into destinations (key, latitude, longitude, sort_order, is_featured, is_demo)
       values ($1, $2, $3, $4, $5, true)
       on conflict (key) do update
         set latitude = excluded.latitude,
             longitude = excluded.longitude,
             sort_order = excluded.sort_order,
             is_featured = excluded.is_featured
       returning id`,
      [d.key, d.latitude, d.longitude, d.sortOrder ?? 0, d.isFeatured ?? false],
    );
    const id = rows[0].id;
    ids.destinations[d.key] = id;

    for (const locale of LOCALES) {
      const tr = d.translations[locale];
      await client.query(
        `insert into destination_translations
           (destination_id, locale, name, slug, summary, description, travel_tips, best_time, seo_title, seo_description)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (destination_id, locale) do update
           set name = excluded.name, slug = excluded.slug, summary = excluded.summary,
               description = excluded.description, travel_tips = excluded.travel_tips,
               best_time = excluded.best_time, seo_title = excluded.seo_title,
               seo_description = excluded.seo_description`,
        [id, locale, tr.name, tr.slug, tr.summary, tr.description,
         tr.travelTips ?? null, tr.bestTime ?? null, tr.seoTitle ?? null, tr.seoDescription ?? null],
      );
    }
  }
  log(`${destinations.length} destinations (x${LOCALES.length} locales)`);
}

async function seedCategories() {
  for (const c of categories) {
    const { rows } = await client.query(
      `insert into categories (key, icon, sort_order)
       values ($1, $2, $3)
       on conflict (key) do update
         set icon = excluded.icon, sort_order = excluded.sort_order
       returning id`,
      [c.key, c.icon, c.sortOrder ?? 0],
    );
    const id = rows[0].id;
    ids.categories[c.key] = id;

    for (const locale of LOCALES) {
      const tr = c.translations[locale];
      await client.query(
        `insert into category_translations
           (category_id, locale, name, name_singular, slug, summary, combo_heading)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (category_id, locale) do update
           set name = excluded.name, name_singular = excluded.name_singular,
               slug = excluded.slug, summary = excluded.summary,
               combo_heading = excluded.combo_heading`,
        [id, locale, tr.name, tr.nameSingular ?? null, tr.slug, tr.summary ?? null, tr.comboHeading ?? null],
      );
    }
  }
  log(`${categories.length} categories (x${LOCALES.length} locales)`);
}

async function seedSeasonality() {
  let count = 0;
  for (const [destKey, months] of Object.entries(seasonality)) {
    const destId = ids.destinations[destKey];
    if (!destId) continue;

    for (const m of months) {
      const { rows } = await client.query(
        `insert into destination_seasonality
           (destination_id, month, wildlife_rating, weather_rating, crowd_level,
            rainfall_mm, temp_min_c, temp_max_c, is_peak_season, highlight_key)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (destination_id, month) do update
           set wildlife_rating = excluded.wildlife_rating,
               weather_rating = excluded.weather_rating,
               crowd_level = excluded.crowd_level,
               rainfall_mm = excluded.rainfall_mm,
               temp_min_c = excluded.temp_min_c,
               temp_max_c = excluded.temp_max_c,
               is_peak_season = excluded.is_peak_season,
               highlight_key = excluded.highlight_key
         returning id`,
        [destId, m.month, m.wildlife, m.weather, m.crowd, m.rainfall,
         m.tempMin, m.tempMax, m.peak, m.highlightKey],
      );

      for (const locale of LOCALES) {
        await client.query(
          `insert into destination_seasonality_translations (seasonality_id, locale, highlight)
           values ($1,$2,$3)
           on conflict (seasonality_id, locale) do update set highlight = excluded.highlight`,
          [rows[0].id, locale, m.highlight?.[locale] ?? null],
        );
      }
      count++;
    }
  }
  log(`${count} seasonality months`);
}

async function seedBusinesses() {
  for (const b of businesses) {
    const { rows } = await client.query(
      `insert into businesses
         (slug, name, status, tier, is_verified, rating_avg, email, phone, whatsapp,
          website, city, founded_year, team_size, is_demo, published_at)
       values ($1,$2,'approved',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true, now())
       on conflict (slug) do update
         set name = excluded.name, status = 'approved', tier = excluded.tier,
             is_verified = excluded.is_verified, email = excluded.email,
             phone = excluded.phone, whatsapp = excluded.whatsapp,
             website = excluded.website, city = excluded.city,
             founded_year = excluded.founded_year, team_size = excluded.team_size
       returning id`,
      [b.slug, b.name, b.tier, b.verified, b.rating ?? 0, b.email, b.phone,
       b.whatsapp ?? null, b.website ?? null, b.city, b.foundedYear ?? null, b.teamSize ?? null],
    );
    const id = rows[0].id;
    ids.businesses[b.slug] = id;

    for (const locale of LOCALES) {
      await client.query(
        `insert into business_translations
           (business_id, locale, tagline, short_description, description, seo_title, seo_description)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (business_id, locale) do update
           set tagline = excluded.tagline, short_description = excluded.short_description,
               description = excluded.description, seo_title = excluded.seo_title,
               seo_description = excluded.seo_description`,
        [id, locale, b.tagline[locale], b.shortDescription[locale], b.description[locale],
         `${b.name} — ${b.tagline[locale]}`, b.shortDescription[locale]],
      );
    }

    await client.query(
      `insert into business_categories (business_id, category_id, is_primary)
       values ($1,$2,true) on conflict do nothing`,
      [id, ids.categories[b.category]],
    );

    for (const [i, destKey] of b.destinations.entries()) {
      await client.query(
        `insert into business_destinations (business_id, destination_id, is_primary)
         values ($1,$2,$3) on conflict do nothing`,
        [id, ids.destinations[destKey], i === 0],
      );
    }
  }
  log(`${businesses.length} businesses (x${LOCALES.length} locales)`);
}

async function seedPackages() {
  for (const p of packages) {
    const businessId = ids.businesses[p.business];
    if (!businessId) throw new Error(`Package ${p.slug} references unknown business ${p.business}`);

    const { rows } = await client.query(
      `insert into packages
         (slug, business_id, duration_days, duration_nights, price_from, currency,
          price_unit, max_group_size, min_travelers, status, is_featured, is_demo)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',$10,true)
       on conflict (slug) do update
         set business_id = excluded.business_id, duration_days = excluded.duration_days,
             duration_nights = excluded.duration_nights, price_from = excluded.price_from,
             currency = excluded.currency, price_unit = excluded.price_unit,
             max_group_size = excluded.max_group_size, min_travelers = excluded.min_travelers,
             status = 'published', is_featured = excluded.is_featured
       returning id`,
      [p.slug, businessId, p.days || null, p.nights ?? null, p.priceFrom, p.currency,
       p.unit, p.maxGroup ?? null, p.minTravelers ?? null, p.featured ?? false],
    );
    const id = rows[0].id;
    ids.packages[p.slug] = id;

    for (const locale of LOCALES) {
      await client.query(
        `insert into package_translations
           (package_id, locale, title, summary, description, seo_title, seo_description)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (package_id, locale) do update
           set title = excluded.title, summary = excluded.summary,
               description = excluded.description, seo_title = excluded.seo_title,
               seo_description = excluded.seo_description`,
        [id, locale, p.title[locale], p.summary[locale], p.description[locale],
         p.title[locale], p.summary[locale]],
      );
    }

    for (const destKey of p.destinations) {
      await client.query(
        `insert into package_destinations (package_id, destination_id)
         values ($1,$2) on conflict do nothing`,
        [id, ids.destinations[destKey]],
      );
    }
    for (const catKey of p.categories) {
      await client.query(
        `insert into package_categories (package_id, category_id)
         values ($1,$2) on conflict do nothing`,
        [id, ids.categories[catKey]],
      );
    }

    // Inclusions have no natural key, so replace them wholesale rather than
    // trying to diff a positional list.
    await client.query('delete from package_inclusions where package_id = $1', [id]);
    for (const [i, [included, labels]] of (p.inclusions ?? []).entries()) {
      const { rows: inc } = await client.query(
        `insert into package_inclusions (package_id, is_included, sort_order)
         values ($1,$2,$3) returning id`,
        [id, included, i],
      );
      for (const locale of LOCALES) {
        await client.query(
          `insert into package_inclusion_translations (inclusion_id, locale, label)
           values ($1,$2,$3)`,
          [inc[0].id, locale, labels[locale]],
        );
      }
    }
  }
  log(`${packages.length} packages (x${LOCALES.length} locales)`);
}

async function seedGuides() {
  for (const g of guides) {
    // Guides have no stable natural key on the base row, so resolve an existing
    // one through its English slug before deciding insert vs update.
    const { rows: existing } = await client.query(
      `select g.id from guides g
       join guide_translations t on t.guide_id = g.id
       where t.locale = 'en' and t.slug = $1
       limit 1`,
      [g.slug.en],
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      await client.query(
        `update guides
         set primary_destination_id = $2, primary_category_id = $3,
             reading_minutes = $4, is_featured = $5, sort_order = $6, status = 'published'
         where id = $1`,
        [id, g.destination ? ids.destinations[g.destination] : null,
         g.category ? ids.categories[g.category] : null,
         g.readingMinutes ?? null, g.featured ?? false, g.sortOrder ?? 0],
      );
    } else {
      const { rows } = await client.query(
        `insert into guides
           (primary_destination_id, primary_category_id, reading_minutes,
            is_featured, sort_order, status, is_demo, allow_ads)
         values ($1,$2,$3,$4,$5,'published',true,true)
         returning id`,
        [g.destination ? ids.destinations[g.destination] : null,
         g.category ? ids.categories[g.category] : null,
         g.readingMinutes ?? null, g.featured ?? false, g.sortOrder ?? 0],
      );
      id = rows[0].id;
    }

    for (const locale of LOCALES) {
      await client.query(
        `insert into guide_translations
           (guide_id, locale, title, slug, excerpt, body, seo_title, seo_description)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (guide_id, locale) do update
           set title = excluded.title, slug = excluded.slug, excerpt = excluded.excerpt,
               body = excluded.body, seo_title = excluded.seo_title,
               seo_description = excluded.seo_description`,
        [id, locale, g.title[locale], g.slug[locale], g.excerpt[locale],
         g.body[locale], g.title[locale], g.excerpt[locale]],
      );
    }
  }
  log(`${guides.length} guides (x${LOCALES.length} locales)`);
}

async function main() {
  client = await pool.connect();
  const started = Date.now();

  try {
    await client.query('begin');

    console.log('\nSeeding demo data...\n');
    await seedDestinations();
    await seedCategories();
    await seedSeasonality();
    await seedBusinesses();
    await seedPackages();
    await seedGuides();

    await client.query('commit');
    console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
    console.log('All rows are flagged is_demo = true.\n');
  } catch (err) {
    await client.query('rollback');
    console.error('\nSeed failed, rolled back:\n');
    console.error(`  ${err.message}\n`);
    if (err.detail) console.error(`  ${err.detail}\n`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
