import { pool } from './db.mjs';
import { africaGuides } from '../supabase/seed/guides-africa.mjs';
import { africaGuideTranslations } from '../supabase/seed/guides-africa-i18n.mjs';

/**
 * Publishes the Africa-wide guides and gives each one real imagery.
 *
 * Images are borrowed from the destination the guide is about, rather than
 * uploaded separately: those photographs are already on the site, already
 * licensed, and a guide about the Masai Mara wanting a photograph of the Masai
 * Mara is not a coincidence worth duplicating storage over.
 *
 * Idempotent. Re-running edits in place, so revising the content file and
 * re-seeding is the normal editing workflow.
 */

const client = await pool.connect();

try {
  await client.query('begin');

  for (const g of africaGuides) {
    const { rows: dest } = g.destination
      ? await client.query('select id from destinations where key = $1', [g.destination])
      : { rows: [] };
    const { rows: cat } = g.category
      ? await client.query('select id from categories where key = $1', [g.category])
      : { rows: [] };

    // The cover comes from the destination the guide is about.
    const { rows: cover } = await client.query(
      'select cover_image_url from destinations where key = $1',
      [g.coverKey],
    );

    const { rows: existing } = await client.query(
      `select g.id from guides g
       join guide_translations t on t.guide_id = g.id
       where t.locale = 'en' and t.slug = $1 limit 1`,
      [g.slug],
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      await client.query(
        `update guides set primary_destination_id = $2, primary_category_id = $3,
           reading_minutes = $4, is_featured = $5, sort_order = $6,
           cover_image_url = $7, status = 'published', is_demo = false, allow_ads = true
         where id = $1`,
        [id, dest[0]?.id ?? null, cat[0]?.id ?? null, g.readingMinutes,
         g.featured ?? false, g.sortOrder ?? 0, cover[0]?.cover_image_url ?? null],
      );
    } else {
      const { rows } = await client.query(
        `insert into guides (primary_destination_id, primary_category_id, reading_minutes,
           is_featured, sort_order, cover_image_url, status, is_demo, allow_ads)
         values ($1,$2,$3,$4,$5,$6,'published',false,true) returning id`,
        [dest[0]?.id ?? null, cat[0]?.id ?? null, g.readingMinutes,
         g.featured ?? false, g.sortOrder ?? 0, cover[0]?.cover_image_url ?? null],
      );
      id = rows[0].id;
    }

    // English is the source; the rest are translations of it, written through the
    // same statement rather than a separate path.
    const byLocale = [
      ['en', g],
      ...Object.entries(africaGuideTranslations)
        .map(([locale, guides]) => [locale, guides[g.key]])
        .filter(([, t]) => Boolean(t)),
    ];

    for (const [locale, t] of byLocale) {
      await client.query(
        `insert into guide_translations
           (guide_id, locale, title, slug, excerpt, body, seo_title, seo_description)
         values ($1,$2,$3,$4,$5,$6,$3,$5)
         on conflict (guide_id, locale) do update
           set title = excluded.title, slug = excluded.slug, excerpt = excluded.excerpt,
               body = excluded.body, seo_title = excluded.seo_title,
               seo_description = excluded.seo_description`,
        [id, locale, t.title, t.slug, t.excerpt, t.body],
      );
    }

    // A guide translated into fewer locales than a previous run must stop
    // advertising the ones that were dropped — hreflang is generated from these.
    await client.query(
      `delete from guide_translations where guide_id = $1 and locale <> all($2::text[])`,
      [id, byLocale.map(([locale]) => locale)],
    );

    // Gallery images, copied as rows pointing at the same stored objects. The
    // bytes are not duplicated — only the reference — so removing a destination
    // photograph would leave a dangling guide image, which is why the seeder
    // rebuilds these from scratch on every run rather than accumulating.
    await client.query("delete from media where guide_id = $1 and kind = 'gallery'", [id]);

    let order = 0;
    for (const key of g.galleryKeys ?? []) {
      const { rows: imgs } = await client.query(
        `select m.public_url, m.bucket, m.storage_path, m.caption, m.alt_text
         from media m join destinations d on d.id = m.destination_id
         where d.key = $1 and m.kind = 'gallery' order by m.sort_order limit 2`,
        [key],
      );
      for (const img of imgs) {
        await client.query(
          `insert into media (guide_id, kind, bucket, storage_path, public_url, caption, alt_text, sort_order)
           values ($1,'gallery',$2,$3,$4,$5,$6,$7)`,
          [id, img.bucket, `guide-${id}-${order}-${img.storage_path.split('/').pop()}`,
           img.public_url, img.caption, img.alt_text, order],
        );
        order++;
      }
    }

    console.log(`  published  ${g.slug}  (${byLocale.map(([l]) => l).join(', ')} | cover: ${cover[0]?.cover_image_url ? 'yes' : 'none'} | ${order} images)`);
  }

  await client.query('commit');
  console.log(`\n  ${africaGuides.length} guides published.`);
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
