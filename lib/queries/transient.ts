/**
 * Telling "the database is busy" apart from "that query is wrong".
 *
 * Why this exists: on 7 November 2026 both Railway and Netlify stopped being
 * able to deploy. Nothing was broken — `next build` prerenders ~3,000 pages,
 * each one firing a dozen Supabase reads, and somewhere past the thousandth
 * page the pool ran out. PostgREST started answering "Timed out acquiring
 * connection from connection pool" and "canceling statement due to statement
 * timeout", three widget queries on the destination page rethrew that as a
 * prerender error, Next retried the page three times and then ended the build.
 * Production sat four days behind main while the database itself was healthy
 * and answering an identical query by hand in 600ms.
 *
 * A listing query already knew how to survive this: `searchBusinesses` logs and
 * serves curated data. The seasonality table, the attraction list and the map
 * pins did not, so a transient timeout on a sidebar widget could — and did —
 * cost the whole deploy.
 *
 * The distinction this makes is deliberately narrow. A timeout means the
 * database declined to answer *right now* and the same query would succeed a
 * second later, so a page is better off rendering without that section than not
 * rendering at all. Anything else — a column that does not exist, a policy that
 * refuses, a malformed embed — is a fault in the code that must keep failing
 * loudly, at build time, where it is cheap to find. Widening this list to
 * "any error" would turn every schema mistake into a silently empty section
 * shipped to production, which is the failure mode scripts/check-env.mjs exists
 * to prevent.
 */
const TRANSIENT_PATTERNS = [
  // Supavisor/PostgREST could not get a connection out of the pool.
  'timed out acquiring connection',
  'connection pool',
  // Postgres hit statement_timeout and cancelled the query itself.
  'statement timeout',
  'canceling statement',
  // The REST gateway gave up waiting on Postgres.
  'upstream request timeout',
  // The pooler is full rather than slow.
  'too many connections',
  'remaining connection slots',
  // The socket died under load before any status came back.
  'fetch failed',
  'socket hang up',
  'econnreset',
  'etimedout',
];

/**
 * True when the message is the database saying "not now" rather than "no".
 */
export function isTransientDbError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => m.includes(p));
}

/**
 * Rethrows anything that is a real fault, and reports anything transient.
 *
 * Call sites read as `if (error) { if (degrade('getX', error)) return []; }` so
 * the empty value stays visible in the function that owns it rather than being
 * decided here — an empty array, an empty object and `null` are not
 * interchangeable to the components that consume them.
 */
export function degradeOnTransient(label: string, error: { message: string }): true {
  if (!isTransientDbError(error.message)) throw new Error(`${label}: ${error.message}`);
  console.warn(`${label} degraded, serving nothing for this section: ${error.message}`);
  return true;
}
