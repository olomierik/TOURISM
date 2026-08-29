import { pool } from './db.mjs';

/**
 * Removes http:// image URLs from the database.
 *
 * next/image refuses any host not in remotePatterns, and remotePatterns allows
 * https only. A single listing with an http:// cover therefore throws at render
 * time and returns 500 for the whole page — not a broken image, a broken page.
 * 16 listings carry one, picked up by the og:image backfill from operator sites
 * that still serve plain http.
 *
 * Production currently answers 200 on those pages because they were generated
 * before the covers landed. The next full build would not, which is the kind of
 * bug that ships on a Friday and is blamed on the deploy.
 *
 * Allowing http in remotePatterns would be the wrong fix twice over: an http
 * image on an https page is mixed content and the browser blocks it anyway, so
 * the page would still render imageless, and the optimizer would be fetching
 * over a channel anyone can rewrite in transit.
 *
 * So: try the same URL over https. Most sites serve both, and the ones that do
 * keep their picture. The ones that do not lose the cover, which is the correct
 * outcome — a listing with no image renders a placeholder, and a listing with a
 * 500 renders nothing at all.
 */

const client = await pool.connect();
let upgraded = 0;
let cleared = 0;

/** Does this host serve the same file over https? One HEAD, short timeout. */
async function servesHttps(url) {
  const secure = url.replace(/^http:\/\//i, 'https://');
  try {
    const res = await fetch(secure, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    // A login page or an HTML error served with 200 is not a cover image.
    return type.startsWith('image/') ? secure : null;
  } catch {
    return null;
  }
}

try {
  const { rows } = await client.query(
    `select id, slug, cover_image_url from businesses
      where cover_image_url like 'http://%' and deleted_at is null
      order by slug`,
  );

  console.log(`\n  ${rows.length} listings with an insecure cover.\n`);

  for (const b of rows) {
    const secure = await servesHttps(b.cover_image_url);

    if (secure) {
      await client.query('update businesses set cover_image_url = $2 where id = $1', [
        b.id,
        secure,
      ]);
      upgraded += 1;
      console.log(`  https  ${b.slug}`);
    } else {
      await client.query('update businesses set cover_image_url = null where id = $1', [b.id]);
      cleared += 1;
      console.log(`  clear  ${b.slug}`);
    }
  }

  // The gallery is the other half, and the half that actually caused the 500s:
  // media.public_url is read by the business page directly, so clearing the
  // cover fixed nothing while these rows were still being handed to next/image.
  // Same treatment — try https, drop what does not answer.
  const { rows: mediaRows } = await client.query(
    `select id, public_url from media where public_url like 'http://%'`,
  );
  let mediaUp = 0;
  let mediaGone = 0;
  for (const m of mediaRows) {
    const secure = await servesHttps(m.public_url);
    if (secure) {
      await client.query('update media set public_url = $2 where id = $1', [m.id, secure]);
      mediaUp += 1;
    } else {
      await client.query('delete from media where id = $1', [m.id]);
      mediaGone += 1;
    }
  }
  if (mediaRows.length) {
    console.log(`
  media: ${mediaUp} upgraded, ${mediaGone} removed.`);
  }

  // Logos and destination covers travel the same path into next/image.
  const { rowCount: logos } = await client.query(
    `update businesses set logo_url = null
      where logo_url like 'http://%' and deleted_at is null`,
  );
  const { rowCount: dests } = await client.query(
    `update destinations set cover_image_url = null where cover_image_url like 'http://%'`,
  );

  console.log(`\n  ${upgraded} upgraded to https, ${cleared} cleared.`);
  if (logos) console.log(`  ${logos} insecure logos cleared.`);
  if (dests) console.log(`  ${dests} insecure destination covers cleared.`);
} catch (err) {
  console.error('  Failed:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
