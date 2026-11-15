import { pool } from './db.mjs';
import { unsubscribeUrl } from '../lib/outreach/unsubscribe.ts';
import {
  CLAIM_INVITE_DAYS,
  hashInviteToken,
  newInviteToken,
  withInvite,
} from '../lib/claims/invite-token.ts';

/**
 * Sends a staged batch of contact reports (scripts/stage-contact-reports.mjs).
 *
 * The same rules as scripts/send-outreach.mjs, for the same reasons:
 *
 *   * An explicit --batch, and nothing leaves without --confirm.
 *   * Refuses without a real mailer: a console fallback would mark every row
 *     sent and deliver nothing.
 *   * Re-checks each row at send time: unsubscribed since, claimed since, or
 *     already sent.
 *   * Paces itself (--gap, default 4s).
 *   * Gives each message its own single-use claim link. claim_invites rows
 *     made here carry no outreach_id; the column is nullable for that.
 *
 *   node scripts/send-contact-reports.mjs --batch=report-2026-11 [--confirm]
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const batch = args.batch;
if (!batch) {
  console.error('Which batch? --batch=report-2026-11');
  process.exit(1);
}

const GAP_MS = Number(args.gap ?? 4000);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://exploretanzania.online';
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.OUTREACH_FROM || process.env.EMAIL_FROM;
const replyTo = process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online';

const client = await pool.connect();
const { rows: pending } = await client.query(
  `select r.id, r.business_id, r.email, r.subject, r.body, r.contacts, b.name, b.slug
     from operator_contact_reports r
     join businesses b on b.id = r.business_id
    where r.batch = $1 and r.status in ('draft', 'queued')
    order by r.contacts desc, r.created_at`,
  [batch],
);

if (pending.length === 0) {
  console.log(`Nothing pending in batch "${batch}".`);
  client.release();
  await pool.end();
  process.exit(0);
}

console.log(`\n  Batch "${batch}": ${pending.length} reports ready.`);
console.log(`  From: ${from ?? '(not set)'}   Reply-to: ${replyTo}`);
console.log(`  Pacing: one every ${GAP_MS / 1000}s (~${Math.ceil((pending.length * GAP_MS) / 60000)} min)`);
for (const r of pending.slice(0, 10)) console.log(`    ${String(r.contacts).padStart(3)}  ${r.name} <${r.email}>`);
if (pending.length > 10) console.log(`    … and ${pending.length - 10} more`);

if (args.confirm !== 'true') {
  console.log('\n  Dry run. Nothing sent. Add --confirm to actually send.\n');
  client.release();
  await pool.end();
  process.exit(0);
}

if (!apiKey || !from) {
  console.error('\n  Refusing to send: RESEND_API_KEY and a From address are not both set.\n');
  client.release();
  await pool.end();
  process.exit(1);
}

let sent = 0;
let skipped = 0;
let failed = 0;

for (const row of pending) {
  const { rows: check } = await client.query(
    `select
       (select count(*) from outreach_suppressions where email = $1)::int as suppressed,
       (select owner_id from businesses where id = $2) as owner_id,
       (select status from operator_contact_reports where id = $3) as status`,
    [row.email, row.business_id, row.id],
  );
  const now = check[0];
  if (now.suppressed > 0 || now.owner_id || now.status === 'sent') {
    await client.query(`update operator_contact_reports set status = 'skipped', error = $2 where id = $1`, [
      row.id,
      now.suppressed > 0 ? 'suppressed' : now.owner_id ? 'claimed first' : 'already sent',
    ]);
    skipped += 1;
    process.stdout.write('  skip ');
    continue;
  }

  const token = newInviteToken();
  let text = withInvite(row.body, row.slug, token);
  let inviteId = null;
  if (text) {
    const { rows: made } = await client.query(
      `insert into claim_invites (business_id, outreach_id, email, token_hash, expires_at)
       values ($1, null, $2, $3, now() + make_interval(days => $4))
       returning id`,
      [row.business_id, row.email, hashInviteToken(token), CLAIM_INVITE_DAYS],
    );
    inviteId = made[0].id;
  } else {
    text = row.body;
  }
  let delivered = false;
  const dropInvite = async () => {
    if (inviteId && !delivered) await client.query('delete from claim_invites where id = $1', [inviteId]);
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [row.email],
        reply_to: replyTo,
        subject: row.subject,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl(row.email, SITE_URL)}>, <mailto:${replyTo}?subject=remove>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      await dropInvite();
      await client.query(
        `update operator_contact_reports set status = 'failed', provider = 'resend', error = $2 where id = $1`,
        [row.id, `${res.status}: ${payload?.message ?? 'unknown'}`.slice(0, 300)],
      );
      failed += 1;
      process.stdout.write('  FAIL ');
    } else {
      delivered = true;
      await client.query(
        `update operator_contact_reports set status = 'sent', provider = 'resend',
           provider_ref = $2, sent_at = now(), error = null where id = $1`,
        [row.id, payload?.id ?? null],
      );
      sent += 1;
      process.stdout.write('  sent ');
    }
  } catch (err) {
    await dropInvite();
    await client.query(
      `update operator_contact_reports set status = 'failed', provider = 'resend', error = $2 where id = $1`,
      [row.id, String(err.message).slice(0, 300)],
    );
    failed += 1;
    process.stdout.write('  FAIL ');
  }

  await new Promise((r) => setTimeout(r, GAP_MS));
}

console.log(`\n\n  sent ${sent} | skipped ${skipped} | failed ${failed}`);
console.log('  Failed rows stay retryable; skipped and sent do not.\n');

client.release();
await pool.end();
