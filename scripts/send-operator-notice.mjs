import { pool } from './db.mjs';

/**
 * Tells every operator with a claimed listing about the operator terms and the
 * 10% rate markup. One email per account, however many listings it owns.
 *
 * Why now: the markup has applied since 15 November 2026 (PR #127, merged 03:31 UTC) and lead
 * billing is built but off. Operators are owed both facts, in writing, before
 * anything costs them money, and the operator terms promise 14 days' email
 * notice before enquiries are charged. This is the email that starts that
 * clock; it says nothing is charged yet, and the terms say the same.
 *
 * It goes to the account email, the person who signed in and claimed the
 * listing, not the listing's public contact address.
 *
 * The same safety rules as the outreach scripts:
 *
 *   * A dry run unless --confirm. The dry run prints every recipient count and
 *     the first message in full.
 *   * Refuses to send without RESEND_API_KEY and a From address.
 *   * Records each send in audit_logs ('operator.terms_notice_sent', entity =
 *     the account), and skips accounts already recorded, so a second run after
 *     a failure sends only what is missing.
 *   * Paces itself (--gap, default 3s).
 *
 *   node scripts/send-operator-notice.mjs            (dry run)
 *   node scripts/send-operator-notice.mjs --confirm
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const ACTION = 'operator.terms_notice_sent';
const GAP_MS = Number(args.gap ?? 3000);
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://exploretanzania.online').replace(/\/$/, '');
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const replyTo = process.env.OUTREACH_REPLY_TO ?? 'hello@exploretanzania.online';

const SUBJECT = 'How your rates are shown on Explore Tanzania, and our operator terms';

/** Plain text, like every other email this site sends to operators. */
function noticeBody({ listings }) {
  const priced = listings.filter((l) => l.priced);
  const names = listings.map((l) => l.name);
  const who =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  const where =
    priced.length < listings.length
      ? priced.map((l) => l.name).join(', ')
      : listings.length === 1
        ? 'your listing'
        : 'your listings';
  const markup = priced.length
    ? `Since 15 November, the rates you publish on ${where} — day rates, packages and offers — are shown to travellers with 10% added. Your dashboard still shows the rate you entered.`
    : `When you publish rates — day rates, packages or offers — travellers see them with 10% added. Your dashboard always shows the rate you entered.`;

  return [
    `Hello,`,
    ``,
    `You manage ${who} on Explore Tanzania. We have published terms for operators, and two things in them matter to you:`,
    ``,
    `  ${SITE}/operator-terms`,
    ``,
    `1. Your rates are shown with 10% added`,
    ``,
    markup,
    ``,
    `When a trip sells at the price shown, the difference is yours. We do not invoice it, collect it or take a share of it. It is meant as a marketing budget for your business, on Explore Tanzania if you choose, but nothing obliges you to spend it with us. Please do not charge a traveller more than the price shown on the site for the same trip; you can always charge less.`,
    ``,
    `If you would rather show your rates exactly as you enter them, tick "Show my rates exactly as I enter them" here:`,
    ``,
    `  ${SITE}/dashboard/credit`,
    ``,
    `2. Enquiries will be paid for later — not yet`,
    ``,
    `Today every enquiry is free and reaches you with the traveller's contact details. That does not change with this email.`,
    ``,
    `When paid enquiries start, you will see each trip before deciding, with its price shown. The price is a percentage you choose (between 1% and 10%, 2% if you do nothing) of the trip's estimated value, never less than $5 or more than $120. Declining costs nothing, and you pay only for the enquiries you accept, from prepaid credit. We will email you at least 14 days before it starts.`,
    ``,
    `Questions, or anything in the terms you think is unfair: reply to this email. We read every reply.`,
    ``,
    `— Explore Tanzania`,
    `${SITE}`,
  ].join('\n');
}

const client = await pool.connect();

try {
  const { rows } = await client.query(
    `select u.id as owner_id, u.email, b.id, b.name,
            (b.day_rate_low is not null or b.day_rate_high is not null
              or exists (select 1 from packages p where p.business_id = b.id and p.price_from is not null)
              or exists (select 1 from business_services s where s.business_id = b.id and s.price_from is not null)
              or exists (select 1 from deals d where d.business_id = b.id)) as priced,
            exists (select 1 from audit_logs a
                     where a.action = $1 and a.entity_type = 'user' and a.entity_id = u.id) as already
       from businesses b
       join auth.users u on u.id = b.owner_id
      where b.deleted_at is null
        and u.email is not null and u.email <> ''
      order by u.email, b.name`,
    [ACTION],
  );

  /** One email per account. */
  const byOwner = new Map();
  for (const r of rows) {
    const o = byOwner.get(r.owner_id) ?? { ownerId: r.owner_id, email: r.email, already: r.already, listings: [] };
    o.listings.push({ id: r.id, name: r.name, priced: r.priced });
    byOwner.set(r.owner_id, o);
  }
  const owners = [...byOwner.values()];
  const pending = owners.filter((o) => !o.already);

  console.log(`\n  ${owners.length} accounts own claimed listings; ${owners.length - pending.length} already told; ${pending.length} to send.`);
  console.log(`  ${pending.filter((o) => o.listings.some((l) => l.priced)).length} of them have published rates the markup applies to.`);
  console.log(`  From: ${from ?? '(not set)'}   Reply-to: ${replyTo}   Subject: ${SUBJECT}`);

  if (pending.length === 0) {
    console.log('\n  Nothing to send.\n');
  } else {
    const sample = pending.find((o) => o.listings.some((l) => l.priced)) ?? pending[0];
    console.log(`\n  ---- one message in full (to an account with ${sample.listings.length} listing${sample.listings.length === 1 ? '' : 's'}) ----\n`);
    console.log(noticeBody(sample).split('\n').map((l) => `  ${l}`).join('\n'));

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
            body: JSON.stringify({ from, to: [o.email], reply_to: replyTo, subject: SUBJECT, text: noticeBody(o) }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(`${res.status}: ${payload?.message ?? 'unknown'}`);
          await client.query(
            `insert into audit_logs (actor_id, action, entity_type, entity_id, after)
             values (null, $1, 'user', $2, $3)`,
            [ACTION, o.ownerId, JSON.stringify({ provider_ref: payload?.id ?? null, listings: o.listings.map((l) => l.id) })],
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
  }
} finally {
  client.release();
  await pool.end();
}
