import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';
import { domainMatches, hostOf, isSharedHost } from '../lib/claims/domain-match.ts';

/**
 * Verification for listing claims.
 *
 * Approving a claim hands a business — its contact details, its enquiries, its
 * position in lead routing — to whoever asked for it. It is the single most
 * dangerous write in the application, and the only one where a policy mistake
 * lets a stranger take over an operator's listing.
 *
 * So everything here runs through the publishable key as the real
 * `authenticated` role. The service key bypasses RLS and every trigger, and a
 * test written with it would pass whether or not a single protection exists.
 *
 * All fixtures are created and torn down by this file. Nothing selects an
 * existing business: that pattern detached a real listing from its owner once
 * already.
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

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function makeUser(role = 'traveler') {
  const email = `claim-probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Claim Probe', role: role === 'admin' ? 'traveler' : role },
  });
  if (error) throw new Error(`makeUser: ${error.message}`);
  createdUsers.push(data.user.id);

  if (role === 'admin') {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }

  const client = anonClient();
  const { error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);
  return { client, id: data.user.id };
}

/** An unclaimed listing, the shape the registry seeding will produce. */
async function makeUnclaimedBusiness() {
  const { data, error } = await admin
    .from('businesses')
    .insert({
      owner_id: null,
      name: `Claim Probe Safaris ${crypto.randomUUID().slice(0, 6)}`,
      slug: `claim-probe-${crypto.randomUUID().slice(0, 8)}`,
      status: 'approved',
    })
    .select('id')
    .single();
  if (error) throw new Error(`makeUnclaimedBusiness: ${error.message}`);
  createdBusinesses.push(data.id);
  return data.id;
}

const fileClaim = (client, businessId, extra = {}) =>
  client
    .from('business_claims')
    .insert({
      business_id: businessId,
      claimant_id: extra.claimantId,
      contact_name: 'Probe Operator',
      contact_email: 'operator@example.com',
      evidence: 'Tourism licence TZ-000-PROBE, registered at 1 Probe Street, Arusha.',
      ...extra.overrides,
    })
    .select('id')
    .maybeSingle();

/**
 * The honeypot must not be a field a browser wants to fill in.
 *
 * It was named `company`, with a "Company" label on the quote form. Chrome
 * autofills that as an organisation whatever autocomplete="off" says, so a real
 * person with autofill enabled tripped the trap, saw a success message, and had
 * their submission silently discarded. Zero claims and zero leads, with nothing
 * in any log to explain either.
 *
 * Checked statically because the failure is invisible at runtime by design: the
 * whole point of a honeypot is to report success when it fires.
 */
function honeypotTests() {
  console.log('\n--- The honeypot is not autofill bait ---');

  const read = (path) => readFileSync(path, 'utf8');
  const BAIT =
    /^(company|organization|organisation|name|email|phone|tel|address|city|url|website|fax|title)$/i;

  const pairs = [
    { label: 'claim', form: 'components/business/claim-form.tsx', action: 'lib/claims/actions.ts' },
    { label: 'quote', form: 'components/quote/quote-form.tsx', action: 'lib/leads/actions.ts' },
  ];

  for (const { label, form, action } of pairs) {
    const formSrc = read(form);
    const actionSrc = read(action);

    const inForm = [...formSrc.matchAll(/name="([a-z_0-9]*hp[a-z_0-9]*)"/gi)].map((m) => m[1]);
    const inAction = [...actionSrc.matchAll(/formData, '([a-z_0-9]*hp[a-z_0-9]*)'/gi)].map(
      (m) => m[1],
    );

    check(`${label}: form declares exactly one honeypot`, inForm.length === 1,
      inForm.join(', ') || 'none');
    check(`${label}: the action checks that same name`,
      inAction.length === 1 && inAction[0] === inForm[0],
      `form=${inForm[0] ?? 'none'} action=${inAction[0] ?? 'none'}`);
    check(`${label}: the name is not something a browser autofills`,
      Boolean(inForm[0]) && !BAIT.test(inForm[0]), inForm[0] ?? 'none');
    // A label naming a real field type is what makes Chrome confident enough to
    // fill an input even when its name is unusual.
    check(`${label}: no label invites autofill`,
      !/<label[^>]*htmlFor="(company|organization|organisation)"/i.test(formSrc));
  }
}

/**
 * Email verification hands a claim the strongest signal a reviewer has, so the
 * question is whether a claimant can award it to themselves.
 *
 * The code lives in claim_verifications, which has RLS on and no policy at all —
 * invisible to every client role. A six-digit code has a million possibilities,
 * so a hash in a row the claimant can read is a hash they can brute-force
 * offline in seconds; the table being unreachable is what makes hashing enough.
 */
/**
 * The domain matcher decides who owns a listing, so it is worth more than a
 * glance. Imported directly — Node strips the types — because a reimplementation
 * of the rules in the test file would assert that I can write the same bug twice.
 *
 * The false-positive cases are the ones that matter. A refused true match costs
 * a claimant one form field; an accepted false one costs somebody their listing.
 */
function domainMatchTests() {
  console.log('\n--- Domain matching refuses what it should ---');

  // True matches: the address sits on the domain the listing publishes.
  check('a matching custom domain proves the mailbox',
    domainMatches('https://www.wildfrontiers.co.tz/', 'sales@wildfrontiers.co.tz'));
  check('a bare host matches a full URL with a path',
    domainMatches('http://wildfrontiers.co.tz/about-us?x=1', 'ops@wildfrontiers.co.tz'));
  check('www on the listing side is stripped before comparing',
    hostOf('https://www.example.co.tz') === 'example.co.tz');
  check('case is not part of the comparison',
    domainMatches('HTTPS://Serengeti-Tours.CO.TZ', 'Info@SERENGETI-TOURS.co.tz'));
  check('a listing email can stand in for a website',
    domainMatches('info@kibotours.co.ug', 'accounts@kibotours.co.ug'));

  // Free mail proves that two people signed up for the same free service.
  for (const host of ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com']) {
    check(`${host} on both sides is not a match`,
      domainMatches(`https://${host}`, `someone@${host}`) === false);
    check(`a ${host} claimant cannot match a real domain`,
      domainMatches('https://mysafari.co.tz', `someone@${host}`) === false);
  }

  // Shared subdomains belong to a user, not to the site operator.
  check('two users of the same Wix subdomain host do not match',
    domainMatches('https://joe.wixsite.com/safari', 'other@joe.wixsite.com') === false);
  check('a Google Sites page is not a domain anyone owns',
    domainMatches('https://sites.google.com/view/tours', 'x@sites.google.com') === false);
  check('a Facebook page is not a domain anyone owns',
    domainMatches('https://facebook.com/serengetitours', 'x@facebook.com') === false);
  check('a booking.com listing is not the operator’s domain',
    domainMatches('https://booking.com/hotel/tz/x', 'x@booking.com') === false);
  check('a github.io subdomain is refused via its parent',
    isSharedHost('someone.github.io'));
  check('a vercel.app subdomain is refused via its parent',
    isSharedHost('tours.vercel.app'));

  // Different domains, however similar.
  check('a lookalike domain is not a match',
    domainMatches('https://serengeti-tours.co.tz', 'x@serengetitours.co.tz') === false);
  check('a subdomain is not treated as the parent',
    domainMatches('https://example.co.tz', 'x@mail.example.co.tz') === false);
  check('a different TLD is not a match',
    domainMatches('https://example.co.tz', 'x@example.co.ke') === false);

  // Absent or malformed input must decline, never throw.
  check('a null website declines', domainMatches(null, 'x@example.com') === false);
  check('a null email declines', domainMatches('https://example.com', null) === false);
  check('an empty string declines', domainMatches('', '') === false);
  check('a bare label is not a host', hostOf('localhost') === null);
  check('nonsense declines rather than throwing',
    domainMatches('not a url at all', 'not an email') === false);
  check('an address with no domain declines',
    domainMatches('https://example.com', 'nobody') === false);
}

async function verificationTests(admin, anonClient, makeUser, makeUnclaimedBusiness) {
  console.log('\n--- Claim verification cannot be self-awarded ---');

  const operator = await makeUser('traveler');
  const businessId = await makeUnclaimedBusiness();

  // The challenge table must be unreachable from a signed-in client, not merely
  // empty for them.
  const { data: peek, error: peekErr } = await operator.client
    .from('claim_verifications')
    .select('code_hash');
  check('a signed-in user cannot read the verification table',
    (peek ?? []).length === 0, peekErr?.code ?? `${(peek ?? []).length} rows`);

  const { data: anonPeek } = await anonClient().from('claim_verifications').select('id');
  check('an anonymous visitor cannot read it either', (anonPeek ?? []).length === 0);

  const { data: filed } = await fileClaim(operator.client, businessId, {
    claimantId: operator.id,
  });

  // The prize: verified_at is what moves a claim to the front of the queue.
  const { error: selfVerify } = await operator.client
    .from('business_claims')
    .update({ verified_at: new Date().toISOString(), verification_method: 'email' })
    .eq('id', filed.id);
  check('a claimant cannot mark their own claim verified', Boolean(selfVerify),
    selfVerify?.message?.slice(0, 60) ?? 'no error');

  const { data: after } = await admin
    .from('business_claims')
    .select('verified_at')
    .eq('id', filed.id)
    .single();
  check('the claim is still unverified after the attempt', after.verified_at === null);

  // Withdrawing must still work — the guard permits exactly that transition.
  const { error: withdrawErr } = await operator.client
    .from('business_claims')
    .update({ status: 'withdrawn' })
    .eq('id', filed.id);
  check('the guard still lets a claimant withdraw', !withdrawErr,
    withdrawErr?.message?.slice(0, 50) ?? '');

  // An admin setting it is the supported path.
  const reviewer = await makeUser('admin');
  const { error: adminVerify } = await reviewer.client
    .from('business_claims')
    .update({ verified_at: new Date().toISOString(), verification_method: 'manual' })
    .eq('id', filed.id);
  check('an admin may record a verification', !adminVerify,
    adminVerify?.message?.slice(0, 50) ?? '');
}

async function main() {
  honeypotTests();
  domainMatchTests();
  await verificationTests(admin, anonClient, makeUser, makeUnclaimedBusiness);

  console.log('\n--- Filing a claim ---');

  const operator = await makeUser('traveler');
  const businessId = await makeUnclaimedBusiness();

  const { data: filed, error: fileErr } = await fileClaim(operator.client, businessId, {
    claimantId: operator.id,
  });
  check('a signed-in user can claim an unclaimed listing', !fileErr && Boolean(filed?.id),
    fileErr?.message ?? '');

  const { error: dupErr } = await fileClaim(operator.client, businessId, {
    claimantId: operator.id,
  });
  check('the same person cannot file two open claims on one listing', Boolean(dupErr),
    dupErr?.code ?? 'no error');

  // Filing as somebody else would let an attacker generate claims that, once
  // approved, hand the listing to an account they control.
  const other = await makeUser('traveler');
  const { error: spoofErr } = await fileClaim(operator.client, businessId, {
    claimantId: other.id,
  });
  check('a claim cannot be filed on behalf of another account', Boolean(spoofErr),
    spoofErr?.code ?? 'no error');

  const ownedBusinessOwner = await makeUser('business_owner');
  const { data: owned } = await admin
    .from('businesses')
    .insert({
      owner_id: ownedBusinessOwner.id,
      name: `Claim Probe Owned ${crypto.randomUUID().slice(0, 6)}`,
      slug: `claim-probe-owned-${crypto.randomUUID().slice(0, 8)}`,
      status: 'approved',
    })
    .select('id')
    .single();
  createdBusinesses.push(owned.id);

  const { error: takenErr } = await fileClaim(other.client, owned.id, { claimantId: other.id });
  check('an already-owned listing cannot be claimed', Boolean(takenErr),
    takenErr?.code ?? 'no error');

  console.log('\n--- Only an admin decides ---');

  const { error: selfApproveErr } = await operator.client
    .from('business_claims')
    .update({ status: 'approved' })
    .eq('id', filed.id);
  check('a claimant cannot approve their own claim', Boolean(selfApproveErr),
    selfApproveErr?.message?.slice(0, 60) ?? 'no error');

  const { data: stillPending } = await admin
    .from('business_claims')
    .select('status')
    .eq('id', filed.id)
    .single();
  check('the claim is still pending after the attempt', stillPending.status === 'pending',
    stillPending.status);

  const { data: stillUnowned } = await admin
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();
  check('the listing still has no owner', stillUnowned.owner_id === null);

  const { error: strangerErr } = await other.client
    .from('business_claims')
    .update({ status: 'approved' })
    .eq('id', filed.id);
  // RLS scopes the update to the caller's own rows, so a stranger matches
  // nothing. Either an error or an untouched row is a pass; a transfer is not.
  const { data: afterStranger } = await admin
    .from('business_claims')
    .select('status')
    .eq('id', filed.id)
    .single();
  check('a stranger cannot approve someone else\'s claim',
    Boolean(strangerErr) || afterStranger.status === 'pending', afterStranger.status);

  console.log('\n--- Claims are not public ---');

  const { data: strangerSees } = await other.client
    .from('business_claims')
    .select('id')
    .eq('id', filed.id);
  check('a stranger cannot read another person\'s claim', (strangerSees ?? []).length === 0);

  const { data: anonSees } = await anonClient().from('business_claims').select('id');
  check('an anonymous visitor cannot read any claim', (anonSees ?? []).length === 0);

  const { data: ownSees } = await operator.client
    .from('business_claims')
    .select('id')
    .eq('id', filed.id);
  check('a claimant can read their own claim', (ownSees ?? []).length === 1);

  console.log('\n--- Withdrawal ---');

  const secondBusiness = await makeUnclaimedBusiness();
  const { data: toWithdraw } = await fileClaim(other.client, secondBusiness, {
    claimantId: other.id,
  });
  await other.client
    .from('business_claims')
    .update({ status: 'withdrawn' })
    .eq('id', toWithdraw.id);

  const { data: withdrawn } = await admin
    .from('business_claims')
    .select('status')
    .eq('id', toWithdraw.id)
    .single();
  check('a claimant may withdraw their own claim', withdrawn.status === 'withdrawn',
    withdrawn.status);

  console.log('\n--- Approval transfers the listing ---');

  const reviewer = await makeUser('admin');

  // A competing claim on the same listing, to prove it is closed out.
  const rival = await makeUser('traveler');
  const { data: rivalClaim } = await fileClaim(rival.client, businessId, {
    claimantId: rival.id,
  });

  const { error: approveErr } = await reviewer.client
    .from('business_claims')
    .update({
      status: 'approved',
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', filed.id);
  check('an admin can approve a claim', !approveErr, approveErr?.message ?? '');

  const { data: transferred } = await admin
    .from('businesses')
    .select('owner_id, claimed_at')
    .eq('id', businessId)
    .single();
  check('the listing now belongs to the claimant', transferred.owner_id === operator.id);
  check('claimed_at was stamped', Boolean(transferred.claimed_at));

  const { data: promoted } = await admin
    .from('profiles')
    .select('role')
    .eq('id', operator.id)
    .single();
  check('the claimant was promoted to business_owner', promoted.role === 'business_owner',
    promoted.role);

  const { data: rivalAfter } = await admin
    .from('business_claims')
    .select('status')
    .eq('id', rivalClaim.id)
    .single();
  check('the competing claim was closed out', rivalAfter.status === 'rejected',
    rivalAfter.status);

  console.log('\n--- The new owner has what they were given ---');

  const { data: ownerSees } = await operator.client
    .from('businesses')
    .update({ city: 'Arusha' })
    .eq('id', businessId)
    .select('id');
  check('the new owner can edit the listing', (ownerSees ?? []).length === 1);

  const { data: rivalEdit } = await rival.client
    .from('businesses')
    .update({ city: 'Nowhere' })
    .eq('id', businessId)
    .select('id');
  check('the rejected claimant cannot edit it', (rivalEdit ?? []).length === 0);
}

async function cleanup() {
  const client = await pool.connect();
  try {
    if (createdBusinesses.length) {
      await client.query('delete from businesses where id = any($1::uuid[])', [createdBusinesses]);
    }
    for (const id of createdUsers) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    console.log(
      `\n  cleaned up ${createdBusinesses.length} businesses, ${createdUsers.length} accounts`,
    );
  } finally {
    client.release();
  }
}

/**
 * Clears fixtures a previous run left behind.
 *
 * Cleanup lives in a `finally`, which does not run when the process dies — a
 * dropped database connection is enough. Eight claim-probe listings from crashed
 * runs were found sitting in the production directory, invisible on the site
 * only because they had no description for hasContent() to accept.
 *
 * Sweeping before creating, rather than trusting teardown, is the same shape as
 * the directory fixtures in verify.mjs and for the same reason.
 */
async function sweepStaleFixtures() {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      "delete from businesses where slug like 'claim-probe%'",
    );
    const { rows } = await client.query(
      "select id from profiles where email like 'claim-probe-%@example.com'",
    );
    for (const row of rows) {
      await admin.auth.admin.deleteUser(row.id).catch(() => {});
    }
    if (rowCount || rows.length) {
      console.log(`  swept ${rowCount} stale listings and ${rows.length} accounts from an earlier run`);
    }
  } finally {
    client.release();
  }
}

await sweepStaleFixtures();

try {
  await main();
} catch (err) {
  fail++;
  console.error('\nAborted:', err.message);
} finally {
  await cleanup();
  await pool.end();
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(50) + '\n');
  if (fail > 0) process.exitCode = 1;
}
