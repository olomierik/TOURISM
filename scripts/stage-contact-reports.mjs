import { pool } from './db.mjs';
import { unsubscribeUrl } from '../lib/outreach/unsubscribe.ts';
import { contactReportBody, contactReportSubject } from '../lib/outreach/contact-report.ts';
import { domainMatches } from '../lib/claims/domain-match.ts';
import { trustedWindow } from '../lib/analytics/trusted-from.ts';

/**
 * Stages contact reports as drafts. Sends nothing.
 *
 * Who gets one: an unclaimed, live listing with an email address that has
 * not asked to be left alone, that was already sent the first outreach email
 * (so it knows the listing exists), and that people opened WhatsApp to at
 * least --min times in the last 30 days. One per business per month: running
 * this twice in a month stages nothing new.
 *
 * Operators never sent the first message are left out on purpose. That
 * message carries the provenance and removal wording a first contact needs;
 * this one is written as an update and would read as a cold sales email
 * without it.
 *
 * The number is distinct people, counted only from CONTACT_CLICKS_TRUSTED_FROM
 * (lib/analytics/trusted-from.ts). Rows before that date are mostly bots: a
 * first draft of this script counted them and found 805 "taps" where the real
 * figure was 1. An operator told a number searches their WhatsApp for it, so a
 * number that is not true costs more than sending nothing. When the window
 * starts later than 30 days ago, the message names the days it really covers.
 *
 *   node scripts/stage-contact-reports.mjs --batch=report-2026-11 [--min=1] [--limit=100]
 *   node scripts/send-contact-reports.mjs  --batch=report-2026-11 --confirm
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const batch = args.batch;
const min = Math.max(1, Number(args.min ?? 1));
const limit = Math.max(1, Number(args.limit ?? 500));
const { since, days: DAYS } = trustedWindow(30);

if (!batch || !/^[\w.-]{3,40}$/.test(batch)) {
  console.error('Give a batch name: --batch=report-2026-11');
  process.exit(1);
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://exploretanzania.online';
const REPLY_TO = process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online';
const period = new Date().toISOString().slice(0, 7);

const client = await pool.connect();

try {
  await client.query('begin');

  const { rows } = await client.query(
    `with contacts as (
       select business_id, count(distinct visitor_hash)::int n
         from contact_clicks
        where created_at >= $1
        group by business_id
     )
     select b.id, b.slug, b.name, b.email, b.website, c.n,
            (select max(o.sent_at) from operator_outreach o
              where o.business_id = b.id and o.status = 'sent') as introduced_at
       from contacts c
       join businesses b on b.id = c.business_id
      where b.owner_id is null
        and b.status = 'approved'
        and b.deleted_at is null
        and b.email is not null and b.email <> ''
        and c.n >= $2
        and exists (select 1 from operator_outreach o where o.business_id = b.id and o.status = 'sent')
        and not exists (select 1 from outreach_suppressions s where s.email = b.email)
        and not exists (select 1 from operator_contact_reports r where r.business_id = b.id and r.period = $3)
      order by c.n desc, b.name
      limit $4`,
    [since.toISOString(), min, period, limit],
  );

  console.log(`  Counting WhatsApp chats since ${since.toISOString().slice(0, 10)} (${DAYS} days).`);
  if (rows.length === 0) {
    console.log(`Nothing to stage for ${period} at --min=${min}.`);
    await client.query('rollback');
  } else {
    for (const b of rows) {
      const body = contactReportBody({
        businessName: b.name,
        contacts: b.n,
        days: DAYS,
        claimUrl: `${SITE}/business/${b.slug}/claim`,
        introducedOn: b.introduced_at
          ? new Date(b.introduced_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : null,
        instantVerify: Boolean(b.website) && domainMatches(b.website, b.email),
        removalEmail: REPLY_TO,
        unsubscribeUrl: unsubscribeUrl(b.email, SITE),
      });
      await client.query(
        `insert into operator_contact_reports
           (business_id, email, period, contacts, batch, status, subject, body)
         values ($1, $2, $3, $4, $5, 'draft', $6, $7)`,
        [b.id, b.email, period, b.n, batch, contactReportSubject(b.name, b.n), body],
      );
    }
    await client.query('commit');

    const total = rows.reduce((s, r) => s + r.n, 0);
    console.log(`\n  Staged ${rows.length} reports for ${period} in batch "${batch}" (${total} contacts between them).`);
    console.log(`  Largest: ${rows.slice(0, 5).map((r) => `${r.name} (${r.n})`).join(', ')}`);
    console.log(`\n  Nothing has been sent. To send:`);
    console.log(`    node scripts/send-contact-reports.mjs --batch=${batch}            (dry run)`);
    console.log(`    node scripts/send-contact-reports.mjs --batch=${batch} --confirm\n`);

    const { rows: sample } = await client.query(
      `select email, subject, body from operator_contact_reports where batch = $1 order by contacts desc limit 1`,
      [batch],
    );
    console.log('  ---- first draft, in full ----\n');
    console.log(`  To: ${sample[0].email}\n  Subject: ${sample[0].subject}\n`);
    console.log(sample[0].body.split('\n').map((l) => `  ${l}`).join('\n'));
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
