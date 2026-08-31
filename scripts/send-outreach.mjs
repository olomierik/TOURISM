import { pool } from './db.mjs';
import { unsubscribeUrl } from '../lib/outreach/unsubscribe.ts';

/**
 * Sends a staged batch. The only script here that talks to the outside world.
 *
 * Everything about it is built to be hard to run by accident and impossible to
 * run twice:
 *
 *   * Requires an explicit --batch and an explicit --confirm.
 *   * Refuses outright if the mailer is the console fallback. lib/notifications
 *     returns ok:true with no API key, which is right for leads and would be a
 *     catastrophe here: 400 rows marked sent, nothing delivered, and a unique
 *     index that means nobody can ever be contacted again.
 *   * Re-checks each row at send time — suppressed, already claimed, already
 *     sent — because a batch staged this morning describes a world that has
 *     since moved.
 *   * Paces itself. A new domain firing 400 messages in a minute lands in spam
 *     and takes the domain's reputation with it.
 *
 *   node scripts/send-outreach.mjs --batch=2026-08-a --confirm
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const batch = args.batch;
if (!batch) {
  console.error('Which batch? --batch=2026-08-a');
  process.exit(1);
}

const GAP_MS = Number(args.gap ?? 4000);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.exploretanzania.online';

const apiKey = process.env.RESEND_API_KEY;

// Its own From, falling back to the transactional one. Cold outreach and lead
// notifications carry opposite risks — complaints on the first must not quietly
// take the second down with them, and the second is the revenue path.
const from = process.env.OUTREACH_FROM || process.env.EMAIL_FROM;
const replyTo = process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online';

// The refusal that matters. Without it a dry run silently burns the list.
if (!apiKey || !from) {
  console.error(
    '\n  Refusing to run: RESEND_API_KEY and EMAIL_FROM are not both set.\n\n' +
      '  Without them the console provider would accept every message and report\n' +
      '  success. 400 operators would be marked contacted and none would be, and\n' +
      '  the one-send-per-business index means there is no second chance.\n',
  );
  process.exit(1);
}

const client = await pool.connect();
const { rows: pending } = await client.query(
  `select o.id, o.email, o.subject, o.body, b.name, b.owner_id
     from operator_outreach o
     join businesses b on b.id = o.business_id
    where o.batch = $1 and o.status in ('draft', 'queued')
    order by o.created_at`,
  [batch],
);

if (pending.length === 0) {
  console.log(`Nothing pending in batch "${batch}".`);
  client.release();
  await pool.end();
  process.exit(0);
}

console.log(`\n  Batch "${batch}": ${pending.length} messages ready.`);
console.log(`  From: ${from}   Reply-to: ${replyTo}`);
console.log(`  Pacing: one every ${GAP_MS / 1000}s (~${Math.ceil((pending.length * GAP_MS) / 60000)} min)\n`);

if (args.confirm !== 'true') {
  console.log('  Dry run. Nothing sent. Add --confirm to actually send.\n');
  client.release();
  await pool.end();
  process.exit(0);
}

let sent = 0;
let skipped = 0;
let failed = 0;

for (const row of pending) {
  // The world may have moved since staging.
  const { rows: check } = await client.query(
    `select
       (select count(*) from outreach_suppressions where email = $1) as suppressed,
       (select owner_id from businesses b join operator_outreach o on o.business_id = b.id
         where o.id = $2) as owner_id,
       (select status from operator_outreach where id = $2) as status`,
    [row.email, row.id],
  );
  const now = check[0];

  if (+now.suppressed > 0 || now.owner_id || now.status === 'sent') {
    await client.query(
      `update operator_outreach set status = 'skipped',
         error = $2 where id = $1`,
      [row.id, +now.suppressed > 0 ? 'suppressed' : now.owner_id ? 'claimed first' : 'already sent'],
    );
    skipped += 1;
    process.stdout.write('  skip ');
    continue;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [row.email],
        reply_to: replyTo,
        subject: row.subject,
        text: row.body,
        // Gmail's bulk-sender rules want a machine-readable way out, and its
        // absence is a spam signal on every message however the body is
        // worded. The mailto is the fallback for clients that will not POST.
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl(row.email, SITE_URL)}>, <mailto:${replyTo}?subject=remove>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      await client.query(
        `update operator_outreach set status = 'failed', provider = 'resend',
           error = $2 where id = $1`,
        [row.id, `${res.status}: ${payload?.message ?? 'unknown'}`.slice(0, 300)],
      );
      failed += 1;
      process.stdout.write('  FAIL ');
    } else {
      await client.query(
        `update operator_outreach set status = 'sent', provider = 'resend',
           provider_ref = $2, sent_at = now(), error = null where id = $1`,
        [row.id, payload?.id ?? null],
      );
      sent += 1;
      process.stdout.write('  sent ');
    }
  } catch (err) {
    await client.query(
      `update operator_outreach set status = 'failed', provider = 'resend',
         error = $2 where id = $1`,
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
