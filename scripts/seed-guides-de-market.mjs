import { pool } from './db.mjs';
import { germanMarketGuides } from '../supabase/seed/guides-de-market.mjs';
import { germanMarketGuides2 } from '../supabase/seed/guides-de-market-2.mjs';

const allGuides = [...germanMarketGuides, ...germanMarketGuides2];

/**
 * Publishes the German-market guides.
 *
 * These are single-locale by design, which every other seeder here would have
 * treated as a mistake. A guide about which visa a German passport needs has no
 * English readership, and writing one would be padding the site rather than
 * answering anyone.
 *
 * Idempotent and keyed on the guide's own locale slug, so revising the content
 * file and re-running is the editing workflow.
 *
 * Images are borrowed from the destination each guide is about, as the
 * Africa-wide seeder does: those photographs are already on the site and already
 * licensed, and duplicating the bytes to say the same thing would be waste.
 */

const client = await pool.connect();

try {
  await client.query('begin');

  for (const g of allGuides) {
    const locale = g.locale ?? 'de';

    const { rows: cat } = g.category
      ? await client.query('select id from categories where key = $1', [g.category])
      : { rows: [] };

    const { rows: cover } = await client.query(
      'select cover_image_url from destinations where key = $1',
      [g.coverKey],
    );

    // Matched on this guide's own locale, not on English. Looking it up by an
    // English slug it will never have would insert a duplicate on every run.
    const { rows: existing } = await client.query(
      `select g.id from guides g
       join guide_translations t on t.guide_id = g.id
       where t.locale = $1 and t.slug = $2 limit 1`,
      [locale, g.slug],
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      await client.query(
        `update guides set primary_category_id = $2, reading_minutes = $3,
           is_featured = $4, sort_order = $5, cover_image_url = $6,
           status = 'published', is_demo = false, allow_ads = true
         where id = $1`,
        [id, cat[0]?.id ?? null, g.readingMinutes, g.featured ?? false,
         g.sortOrder ?? 0, cover[0]?.cover_image_url ?? null],
      );
    } else {
      const { rows } = await client.query(
        `insert into guides (primary_category_id, reading_minutes, is_featured,
           sort_order, cover_image_url, status, is_demo, allow_ads)
         values ($1,$2,$3,$4,$5,'published',false,true) returning id`,
        [cat[0]?.id ?? null, g.readingMinutes, g.featured ?? false,
         g.sortOrder ?? 0, cover[0]?.cover_image_url ?? null],
      );
      id = rows[0].id;
    }

    await client.query(
      `insert into guide_translations
         (guide_id, locale, title, slug, excerpt, body, seo_title, seo_description)
       values ($1,$2,$3,$4,$5,$6,$3,$5)
       on conflict (guide_id, locale) do update
         set title = excluded.title, slug = excluded.slug, excerpt = excluded.excerpt,
             body = excluded.body, seo_title = excluded.seo_title,
             seo_description = excluded.seo_description`,
      [id, locale, g.title, g.slug, g.excerpt, g.body],
    );

    // Single-locale means exactly that: any other locale left over from an
    // earlier run has to go, or hreflang starts advertising a translation that
    // no longer exists.
    await client.query(
      'delete from guide_translations where guide_id = $1 and locale <> $2',
      [id, locale],
    );

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

    console.log(
      `  ${existing.length ? 'updated' : 'created'}  /${locale}/reisefuehrer/${g.slug}` +
        `  (${order} images | cover: ${cover[0]?.cover_image_url ? 'yes' : 'none'})`,
    );
  }

  await client.query('commit');
  console.log(`\n  ${allGuides.length} German-market guides published.`);
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
