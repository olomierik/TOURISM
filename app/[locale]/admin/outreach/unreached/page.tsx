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

/** How many rows to show at once. The list is ~640 long. */
const PER_PAGE = 50;

/**
 * Listings the claim invitation has not reached, and a way to send one.
 *
 * The outreach console next door answers "what did we send?". This answers the
 * question that actually decides whether the directory fills up: **who has not
 * heard from us, and why not.** Those are four different problems wearing one
 * label, and lumping them together is why none of them got worked:
 *
 *   never contacted  no outreach row at all — just not staged yet
 *   failed           the provider rejected it; usually a dead address
 *   bounced          it was accepted and then rejected by the recipient
 *   no address       we hold no email; email can never reach them
 *
 * The last group is the one worth separating. 2,618 approved listings, and
 * fewer than a quarter have an email address at all — no amount of sending
 * reaches the rest, and they need a phone call or a WhatsApp message instead.
 * Counting them as "not yet contacted" makes the backlog look like a sending
 * problem when it is a data problem.
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
  const filter = (first(sp.filter) ?? 'never') as UnreachedRow['state'] | 'never';
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1);
  const country = first(sp.country);

  const supabase = await createClient();

  // Every outreach row, keyed by business. The table is small — one row per
  // business ever contacted — so this is cheaper than joining it per page.
  const { data: outreach } = await supabase
    .from('operator_outreach')
    .select('business_id, status, email, error, sent_at, batch');

  const byBusiness = new Map((outreach ?? []).map((o) => [o.business_id, o]));

  // Unclaimed, approved, live. A claimed listing needs no invitation.
  let query = supabase
    .from('businesses')
    .select('id, slug, name, email, phone, whatsapp, country_code, city', { count: 'exact' })
    .eq('status', 'approved')
    .is('deleted_at', null)
    .is('owner_id', null)
    .order('name');

  if (country) query = query.eq('country_code', country.toUpperCase());

  const { data: businesses } = await query;

  const rows: UnreachedRow[] = (businesses ?? []).map((b) => {
    const o = byBusiness.get(b.id);
    const hasEmail = Boolean(b.email && b.email.trim());

    const state: UnreachedRow['state'] = !hasEmail
      ? 'no-address'
      : o?.status === 'failed'
        ? 'failed'
        : o?.status === 'bounced'
          ? 'bounced'
          : o?.status === 'sent'
            ? 'sent'
            : o
              ? 'staged'
              : 'never';

    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      email: b.email,
      phone: b.phone,
      whatsapp: b.whatsapp,
      countryCode: b.country_code,
      city: b.city,
      state,
      error: o?.error ?? null,
      batch: o?.batch ?? null,
      sentAt: o?.sent_at ?? null,
    };
  });

  const counts = {
    never: rows.filter((r) => r.state === 'never').length,
    failed: rows.filter((r) => r.state === 'failed').length,
    bounced: rows.filter((r) => r.state === 'bounced').length,
    'no-address': rows.filter((r) => r.state === 'no-address').length,
    staged: rows.filter((r) => r.state === 'staged').length,
    sent: rows.filter((r) => r.state === 'sent').length,
  };

  // When most failures share one error, the group is not "N dead addresses" —
  // it is one broken thing, N times. Today that distinction is the whole
  // story: 24 of 26 failures are "401: API key is invalid", which means the
  // sending credential is wrong and every one of those addresses is still
  // good. Without this line the page reports a contact problem and the real
  // one is a config problem.
  const failures = rows.filter((r) => r.state === 'failed' && r.error);
  const byError = new Map<string, number>();
  for (const f of failures) byError.set(f.error!, (byError.get(f.error!) ?? 0) + 1);
  const [topError, topErrorCount] = [...byError.entries()].sort((a, b) => b[1] - a[1])[0] ?? [
    null,
    0,
  ];
  const dominantError = topError && topErrorCount >= 3 ? { error: topError, count: topErrorCount } : null;

  const shown = rows.filter((r) => r.state === filter);
  const totalPages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const pageRows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
        total={shown.length}
        country={country ?? ''}
      />
    </div>
  );
}
