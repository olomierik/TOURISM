import { pool } from './db.mjs';

/**
 * Promotes a gallery image to the cover, for listings and for categories.
 *
 *   node scripts/set-cover-images.mjs [--dry]
 *
 * The Maps import wrote 2,500 gallery rows and no covers, which is the worst of
 * both worlds: the pictures exist, and every card and hero still renders the
 * generated placeholder. Cards read businesses.cover_image_url and nothing else,
 * so a gallery on its own is invisible on every surface except the detail page.
 *
 * Never overwrites. A cover already set was either uploaded by the operator or
 * chosen deliberately, and neither is this script's to replace.
 *
 * Category covers come from a listing inside that category, because that is the
 * imagery this site actually has. A safari category header showing a real
 * Serengeti camp is more honest than a stock photograph of somewhere else.
 */

const DRY = process.argv.includes('--dry');
const client = await pool.connect();

try {
  await client.query('begin');

  // ---- listings ---------------------------------------------------------
  // Lowest sort_order is the first image Google returned, which is the one it
  // shows first — a reasonable proxy for the most representative shot.
  const { rows: covers } = await client.query(`
    with first_image as (
      select distinct on (m.business_id)
             m.business_id, m.public_url
      from media m
      join businesses b on b.id = m.business_id
      where m.kind = 'gallery'
        and m.public_url is not null
        and b.cover_image_url is null
        and b.deleted_at is null
      order by m.business_id, m.sort_order, m.created_at
    )
    update businesses b
       set cover_image_url = f.public_url
      from first_image f
     where b.id = f.business_id
    returning b.id
  `);

  console.log(`  listings given a cover   ${covers.length}`);

  // ---- categories -------------------------------------------------------
  // Preferring a listing that has a destination attached picks a well-formed
  // entry over a stray one, and ordering by image count favours a business that
  // bothered to have several photographs.
  const { rows: cats } = await client.query(`
    select c.id, c.key
    from categories c
    where c.cover_image_url is null and c.deleted_at is null
    order by c.sort_order
  `);

  let categoriesSet = 0;
  // One business must not front two categories. Without this the listing with
  // the most media wins everywhere it appears, and the same photograph headed
  // both Safaris and Activities.
  const used = [];

  for (const cat of cats) {
    const { rows: pick } = await client.query(
      `select b.id, b.cover_image_url, b.name
         from businesses b
         join business_categories bc on bc.business_id = b.id and bc.category_id = $1
        where b.cover_image_url is not null
          and b.status = 'approved'
          and b.deleted_at is null
          -- Primary category only. A tour company that also carries a
          -- restaurant tag is not what a traveller expects at the top of the
          -- restaurants page.
          and bc.is_primary
          and not (b.id = any($2::uuid[]))
          and exists (select 1 from business_destinations bd where bd.business_id = b.id)
        order by (select count(*) from media m where m.business_id = b.id) desc, b.name
        limit 1`,
      [cat.id, used],
    );

    if (!pick.length) {
      console.log(`  ${cat.key.padEnd(12)} no candidate image`);
      continue;
    }

    await client.query('update categories set cover_image_url = $2 where id = $1', [
      cat.id,
      pick[0].cover_image_url,
    ]);
    if (pick[0].id) used.push(pick[0].id);
    categoriesSet++;
    console.log(`  ${cat.key.padEnd(12)} from ${pick[0].name}`);
  }

  console.log(`\n  categories given a cover ${categoriesSet}`);

  if (DRY) {
    await client.query('rollback');
    console.log('\n  DRY RUN — rolled back\n');
  } else {
    await client.query('commit');
  }
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
