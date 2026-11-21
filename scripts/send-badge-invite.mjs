import { pool } from './db.mjs';

/**
 * The badge invitation (SEO brief T12; text from docs/outreach/badge-email.md,
 * English only until the Swahili version has had a native read).
 *
 * One email per account that owns at least one approved, claimed listing:
 * the badge code is on their dashboard, so only they can install it. A
 * listing that is not live gets nothing; a badge linking to a page that is not
 * public helps nobody.
 *
 * Same rules as send-operator-notice.mjs: a dry run unless --confirm, refuses
 * without a mailer, records each send in audit_logs
 * ('operator.badge_invite_sent', entity = the account) and skips anyone
 * already recorded, paces itself.
 *
 *   node scripts/send-badge-invite.mjs            (dry run: count and one message)
 *   node scripts/send-badge-invite.mjs --confirm
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const ACTION = 'operator.badge_invite_sent';
const GAP_MS = Number(args.gap ?? 3000);
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://exploretanzania.online').replace(/\/$/, '');
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const replyTo = process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online';

const SUBJECT = 'A free badge for your website, linking to your ExploreTanzania.online listing';

function body({ listings }) {
  const links = listings.map((l) => `  ${l.name}: ${SITE}/business/${l.slug}`).join('\n');
  const verified = listings.some((l) => l.verified);
  return [
    `Hello,`,
    ``,
    listings.length === 1 ? `Your listing on ExploreTanzania.online is live:` : `Your listings on ExploreTanzania.online are live:`,
    ``,
    links,
    ``,
    `There is now a small badge you can add to your own website. It links your visitors to your listing, where they can read your reviews and send you an enquiry.${verified ? ' Because we have verified your business, it says "Verified on ExploreTanzania.online".' : ' Once we have verified your business, it will say "Verified on ExploreTanzania.online".'} Once you have three reviews, it shows your rating too.`,
    ``,
    `To add it, open your dashboard, copy the code under "Add your badge to your website", and paste it into your site's footer or "About" page. There is a light version and a dark version:`,
    ``,
    `  ${SITE}/dashboard`,
    ``,
    `Your dashboard also shows how many times the badge has been seen, and on which sites.`,
    ``,
    `It is free, and you can remove it whenever you like.`,
    ``,
    `If you have any questions, just reply to this email.`,
    ``,
    `Erick`,
    `ExploreTanzania.online`,
  ].join('\n');
}

const client = await pool.connect();
try {
  const { rows } = await client.query(
    `select u.id as owner_id, u.email, b.name, b.slug, b.is_verified as verified,
            exists (select 1 from audit_logs a where a.action = $1 and a.entity_type = 'user' and a.entity_id = u.id) as already
       from businesses b
       join auth.users u on u.id = b.owner_id
      where b.status = 'approved' and b.deleted_at is null
        and u.email is not null and u.email <> ''
      order by u.email, b.name`,
    [ACTION],
  );
  const byOwner = new Map();
  for (const r of rows) {
    const o = byOwner.get(r.owner_id) ?? { ownerId: r.owner_id, email: r.email, already: r.already, listings: [] };
    o.listings.push({ name: r.name, slug: r.slug, verified: r.verified });
    byOwner.set(r.owner_id, o);
  }
  const owners = [...byOwner.values()];
  const pending = owners.filter((o) => !o.already);

  console.log(`\n  ${owners.length} accounts own approved, claimed listings; ${owners.length - pending.length} already invited; ${pending.length} to send.`);
  console.log(`  ${pending.filter((o) => o.listings.some((l) => l.verified)).length} of them have a verified listing.`);
  console.log(`  From: ${from ?? '(not set)'}   Reply-to: ${replyTo}\n  Subject: ${SUBJECT}`);

  if (pending.length) {
    const sample = pending[0];
    console.log(`\n  ---- one message in full ----\n`);
    console.log(body(sample).split('\n').map((l) => `  ${l}`).join('\n'));
  }

  if (args.confirm !== 'true') {
    console.log('\n  Dry run. Nothing sent. Add --confirm to send.\n');
  } else if (!apiKey || !from) {
    console.error('\n  Refusing to send: RESEND_API_KEY and EMAIL_FROM are not both set.\n');
    process.exitCode = 1;
  } else {
    let sent = 0;
    let failed = 0;
    for (const o of pending) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [o.email], reply_to: replyTo, subject: SUBJECT, text: body(o) }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`${res.status}: ${payload?.message ?? 'unknown'}`);
        await client.query(
          `insert into audit_logs (actor_id, action, entity_type, entity_id, after) values (null, $1, 'user', $2, $3)`,
          [ACTION, o.ownerId, JSON.stringify({ provider_ref: payload?.id ?? null, listings: o.listings.map((l) => l.slug) })],
        );
        sent += 1;
        process.stdout.write('  sent ');
      } catch (err) {
        failed += 1;
        console.error(`\n  FAIL ${o.email}: ${String(err.message).slice(0, 200)}`);
      }
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
    console.log(`\n\n  sent ${sent} | failed ${failed}. Run again to retry failures; sent accounts are skipped.\n`);
  }
} finally {
  client.release();
  await pool.end();
}
