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

  // Batch totals need every row, and PostgREST silently caps an unpaginated
  // select at 1,000 — so a console whose whole job is to say how many messages
  // are about to go out would start under-reporting at row 1,001 without
  // erroring. Two batch and status columns per row are cheap; read them in
  // explicit pages until a short page says that was the end.
  const tallyRows: { batch: string; status: string }[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('operator_outreach')
      .select('batch, status')
      .range(page * 1000, page * 1000 + 999);
    if (error || !data?.length) break;
    tallyRows.push(...data);
    if (data.length < 1000) break;
  }

  // The drafts to actually read, newest first. A handful, not the whole table.
  const { data: rows } = await supabase
    .from('operator_outreach')
    .select('id, batch, status, email, subject, body, businesses!inner (name)')
    .in('status', ['draft', 'queued'])
    .order('created_at', { ascending: false })
    .limit(6);

  const all = rows ?? [];

  const byBatch = new Map<string, OutreachBatch>();
  for (const r of tallyRows) {
    const b = byBatch.get(r.batch) ?? {
      batch: r.batch,
      draft: 0,
      queued: 0,
      sent: 0,
      failed: 0,
      bounced: 0,
      skipped: 0,
      claimed: 0,
    };
    if (r.status === 'draft') b.draft += 1;
    else if (r.status === 'queued') b.queued += 1;
    else if (r.status === 'sent') b.sent += 1;
    else if (r.status === 'failed') b.failed += 1;
    else if (r.status === 'bounced') b.bounced += 1;
    else b.skipped += 1;
    byBatch.set(r.batch, b);
  }

  // Claim links someone used, by the batch whose message carried them.
  const { data: redeemed } = await supabase
    .from('claim_invites')
    .select('operator_outreach!inner (batch)')
    .not('used_at', 'is', null);
  for (const r of redeemed ?? []) {
    const batch = (r.operator_outreach as unknown as { batch: string }).batch;
    const b = byBatch.get(batch);
    if (b) b.claimed += 1;
  }

  // A handful of real drafts rather than one, because the message varies: the
  // provenance sentence and the verification sentence differ by register and by
  // whether the operator can confirm instantly. Reviewing one would review a
  // third of what is going out.
  const samples: OutreachSample[] = all.map((r) => ({
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Operator outreach</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          3,320 unclaimed listings, built from OpenStreetMap, Google Maps and two
          association registers — and until someone is told, none of it does
          anything. This is where the message is read before it goes anywhere:
          staging writes drafts, approving marks them queued, and a separate
          script with an explicit flag actually sends. Each draft names the
          register its address came from, so check that sentence first; it is
          the one claim in the message a recipient can verify.
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
