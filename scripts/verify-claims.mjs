import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { pool } from './db.mjs';

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

async function main() {
  honeypotTests();

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
