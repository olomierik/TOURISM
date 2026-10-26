import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

/**
 * Verification for the traveller's quote inbox.
 *
 * Everything here runs through the publishable key as the real `authenticated`
 * role, never the service key. That is the whole point: the inbox reads quotes
 * through two levels of embed — `leads` → `lead_businesses` → `lead_quotes` —
 * and the service key bypasses RLS, so a service-key probe passes whether or
 * not the traveller has any policy granting SELECT on `lead_quotes`. If that
 * policy is missing the page still renders, still typechecks, and silently
 * shows "no replies yet" on an enquiry that has been quoted — the worst
 * possible failure, because it looks like working software.
 *
 * The second concern is the cheapest-quote figure. It is picked within a single
 * currency and never converted, because a rate we chose would put a price on
 * screen that no operator quoted. A test that only ever sees one currency would
 * not notice the day someone adds a conversion, so one enquiry here is quoted
 * in two.
 *
 * All rows are created by this script and deleted at the end. It never reads,
 * modifies or re-points an existing lead.
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

let pass = 0;
let fail = 0;
const createdUsers = [];
const createdLeads = [];

const check = (label, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function makeUser(label) {
  const email = `inbox-probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Inbox Probe ${label}`, role: 'traveler' },
  });
  if (error) throw new Error(`could not create ${label}: ${error.message}`);
  createdUsers.push(data.user.id);

  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  const { error: signIn } = await client.auth.signInWithPassword({ email, password });
  if (signIn) throw new Error(`could not sign in ${label}: ${signIn.message}`);
  return { id: data.user.id, client };
}

/** One enquiry, owned by `travelerId`, with the operators and quotes described. */
async function makeLead(travelerId, { status, operators }) {
  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      traveler_id: travelerId,
      full_name: 'Inbox Probe',
      email: 'inbox-probe@example.com',
      adults: 2,
      children: 1,
      status,
    })
    .select('id, reference')
    .single();
  if (error) throw new Error(`could not create lead: ${error.message}`);
  createdLeads.push(lead.id);

  for (const op of operators) {
    const { data: lb, error: lbError } = await admin
      .from('lead_businesses')
      .insert({
        lead_id: lead.id,
        business_id: op.businessId,
        responded_at: op.responded ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (lbError) throw new Error(`could not attach operator: ${lbError.message}`);

    for (const q of op.quotes ?? []) {
      const { error: qError } = await admin
        .from('lead_quotes')
        .insert({ lead_business_id: lb.id, total_amount: q.amount, currency: q.currency });
      if (qError) throw new Error(`could not add quote: ${qError.message}`);
    }
  }
  return lead;
}

// The exact select the inbox page sends, whitespace and all.
const SELECT = `id, reference, status, adults, children, travel_start, travel_end, created_at,
       destination_other,
       destinations (destination_translations (locale, name)),
       lead_businesses (id, responded_at, lead_quotes (total_amount, currency))`;

/**
 * The page's own derivation, kept in step with
 * `app/[locale]/account/enquiries/page.tsx`. Duplicated rather than imported
 * because that file is a server component in TypeScript and this is a plain
 * node script; if the ladder there changes, change it here too.
 */
function derive(lead) {
  const sent = lead.lead_businesses ?? [];
  const quotes = sent.flatMap((lb) => lb.lead_quotes ?? []);
  const awaiting = sent.length - sent.filter((lb) => lb.responded_at).length;
  const closed = lead.status === 'closed' || lead.status === 'spam';

  const byCurrency = new Map();
  for (const q of quotes) {
    const amount = Number(q.total_amount);
    const best = byCurrency.get(q.currency);
    if (best === undefined || amount < best) byCurrency.set(q.currency, amount);
  }
  const [lowCurrency, lowAmount] = [...byCurrency.entries()][0] ?? [null, null];

  const badge = closed
    ? 'closed'
    : quotes.length > 0
      ? 'quotesIn'
      : sent.length === 0
        ? 'beingMatched'
        : awaiting > 0
          ? 'awaiting'
          : 'responding';

  return { quotes: quotes.length, awaiting, badge, lowCurrency, lowAmount, currencies: byCurrency };
}

async function main() {
  console.log('\nQuote inbox\n');

  const { data: businesses, error: bizError } = await admin
    .from('businesses')
    .select('id')
    .limit(3);
  if (bizError || !businesses?.length) throw new Error('no businesses to attach');
  const [b1, b2, b3] = businesses;

  const owner = await makeUser('owner');
  const stranger = await makeUser('stranger');

  // Quoted twice in USD and once in EUR, by three operators, one of which has
  // not replied at all.
  const quoted = await makeLead(owner.id, {
    status: 'in_progress',
    operators: [
      { businessId: b1.id, responded: true, quotes: [{ amount: 4200, currency: 'USD' }] },
      { businessId: b2.id, responded: true, quotes: [{ amount: 3150, currency: 'USD' }] },
      { businessId: b3.id, responded: true, quotes: [{ amount: 2900, currency: 'EUR' }] },
    ],
  });

  // Replied in prose, no price. This is the row that used to read "no replies
  // yet", which was false.
  const prose = await makeLead(owner.id, {
    status: 'in_progress',
    operators: [{ businessId: b1.id, responded: true }],
  });

  const waiting = await makeLead(owner.id, {
    status: 'distributed',
    operators: [
      { businessId: b1.id, responded: false },
      { businessId: b2.id, responded: false },
    ],
  });

  const unmatched = await makeLead(owner.id, { status: 'new', operators: [] });

  const shut = await makeLead(owner.id, {
    status: 'closed',
    operators: [{ businessId: b1.id, responded: true, quotes: [{ amount: 999, currency: 'USD' }] }],
  });

  // --- the read the page actually performs, as the traveller -------------
  const { data: rows, error } = await owner.client
    .from('leads')
    .select(SELECT)
    .eq('traveler_id', owner.id)
    .order('created_at', { ascending: false });

  check('the embed resolves for the traveller', !error, error?.message);
  if (error) return;
  check('the traveller sees their own five enquiries', rows.length === 5, `got ${rows.length}`);

  const byId = Object.fromEntries(rows.map((r) => [r.id, derive(r)]));

  const q = byId[quoted.id];
  check(
    'quotes are readable through the nested embed under RLS',
    q.quotes === 3,
    `read ${q.quotes} of 3 — a 0 here means no SELECT policy on lead_quotes`,
  );
  check('the lowest quote is the cheapest in its currency', q.lowAmount === 3150, `${q.lowAmount}`);
  check('nothing is converted across currencies', q.currencies.size === 2, [...q.currencies].join());
  check('a quoted enquiry reads as quoted', q.badge === 'quotesIn', q.badge);

  check('a reply with no price is not "no replies yet"', byId[prose.id].badge === 'responding');
  check('operators yet to reply are counted', byId[waiting.id].awaiting === 2);
  check('an unmatched enquiry says so', byId[unmatched.id].badge === 'beingMatched');
  check('a closed enquiry says closed, not quoted', byId[shut.id].badge === 'closed');

  // --- and nobody else's ------------------------------------------------
  const { data: theirs } = await stranger.client.from('leads').select(SELECT);
  check(
    'another traveller sees none of it',
    (theirs ?? []).length === 0,
    `leaked ${(theirs ?? []).length}`,
  );

  const { data: leakedQuotes } = await stranger.client
    .from('lead_quotes')
    .select('total_amount');
  check(
    'another traveller cannot read quotes directly either',
    (leakedQuotes ?? []).length === 0,
    `leaked ${(leakedQuotes ?? []).length}`,
  );
}

try {
  await main();
} catch (e) {
  fail++;
  console.log(`  FAIL  ${e.message}`);
} finally {
  for (const id of createdLeads) await admin.from('leads').delete().eq('id', id);
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}
