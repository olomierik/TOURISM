import type { Metadata } from 'next';

import type { Locale } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import {
  OutreachReview,
  type OutreachBatch,
  type OutreachSample,
} from '@/components/admin/outreach-review';

type Params = { locale: Locale };

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Operator outreach', robots: { index: false, follow: false } };
}

/**
 * Reviewing what is about to be sent to several hundred real businesses.
 *
 * Read through the cookie-bound client so RLS applies: operator_outreach is
 * admin-only, and that table holds contact addresses for 400+ operators in one
 * place, which is a more attractive object than any single listing.
 *
 * Deliberately not translated. It is an internal console with one user, and four
 * locales of copy for it would be four times the surface for no reader.
 */
export default async function AdminOutreachPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('operator_outreach')
    .select('id, batch, status, email, subject, body, created_at, businesses!inner (name)')
    .order('created_at', { ascending: false });

  const all = rows ?? [];

  const byBatch = new Map<string, OutreachBatch>();
  for (const r of all) {
    const b = byBatch.get(r.batch) ?? {
      batch: r.batch,
      draft: 0,
      queued: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
    if (r.status === 'draft') b.draft += 1;
    else if (r.status === 'queued') b.queued += 1;
    else if (r.status === 'sent') b.sent += 1;
    else if (r.status === 'failed') b.failed += 1;
    else b.skipped += 1;
    byBatch.set(r.batch, b);
  }

  // A handful of real drafts rather than one, because the message varies: the
  // provenance sentence and the verification sentence differ by register and by
  // whether the operator can confirm instantly. Reviewing one would review a
  // third of what is going out.
  const samples: OutreachSample[] = all
    .filter((r) => r.status === 'draft' || r.status === 'queued')
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      email: r.email,
      subject: r.subject,
      body: r.body,
      status: r.status,
      businessName: (r.businesses as unknown as { name: string }).name,
    }));

  const { data: suppressed } = await supabase
    .from('outreach_suppressions')
    .select('email, reason')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Operator outreach</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          1,336 listings built from public licensing records, and until someone is
          told, none of it does anything. This is where the message is read before
          it goes anywhere — staging writes drafts, approving marks them queued,
          and a separate script with an explicit flag actually sends.
        </p>
      </div>

      <OutreachReview
        batches={[...byBatch.values()]}
        samples={samples}
        suppressed={suppressed ?? []}
      />
    </div>
  );
}
