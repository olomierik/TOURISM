import { pool } from './db.mjs';

/**
 * Assertions for operator-connected payments.
 *
 * Two things matter here and nothing else does.
 *
 * A checkout URL is a redirect on a page where somebody is about to enter card
 * details. If an operator can point it anywhere, a tourism directory becomes a
 * credible phishing funnel — the victim arrives from a site they were given
 * reason to trust, expecting to pay. So the host allow-list is tested against
 * the shapes an attacker would actually use, not just against a wrong domain.
 *
 * And referrals are readable by the operator they concern and by an admin, and
 * by nobody else. They are insert-only for the public, so a visitor can record
 * that they went to pay and cannot read who else did.
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

try {
  await client.query('begin');

  const business = (
    await client.query(`select id, name from businesses where deleted_at is null limit 1`)
  ).rows[0];

  const insert = async (provider, url) => {
    await client.query('savepoint s');
    try {
      await client.query(
        `insert into business_payment_methods (business_id, provider, checkout_url)
         values ($1, $2, $3)`,
        [business.id, provider, url],
      );
      await client.query('rollback to savepoint s');
      return true;
    } catch {
      await client.query('rollback to savepoint s');
      return false;
    }
  };

  console.log('\n--- A checkout link may only point at its own provider ---');

  check('a real DPO checkout is accepted',
    await insert('dpo', 'https://secure.3gdirectpay.com/payv3.php?ID=abc'));
  check('a real Flutterwave checkout is accepted',
    await insert('flutterwave', 'https://checkout.flutterwave.com/pay/erick'));
  check('a paypal.me link is accepted',
    await insert('paypal', 'https://paypal.me/ericksafaris'));

  check('an unrelated host is refused',
    !(await insert('dpo', 'https://evil.test/pay')));

  // The two shapes that actually get used, because both read as the real thing
  // to a person glancing at a link.
  check('a lookalike domain is refused',
    !(await insert('paypal', 'https://paypal.com.evil.test/pay')),
    'paypal.com.evil.test');
  check('credentials in the URL cannot disguise the host',
    !(await insert('paypal', 'https://paypal.com@evil.test/pay')),
    'the host there is evil.test');

  check('a host belonging to a different provider is refused',
    !(await insert('flutterwave', 'https://secure.3gdirectpay.com/x')));
  check('plain http is refused',
    !(await insert('stripe', 'http://buy.stripe.com/x')));
  check('a host that merely contains an allowed one is refused',
    !(await insert('stripe', 'https://notbuy.stripe.com.attacker.test/x')));

  console.log('\n--- One link per provider per operator ---');

  await client.query(
    `insert into business_payment_methods (business_id, provider, checkout_url)
     values ($1, 'dpo', 'https://secure.3gdirectpay.com/one')`,
    [business.id],
  );
  check('a second link for the same provider is refused',
    !(await insert('dpo', 'https://paynow.dpogroup.com/two')),
    'a traveller could not choose between two');

  console.log('\n--- What the tables promise ---');

  const cols = (
    await client.query(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'payment_referrals'`,
    )
  ).rows.map((r) => r.column_name);

  // The point of the design: nothing here claims a payment happened.
  check('referrals record no amount', !cols.includes('amount'));
  check('referrals record no status', !cols.includes('status'));
  check('referrals hold no IP address or visitor hash',
    !cols.some((c) => /ip|visitor|user_agent|referrer/.test(c)),
    cols.join(', '));

  const policies = (
    await client.query(
      `select tablename, policyname, cmd from pg_policies
        where schemaname = 'public'
          and tablename in ('business_payment_methods', 'payment_referrals')`,
    )
  ).rows;

  check('referrals cannot be read by the public',
    !policies.some((p) => p.tablename === 'payment_referrals' && p.cmd === 'SELECT'
      && /public/i.test(p.policyname)),
    `${policies.filter((p) => p.tablename === 'payment_referrals').length} policies`);

  check('an operator and an admin can read referrals',
    ['payment_referrals_owner_read', 'payment_referrals_admin_read'].every((n) =>
      policies.some((p) => p.policyname === n)));

  check('a traveller can read an active method, to be shown the button',
    policies.some((p) => p.policyname === 'payment_methods_public_read'));

  const rls = (
    await client.query(
      `select relname, relrowsecurity from pg_class
        where relname in ('business_payment_methods', 'payment_referrals', 'payment_provider_hosts')`,
    )
  ).rows;
  check('row level security is on for all three tables',
    rls.length === 3 && rls.every((r) => r.relrowsecurity),
    rls.map((r) => `${r.relname}=${r.relrowsecurity}`).join(' '));
} catch (err) {
  failed += 1;
  console.error(`\n  ABORTED: ${err.message}`);
} finally {
  await client.query('rollback');
  client.release();
  await pool.end();
}

console.log('\n====================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('====================================================\n');
process.exitCode = failed > 0 ? 1 : 0;
