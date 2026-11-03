import type { Metadata } from 'next';

import type { Locale } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { UnreachedTable, type UnreachedRow } from '@/components/admin/unreached-table';

type Params = { locale: Locale };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Not yet reached', robots: { index: false, follow: false } };
}

/** How many rows to show at once. */
const PER_PAGE = 50;

const STATES = ['never', 'staged', 'sent', 'failed', 'bounced', 'no-address'] as const;
type State = (typeof STATES)[number];

/** Which outreach statuses read as "staged": waiting, not yet resolved. */
const STAGED_STATUSES = ['draft', 'queued', 'skipped'] as const;

const BUSINESS_FIELDS = 'id, slug, name, email, phone, whatsapp, country_code, city';
const OUTREACH_EMBED = 'operator_outreach!inner (status, error, batch, sent_at)';

/**
 * Listings the claim invitation has not reached, and a way to send one.
 *
 * The outreach console next door answers "what did we send?". This answers the
 * question that actually decides whether the directory fills up: **who has not
 * heard from us, and why not.** Those are several problems wearing one label,
 * and lumping them together is why none of them got worked:
 *
 *   never contacted  no outreach row at all — just not staged yet
 *   staged           drafted or queued, waiting for a human to send
 *   failed           the provider rejected it; usually a dead address
 *   bounced          it was accepted and then rejected by the recipient
 *   no address       we hold no email; email can never reach them
 *
 * The last group is the one worth separating, and it is the large one: of 3,320
 * unclaimed listings, 2,686 have no email address at all. No amount of sending
 * reaches them — they need a phone call or a WhatsApp message — and counting
 * them as "not yet contacted" makes a data problem look like an outbox problem.
 *
 * Every number here is counted by Postgres, and every page of rows is fetched
 * with an explicit range. Both used to be derived in JavaScript from one
 * unpaginated select, and PostgREST silently caps an unpaginated select at
 * 1,000 rows: with 3,344 listings in the table, every count on this page came
 * from the first thousand names alphabetically. That is how a backlog of 358
 * listings that had an address and no draft sat here unnoticed. A page whose
 * job is to show a backlog cannot compute its totals from a truncated list.
 *
 * Every query leads with `businesses` even where the filter is really about the
 * outreach row, because PostgREST only orders by top-level columns: ordering by
 * an embedded `businesses(name)` is accepted and then silently ignored, which
 * leaves `.range()` paging over an arbitrary order — pages that repeat rows and
 * pages that skip them. Asking the other way round keeps `name` orderable.
 *
 * Read through the cookie-bound client so RLS applies: this page puts several
 * hundred operator contact addresses on one screen, which is a more attractive
 * object than any single listing.
 *
 * Not translated, like the rest of the admin console: one user, four locales of
 * copy would be four times the surface for no reader.
 */
export default async function UnreachedPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const asked = first(sp.filter);
  const filter: State = (STATES as readonly string[]).includes(asked ?? '')
    ? (asked as State)
    : 'never';
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1);
  const countryRaw = first(sp.country) ?? '';
  // Two letters or nothing: this value reaches a query filter.
  const country = /^[A-Za-z]{2}$/.test(countryRaw) ? countryRaw.toUpperCase() : '';

  const supabase = await createClient();

  /** Unclaimed, approved, live. A claimed listing needs no invitation. */
  const unclaimed = (select: string, opts?: { count: 'exact'; head?: boolean }) => {
    const q = supabase
      .from('businesses')
      .select(select, opts)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .is('owner_id', null);
    return country ? q.eq('country_code', country) : q;
  };

  /** …and holds an address, so email is a route that exists at all. */
  const reachable = (select: string, opts?: { count: 'exact'; head?: boolean }) =>
    unclaimed(select, opts).not('email', 'is', null).neq('email', '');

  const [neverCount, noAddressCount, sentCount, failedCount, bouncedCount, stagedCount] =
    await Promise.all([
      // Anti-join: an address, and no outreach row at all. Postgres answers
      // this; the rows are never fetched in order to be counted.
      reachable('id, operator_outreach!left(business_id)', { count: 'exact', head: true })
        .is('operator_outreach', null)
        .then((r) => r.count ?? 0),
      // Checked as its own group and first: no address is not a sending
      // backlog, and folding it into "not contacted" hides a data problem
      // behind an outbox problem.
      unclaimed('id', { count: 'exact', head: true })
        .or('email.is.null,email.eq.')
        .then((r) => r.count ?? 0),
      ...(['sent', 'failed', 'bounced'] as const).map((status) =>
        reachable(`id, ${OUTREACH_EMBED}`, { count: 'exact', head: true })
          .eq('operator_outreach.status', status)
          .then((r) => r.count ?? 0),
      ),
      reachable(`id, ${OUTREACH_EMBED}`, { count: 'exact', head: true })
        .in('operator_outreach.status', STAGED_STATUSES)
        .then((r) => r.count ?? 0),
    ]);

  const counts: Record<State, number> = {
    never: neverCount,
    staged: stagedCount,
    sent: sentCount,
    failed: failedCount,
    bounced: bouncedCount,
    'no-address': noAddressCount,
  };

  // The page of rows for the selected group.
  const from = (page - 1) * PER_PAGE;
  const total = counts[filter];

  const rowQuery = () => {
    switch (filter) {
      case 'no-address':
        return unclaimed(BUSINESS_FIELDS).or('email.is.null,email.eq.');
      case 'never':
        return reachable(`${BUSINESS_FIELDS}, operator_outreach!left(business_id)`).is(
          'operator_outreach',
          null,
        );
      case 'staged':
        return reachable(`${BUSINESS_FIELDS}, ${OUTREACH_EMBED}`).in(
          'operator_outreach.status',
          STAGED_STATUSES,
        );
      default:
        return reachable(`${BUSINESS_FIELDS}, ${OUTREACH_EMBED}`).eq(
          'operator_outreach.status',
          filter,
        );
    }
  };

  const { data } = await rowQuery()
    .order('name')
    .range(from, from + PER_PAGE - 1);

  const pageRows: UnreachedRow[] = ((data ?? []) as unknown as JoinedRow[]).map((b) => {
    // An embedded to-one relation still arrives as an array.
    const o = Array.isArray(b.operator_outreach) ? b.operator_outreach[0] : b.operator_outreach;
    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      email: b.email,
      phone: b.phone,
      whatsapp: b.whatsapp,
      countryCode: b.country_code,
      city: b.city,
      state: filter,
      error: o?.error ?? null,
      batch: o?.batch ?? null,
      sentAt: o?.sent_at ?? null,
    };
  });

  // When most failures share one error, the group is not "N dead addresses" —
  // it is one broken thing, N times. That distinction has already been the
  // whole story once: 24 of 26 failures were "401: API key is invalid", which
  // means the sending credential was wrong and every one of those addresses was
  // still good. Without this line the page reports a contact problem when the
  // real one is a config problem.
  const { data: failures } = await reachable(`id, ${OUTREACH_EMBED}`)
    .eq('operator_outreach.status', 'failed')
    .limit(500);

  const byError = new Map<string, number>();
  for (const f of (failures ?? []) as unknown as JoinedRow[]) {
    const o = Array.isArray(f.operator_outreach) ? f.operator_outreach[0] : f.operator_outreach;
    if (o?.error) byError.set(o.error, (byError.get(o.error) ?? 0) + 1);
  }
  const [topError, topErrorCount] = [...byError.entries()].sort((a, b) => b[1] - a[1])[0] ?? [
    null,
    0,
  ];
  const dominantError =
    topError && topErrorCount >= 3 ? { error: topError, count: topErrorCount } : null;

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-heading-xl">Not yet reached</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Unclaimed listings, grouped by what stands between them and a claim
          invitation. &ldquo;No address&rdquo; is not a sending backlog — we hold no email
          for those, so they need a phone call or a WhatsApp message instead.
        </p>
      </div>

      <UnreachedTable
        dominantError={dominantError}
        rows={pageRows}
        counts={counts}
        filter={filter}
        page={page}
        totalPages={totalPages}
        total={total}
        country={country}
      />
    </div>
  );
}

type OutreachBit = { status: string; error: string | null; batch: string | null; sent_at: string | null };

type JoinedRow = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country_code: string | null;
  city: string | null;
  operator_outreach?: OutreachBit[] | OutreachBit | null;
};
