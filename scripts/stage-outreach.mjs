import { pool } from './db.mjs';
import {
  subjectFor,
  bodyFor,
  provenanceFor,
} from '../lib/outreach/message.ts';
import { domainMatches } from '../lib/claims/domain-match.ts';

/**
 * Stages outreach drafts. Sends nothing.
 *
 * Running this is safe at any time and from anywhere: every row it writes is
 * 'draft', and a draft is a row an admin can read on a page. Sending is a
 * separate script that refuses to run without an explicit batch name and an
 * explicit --confirm.
 *
 * Deliberately separate steps. The failure mode this shape prevents is the one
 * where a script that stages and sends gets run with the wrong filter at 1am and
 * 400 real businesses hear about it before anyone does.
 *
 *   node scripts/stage-outreach.mjs --batch=2026-08-a --limit=25 [--country=KE]
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const batch = args.batch;
const limit = Number(args.limit ?? 25);
const country = args.country?.toUpperCase();

if (!batch || !/^[\w.-]{3,40}$/.test(batch)) {
  console.error('Give a batch name: --batch=2026-08-a');
  process.exit(1);
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.exploretanzania.online';
const REPLY_TO = process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online';

/**
 * Which register an address came from, read out of the English description the
 * importer wrote. Same derivation the translation seeder uses: the description
 * records provenance, whereas "which import ran last" does not.
 */
function sourceOf(description = '') {
  if (/Kenya Association of Tour Operators/i.test(description)) return 'kato';
  if (/Uganda Tourism Board/i.test(description)) return 'utb';
  if (/listed on Google Maps/i.test(description)) return 'gmaps';
  return null;
}

const client = await pool.connect();

try {
  await client.query('begin');

  // Only unclaimed, approved, live listings with an address, and never one
  // already staged or sent. The NOT EXISTS is what makes re-running this safe.
  const { rows } = await client.query(
    `select b.id, b.slug, b.name, b.email, b.website, b.country_code,
            bt.description
       from businesses b
       left join business_translations bt
              on bt.business_id = b.id and bt.locale = 'en'
      where b.owner_id is null
        and b.status = 'approved'
        and b.deleted_at is null
        and b.email is not null and b.email <> ''
        and ($1::text is null or b.country_code = $1)
        and not exists (select 1 from operator_outreach o where o.business_id = b.id)
        and not exists (select 1 from outreach_suppressions s where s.email = b.email)
      order by b.country_code, b.name
      limit $2`,
    [country ?? null, limit],
  );

  if (rows.length === 0) {
    console.log('Nothing left to stage for that filter.');
    await client.query('rollback');
  } else {
    let instant = 0;

    for (const b of rows) {
      // Does this operator get the one-click route? Said in the message, so it
      // has to be true — an email promising instant confirmation to someone who
      // then meets a code prompt has spent trust for nothing.
      const instantVerify = Boolean(b.website) && domainMatches(b.website, b.email);
      if (instantVerify) instant += 1;

      const claimUrl = `${SITE}/business/${b.slug}/claim`;
      const subject = subjectFor(b.name);
      const body = bodyFor({
        businessName: b.name,
        claimUrl,
        provenance: provenanceFor(sourceOf(b.description ?? '')),
        instantVerify,
        contactEmail: b.email,
        removalEmail: REPLY_TO,
        countryCode: b.country_code,
      });

      await client.query(
        `insert into operator_outreach
           (business_id, email, source, batch, status, subject, body)
         values ($1, $2, $3, $4, 'draft', $5, $6)`,
        [b.id, b.email, sourceOf(b.description ?? '') ?? 'unknown', batch, subject, body],
      );
    }

    await client.query('commit');

    console.log(`\n  Staged ${rows.length} drafts in batch "${batch}".`);
    console.log(`  ${instant} can confirm instantly by domain; ${rows.length - instant} get a code.`);
    console.log(`\n  Nothing has been sent. Review them at ${SITE}/admin/outreach`);
    console.log(`  then: node scripts/send-outreach.mjs --batch=${batch} --confirm\n`);

    console.log('  ---- first draft, in full ----\n');
    const { rows: sample } = await client.query(
      'select subject, body, email from operator_outreach where batch = $1 order by created_at limit 1',
      [batch],
    );
    console.log(`  To: ${sample[0].email}`);
    console.log(`  Subject: ${sample[0].subject}\n`);
    console.log(
      sample[0].body
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n'),
    );
    console.log('');
  }
} catch (err) {
  await client.query('rollback');
  console.error('Staging failed, nothing written:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
