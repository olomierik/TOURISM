import { pool } from './db.mjs';
import { bodyFor, subjectFor, provenanceFor } from '../lib/outreach/message.ts';

/**
 * Outreach assertions.
 *
 * This is the one subsystem here that reaches out and touches several hundred
 * real businesses, so the guards get proved rather than trusted. Two kinds of
 * check: the database ones, which establish that a suppression cannot be talked
 * around and that nobody can be mailed twice, and the message ones, which
 * establish that the wording still says the things that make this defensible.
 *
 * The message assertions look fussy and are the point. Every rule they encode
 * costs conversions — naming the register, offering removal before the claim
 * link, refusing to promise traffic — which is exactly why a future edit
 * optimising the funnel would quietly drop them.
 */

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const client = await pool.connect();
const FIXTURE = 'zzz-outreach-probe';

try {
  // Sweep first. Cleanup in a finally does not run when a process is killed,
  // and this suite has left rows in production once already elsewhere.
  await client.query(
    `delete from operator_outreach where business_id in
       (select id from businesses where slug like $1)`,
    [`${FIXTURE}%`],
  );
  await client.query('delete from businesses where slug like $1', [`${FIXTURE}%`]);
  await client.query('delete from outreach_suppressions where email like $1', [
    `%@${FIXTURE}.test`,
  ]);

  console.log('\n--- The message still says what makes this defensible ---');

  const body = bodyFor({
    businessName: 'Probe Safaris Ltd',
    claimUrl: 'https://www.exploretanzania.online/business/probe/claim',
    provenance: provenanceFor('kato'),
    instantVerify: true,
    countryCode: 'KE',
    contactEmail: 'info@probe.co.ke',
    removalEmail: 'hello@exploretanzania.online',
  });

  check('names the register the data came from',
    /Kenya Association of Tour Operators/.test(body));
  check('states plainly that they did not sign up',
    /did not sign up/i.test(body));
  check('disclaims any connection',
    /not claiming any connection/i.test(body));
  check('offers removal',
    /reply to this message with "remove"/i.test(body));
  check('offers removal BEFORE the claim link',
    body.indexOf('remove') < body.indexOf('/claim'),
    'a removal offer under a call to action is a dark pattern');
  check('promises no further contact after a removal request',
    /will not write to you again/i.test(body));
  check('admits traffic is small rather than promising exposure',
    /Traffic is small/i.test(body) && /not promising you bookings/i.test(body));
  check('claims no endorsement, membership or partnership',
    !/(partner|endorse|member of our|verified partner|recommended by)/i.test(body));
  check('uses no false urgency',
    !/(act now|urgent|expires|limited time|within 24 hours|immediately reply)/i.test(body));
  check('explains the Tanzania name to a Kenyan operator',
    /name is historical/i.test(body));
  check('gives a reply address for questions',
    /hello@exploretanzania\.online/.test(body));
  check('subject line makes both options visible',
    /claim or remove/i.test(subjectFor('Probe Safaris Ltd')));

  const tzBody = bodyFor({
    businessName: 'Probe Safaris Ltd',
    claimUrl: 'https://x/claim',
    provenance: provenanceFor('gmaps'),
    instantVerify: false,
    countryCode: 'TZ',
    contactEmail: 'a@b.co.tz',
    removalEmail: 'hello@exploretanzania.online',
  });
  check('does not explain the name to a Tanzanian operator',
    !/name is historical/i.test(tzBody));
  check('the no-website variant promises a code, not instant confirmation',
    /sending a short code/i.test(tzBody) && !/no code, no waiting/i.test(tzBody));
  check('a Google Maps listing is described as such',
    /Google Maps business listing/i.test(tzBody));

  console.log('\n--- A suppression cannot be talked around ---');

  const { rows: cat } = await client.query('select id from categories limit 1');
  const { rows: made } = await client.query(
    `insert into businesses (name, slug, status, country_code, city, email)
     values ('Outreach Probe', $1, 'approved', 'TZ', 'Arusha', $2)
     returning id`,
    [`${FIXTURE}-1`, `one@${FIXTURE}.test`],
  );
  const businessId = made[0].id;
  if (cat.length) {
    await client.query(
      'insert into business_categories (business_id, category_id, is_primary) values ($1,$2,true)',
      [businessId, cat[0].id],
    );
  }

  await client.query(
    `insert into operator_outreach (business_id, email, source, batch, subject, body)
     values ($1, $2, 'kato', 'probe-batch', 'subject', 'body')`,
    [businessId, `one@${FIXTURE}.test`],
  );

  // Suppress, then try to queue anyway — the trigger must intervene.
  await client.query(
    'insert into outreach_suppressions (email, reason) values ($1, $2)',
    [`one@${FIXTURE}.test`, 'probe'],
  );

  await client.query(
    `update operator_outreach set status = 'queued', queued_at = now()
      where business_id = $1`,
    [businessId],
  );

  const { rows: after } = await client.query(
    'select status, error, queued_at from operator_outreach where business_id = $1',
    [businessId],
  );
  check('queueing a suppressed address is forced to skipped',
    after[0].status === 'skipped', after[0].status);
  check('the reason is recorded', after[0].error === 'suppressed');
  check('no queued_at is left behind', after[0].queued_at === null);

  // And sending directly must fail the same way.
  await client.query(
    `update operator_outreach set status = 'sent', sent_at = now() where business_id = $1`,
    [businessId],
  );
  const { rows: after2 } = await client.query(
    'select status, sent_at from operator_outreach where business_id = $1',
    [businessId],
  );
  check('marking a suppressed address sent is refused too',
    after2[0].status === 'skipped' && after2[0].sent_at === null, after2[0].status);

  console.log('\n--- Nobody can be mailed twice about the same listing ---');

  let duplicate = null;
  try {
    await client.query(
      `insert into operator_outreach (business_id, email, source, batch, subject, body)
       values ($1, $2, 'kato', 'second-batch', 's', 'b')`,
      [businessId, `other@${FIXTURE}.test`],
    );
  } catch (err) {
    duplicate = err;
  }
  check('a second row for the same business is rejected', Boolean(duplicate),
    duplicate?.constraint ?? 'no error raised');

  console.log('\n--- Staging only ever writes drafts ---');

  const { rows: statuses } = await client.query(
    `select distinct status from operator_outreach where batch = 'probe-batch'`,
  );
  check('nothing reached sent without the send script',
    !statuses.some((r) => r.status === 'sent'));

  const { rows: shape } = await client.query(
    `select column_default from information_schema.columns
      where table_name = 'operator_outreach' and column_name = 'status'`,
  );
  check('rows are born draft', /draft/.test(shape[0]?.column_default ?? ''),
    shape[0]?.column_default ?? 'none');

  console.log('\n--- The table is not readable by ordinary users ---');

  const { rows: rls } = await client.query(
    `select relrowsecurity from pg_class where relname = 'operator_outreach'`,
  );
  check('RLS is enabled on operator_outreach', rls[0]?.relrowsecurity === true);

  const { rows: pol } = await client.query(
    `select polname, pg_get_expr(polqual, polrelid) q from pg_policy
      where polrelid = 'operator_outreach'::regclass`,
  );
  check('its only policy is admin-gated',
    pol.length > 0 && pol.every((p) => /is_admin/.test(p.q ?? '')),
    pol.map((p) => p.polname).join(', '));

  const { rows: srls } = await client.query(
    `select relrowsecurity from pg_class where relname = 'outreach_suppressions'`,
  );
  check('RLS is enabled on outreach_suppressions', srls[0]?.relrowsecurity === true);
} catch (err) {
  failed += 1;
  console.error('\n  suite error:', err.message);
} finally {
  await client.query(
    `delete from operator_outreach where business_id in
       (select id from businesses where slug like $1)`,
    [`${FIXTURE}%`],
  );
  await client.query('delete from business_categories where business_id in (select id from businesses where slug like $1)', [`${FIXTURE}%`]);
  await client.query('delete from businesses where slug like $1', [`${FIXTURE}%`]);
  await client.query('delete from outreach_suppressions where email like $1', [
    `%@${FIXTURE}.test`,
  ]);
  client.release();
  await pool.end();
}

console.log('\n==================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('==================================================\n');
process.exitCode = failed > 0 ? 1 : 0;
