import { pool } from './db.mjs';
import { realGuides } from '../supabase/seed/guides-real.mjs';

/**
 * Publishes the real editorial guides and retires the placeholders.
 *
 * Demo guides are unpublished rather than deleted: they are structurally useful
 * as templates, and an admin can see them in the guides list. What matters is
 * that placeholder prose is not live on an indexed site — a reviewer or a
 * reader landing on it is the problem, not its existence in the database.
 *
 * Idempotent. Re-running updates the guides in place, so editing the content
 * file and re-seeding is the normal editing workflow.
 */

const client = await pool.connect();
let published = 0;
let retired = 0;

try {
  await client.query('begin');

  for (const g of realGuides) {
    const { rows: dest } = g.destination
      ? await client.query('select id from destinations where key = $1', [g.destination])
      : { rows: [] };
    const { rows: cat } = g.category
      ? await client.query('select id from categories where key = $1', [g.category])
      : { rows: [] };

    // Resolve an existing guide by its English slug, so re-running edits rather
    // than duplicating.
    const { rows: existing } = await client.query(
      `select g.id from guides g
       join guide_translations t on t.guide_id = g.id
       where t.locale = 'en' and t.slug = $1
       limit 1`,
      [g.slug],
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      await client.query(
        `update guides
         set primary_destination_id = $2, primary_category_id = $3,
             reading_minutes = $4, is_featured = $5, sort_order = $6,
             status = 'published', is_demo = false, allow_ads = true
         where id = $1`,
        [id, dest[0]?.id ?? null, cat[0]?.id ?? null,
         g.readingMinutes, g.featured ?? false, g.sortOrder ?? 0],
      );
    } else {
      const { rows } = await client.query(
        `insert into guides
           (primary_destination_id, primary_category_id, reading_minutes,
            is_featured, sort_order, status, is_demo, allow_ads)
         values ($1,$2,$3,$4,$5,'published',false,true)
         returning id`,
        [dest[0]?.id ?? null, cat[0]?.id ?? null,
         g.readingMinutes, g.featured ?? false, g.sortOrder ?? 0],
      );
      id = rows[0].id;
    }

    await client.query(
      `insert into guide_translations
         (guide_id, locale, title, slug, excerpt, body, seo_title, seo_description)
       values ($1,'en',$2,$3,$4,$5,$2,$4)
       on conflict (guide_id, locale) do update
         set title = excluded.title, slug = excluded.slug,
             excerpt = excluded.excerpt, body = excluded.body,
             seo_title = excluded.seo_title, seo_description = excluded.seo_description`,
      [id, g.title, g.slug, g.excerpt, g.body],
    );

    published++;
    console.log(`  published  ${g.slug}`);
  }

  // Any remaining demo guide goes back to draft so it leaves the public site
  // and the sitemap without being destroyed.
  const { rowCount } = await client.query(
    `update guides set status = 'draft'
     where is_demo = true and status = 'published'`,
  );
  retired = rowCount ?? 0;

  await client.query('commit');
  console.log(`\n  ${published} real guides published, ${retired} placeholder guides retired to draft.`);
} catch (err) {
  await client.query('rollback');
  console.error('\nSeed failed, rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
