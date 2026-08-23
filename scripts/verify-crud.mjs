import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

/**
 * Verification for the media, quota, review and admin-CRUD surface.
 *
 * Everything here runs as the real `authenticated` role through the publishable
 * key. The service key bypasses RLS and the quota trigger, so a test written
 * with it would pass regardless of whether any policy exists — which is the one
 * outcome that would make this file worse than useless.
 *
 * The gallery quota gets the most attention because it is the only thing
 * standing between the free tier and unlimited storage, and because a limit that
 * exists only in the dashboard UI is not a limit at all: the storage and REST
 * endpoints are reachable directly with the publishable key.
 */

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const anonClient = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });

let pass = 0;
let fail = 0;
const createdUsers = [];
const createdBusinesses = [];
const createdDestinations = [];

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

/** Creates a confirmed user and returns a client already signed in as them. */
async function makeUser(role) {
  const email = `crud-probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'CRUD Probe', role: role === 'admin' ? 'traveler' : role },
  });
  if (error) throw new Error(`makeUser: ${error.message}`);
  createdUsers.push(data.user.id);

  // Admin is never self-assignable, so it is granted the same way the real
  // bootstrap script does it.
  if (role === 'admin') {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }

  const client = anonClient();
  const { error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);
  return { client, id: data.user.id };
}

async function makeBusiness(ownerId) {
  const { data, error } = await admin
    .from('businesses')
    .insert({
      owner_id: ownerId,
      name: `Probe Safaris ${crypto.randomUUID().slice(0, 6)}`,
      slug: `probe-${crypto.randomUUID().slice(0, 8)}`,
      status: 'approved',
    })
    .select('id')
    .single();
  if (error) throw new Error(`makeBusiness: ${error.message}`);
  createdBusinesses.push(data.id);
  return data.id;
}

/** Inserts a gallery row directly, the way a determined client would. */
async function addGalleryImage(client, businessId, n) {
  return client.from('media').insert({
    business_id: businessId,
    kind: 'gallery',
    bucket: 'business-media',
    storage_path: `${businessId}/probe-${n}-${crypto.randomUUID().slice(0, 6)}.jpg`,
    public_url: 'https://example.com/probe.jpg',
    caption: `Probe image ${n}`,
  });
}

async function main() {
  console.log('\n--- Gallery quota is enforced by the database ---');

  const owner = await makeUser('business_owner');
  const businessId = await makeBusiness(owner.id);

  const { data: freeLimit } = await admin
    .from('subscription_plans')
    .select('max_gallery_images')
    .eq('key', 'free')
    .single();

  check(
    'free plan allows ten gallery images',
    freeLimit?.max_gallery_images === 10,
    `limit is ${freeLimit?.max_gallery_images}`,
  );

  const limit = freeLimit?.max_gallery_images ?? 10;

  let inserted = 0;
  for (let i = 0; i < limit; i++) {
    const { error } = await addGalleryImage(owner.client, businessId, i);
    if (!error) inserted++;
    else console.log(`      (insert ${i} refused: ${error.message})`);
  }
  check('owner can fill the gallery to the limit', inserted === limit, `${inserted}/${limit}`);

  const { error: overErr } = await addGalleryImage(owner.client, businessId, 99);
  check(
    'the image past the limit is refused',
    Boolean(overErr) && overErr.message.includes('gallery_limit_reached'),
    overErr?.message ?? 'insert succeeded — the paywall does not hold',
  );

  // The quota must count only gallery images: a logo and a cover are structural,
  // and metering them would make the free tier look broken rather than limited.
  const { error: logoErr } = await owner.client.from('media').insert({
    business_id: businessId,
    kind: 'logo',
    bucket: 'business-media',
    storage_path: `${businessId}/logo-${crypto.randomUUID().slice(0, 6)}.jpg`,
  });
  check('a logo is still allowed at the gallery limit', !logoErr, logoErr?.message ?? '');

  console.log('\n--- Ownership boundaries on media ---');

  const stranger = await makeUser('business_owner');
  const { error: crossErr } = await addGalleryImage(stranger.client, businessId, 0);
  check(
    'another owner cannot add images to your business',
    Boolean(crossErr),
    crossErr ? '' : 'insert succeeded — cross-business write is possible',
  );

  const { data: mine } = await owner.client
    .from('media')
    .select('id')
    .eq('business_id', businessId)
    .limit(1)
    .maybeSingle();

  const { error: crossDelErr, count: crossDelCount } = await stranger.client
    .from('media')
    .delete({ count: 'exact' })
    .eq('id', mine?.id ?? '00000000-0000-0000-0000-000000000000');
  check(
    'another owner cannot delete your images',
    Boolean(crossDelErr) || crossDelCount === 0,
    `deleted ${crossDelCount ?? 0} rows`,
  );

  console.log('\n--- Destination media is admin-only ---');

  const { data: dest } = await admin
    .from('destinations')
    .insert({ key: `probe-dest-${crypto.randomUUID().slice(0, 8)}` })
    .select('id')
    .single();
  createdDestinations.push(dest.id);

  const { error: destWriteErr } = await owner.client.from('media').insert({
    destination_id: dest.id,
    kind: 'gallery',
    bucket: 'destination-media',
    storage_path: `${dest.id}/probe.jpg`,
  });
  check(
    'a business owner cannot add destination photos',
    Boolean(destWriteErr),
    destWriteErr ? '' : 'insert succeeded — destination media is writable by anyone',
  );

  const adminUser = await makeUser('admin');
  const { error: adminDestErr } = await adminUser.client.from('media').insert({
    destination_id: dest.id,
    kind: 'gallery',
    bucket: 'destination-media',
    storage_path: `${dest.id}/admin-probe.jpg`,
    public_url: 'https://example.com/d.jpg',
    caption: 'Admin uploaded',
  });
  check('an admin can add destination photos', !adminDestErr, adminDestErr?.message ?? '');

  console.log('\n--- An admin is not metered by the business quota ---');

  const { error: adminOverErr } = await adminUser.client.from('media').insert({
    business_id: businessId,
    kind: 'gallery',
    bucket: 'business-media',
    storage_path: `${businessId}/admin-extra.jpg`,
  });
  check(
    'an admin may add past a business gallery limit',
    !adminOverErr,
    adminOverErr?.message ?? '',
  );

  console.log('\n--- Admin CRUD is closed to non-admins ---');

  const { error: destCreateErr } = await owner.client
    .from('destinations')
    .insert({ key: `sneaky-${crypto.randomUUID().slice(0, 8)}` });
  check(
    'a business owner cannot create destinations',
    Boolean(destCreateErr),
    destCreateErr ? '' : 'insert succeeded',
  );

  const { error: guideCreateErr } = await owner.client
    .from('guides')
    .insert({ status: 'draft' });
  check(
    'a business owner cannot create guides',
    Boolean(guideCreateErr),
    guideCreateErr ? '' : 'insert succeeded',
  );

  const { count: destDelCount } = await owner.client
    .from('destinations')
    .delete({ count: 'exact' })
    .eq('id', dest.id);
  check('a business owner cannot delete destinations', (destDelCount ?? 0) === 0);

  console.log('\n--- Reviews, now open to any signed-in traveler ---');

  const traveler = await makeUser('traveler');

  const { error: revErr } = await traveler.client.from('reviews').insert({
    business_id: businessId,
    author_id: traveler.id,
    rating: 5,
    title: 'Excellent trip',
    body: 'Probe review body.',
    locale: 'en',
    status: 'published',
  });
  check(
    'a traveler can review without a prior enquiry',
    !revErr,
    revErr?.message ?? '',
  );

  const { data: written } = await admin
    .from('reviews')
    .select('id, is_verified_enquiry')
    .eq('business_id', businessId)
    .eq('author_id', traveler.id)
    .maybeSingle();

  check(
    'a review with no enquiry is marked unverified',
    written?.is_verified_enquiry === false,
    `flag is ${written?.is_verified_enquiry}`,
  );

  // The mark is the only thing separating a real customer from a stranger, so it
  // must not be settable by the person it describes.
  const { error: flagErr } = await traveler.client
    .from('reviews')
    .update({ is_verified_enquiry: true })
    .eq('id', written.id);

  const { data: afterFlag } = await admin
    .from('reviews')
    .select('is_verified_enquiry')
    .eq('id', written.id)
    .single();

  check(
    'an author cannot award themselves the verified mark',
    afterFlag?.is_verified_enquiry === false,
    flagErr ? 'update refused' : `flag is now ${afterFlag?.is_verified_enquiry}`,
  );

  const { error: dupeErr } = await traveler.client.from('reviews').insert({
    business_id: businessId,
    author_id: traveler.id,
    rating: 1,
    locale: 'en',
    status: 'published',
  });
  check('a second review from the same person is refused', Boolean(dupeErr));

  const { error: fakeLeadErr } = await traveler.client.from('reviews').insert({
    business_id: await makeBusiness(null),
    author_id: traveler.id,
    rating: 5,
    lead_id: null,
    locale: 'en',
    status: 'published',
  });
  check('a review on a second business is allowed', !fakeLeadErr, fakeLeadErr?.message ?? '');

  const { error: impersonateErr } = await traveler.client.from('reviews').insert({
    business_id: businessId,
    author_id: owner.id,
    rating: 5,
    locale: 'en',
  });
  check(
    'a traveler cannot post a review as someone else',
    Boolean(impersonateErr),
    impersonateErr ? '' : 'insert succeeded — authorship is forgeable',
  );

  console.log('\n--- Published reviews are publicly readable ---');

  const publicClient = anonClient();
  const { data: publicReviews } = await publicClient
    .from('reviews')
    .select('id, rating, is_verified_enquiry')
    .eq('business_id', businessId)
    .eq('status', 'published');

  check(
    'an anonymous visitor sees published reviews',
    (publicReviews?.length ?? 0) > 0,
    `${publicReviews?.length ?? 0} visible`,
  );

  const { data: ratingRow } = await admin
    .from('businesses')
    .select('rating_avg, rating_count')
    .eq('id', businessId)
    .single();

  check(
    'the business rating is recalculated from reviews',
    Number(ratingRow?.rating_count) > 0 && Number(ratingRow?.rating_avg) > 0,
    `avg ${ratingRow?.rating_avg} over ${ratingRow?.rating_count}`,
  );

  console.log('\n--- Gallery allowance reporting ---');

  const { data: reportedLimit } = await owner.client.rpc('gallery_limit_for', {
    p_business_id: businessId,
  });
  check(
    'gallery_limit_for reports the free allowance',
    reportedLimit === limit,
    `returned ${reportedLimit}`,
  );
}

/**
 * Removes everything this suite created.
 *
 * Deletes by naming pattern as well as by tracked id. Tracking alone is not
 * enough: a run that aborts between creating a row and recording it — or that is
 * killed by a transient network failure partway through — leaves residue that
 * then fails unrelated assertions in other suites, which is exactly what
 * happened the first time this ran. The probe prefixes are distinctive enough
 * that matching on them cannot touch real data.
 */
async function cleanup() {
  const client = await pool.connect();
  try {
    if (createdBusinesses.length) {
      await client.query('delete from businesses where id = any($1::uuid[])', [createdBusinesses]);
    }
    if (createdDestinations.length) {
      await client.query('delete from destinations where id = any($1::uuid[])', [
        createdDestinations,
      ]);
    }
    await client.query("delete from businesses where slug like 'probe-%'");
    await client.query(
      "delete from destinations where key like 'probe-dest-%' or key like 'sneaky-%'",
    );
  } finally {
    client.release();
    await pool.end();
  }

  for (const id of createdUsers) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }

  const { data: leftovers } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const u of leftovers?.users ?? []) {
    if (u.email?.startsWith('crud-probe-')) {
      await admin.auth.admin.deleteUser(u.id).catch(() => {});
    }
  }
  console.log(
    `\n  cleaned up ${createdUsers.length} accounts, ${createdBusinesses.length} businesses, ${createdDestinations.length} destinations`,
  );
}

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  await cleanup();
  console.log('\n' + '='.repeat(50));
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(50) + '\n');
  if (fail > 0) process.exitCode = 1;
}
