'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { deliverOutreach, NO_MAILER, outreachConfig } from '@/lib/outreach/deliver';
import { requireOutreachAdmin } from '@/lib/outreach/guard';
import {
  BATCH_FILTERS,
  CHUNK_SIZE,
  DAILY_CAP,
  type BatchFilter,
  type ChunkResult,
  type PlanResult,
} from '@/lib/outreach/batch-shared';

/**
 * Ninety claim invitations on one click.
 *
 * The owner's request (2026-11): sending one at a time is the bottleneck, not
 * the safeguard. So the button sends the next ninety — but the things the
 * one-at-a-time design was protecting are kept, in a different shape:
 *
 *   - **Ninety a day, enforced here.** The mail provider's free allowance is
 *     100 a day, and a young domain that sends several hundred cold messages
 *     in an afternoon lands in spam and stays there. The server counts what
 *     went out in the last 24 hours and will not exceed the cap however many
 *     times the button is pressed. OUTREACH_DAILY_CAP raises it.
 *   - **The server picks the recipients**, from the group on screen, and
 *     re-checks each one at send time exactly as a single send does.
 *   - **Small paced chunks.** The browser asks for a few at a time, so there
 *     is progress to show, a Stop that works, and no request long enough for a
 *     proxy to cut off halfway. A fault of ours (bad key, quota spent) stops
 *     the run instead of marking ninety good addresses failed.
 */

/** Resend allows two requests a second; stay clear of it. */
const GAP_MS = 650;

type Admin = ReturnType<typeof createAdminClient>;

async function sentInLastDay(admin: Admin): Promise<number> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from('operator_outreach')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', since);
  return count ?? 0;
}

export async function planOutreachBatch(filter: BatchFilter, country: string): Promise<PlanResult> {
  if (!(await requireOutreachAdmin())) return { error: 'Not authorised.' };
  if (!BATCH_FILTERS.includes(filter)) return { error: 'Nothing to send from this group.' };
  if (!outreachConfig()) return { error: NO_MAILER };
  const cc = /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : '';

  const admin = createAdminClient();
  const sentToday = await sentInLastDay(admin);
  const room = Math.max(0, DAILY_CAP - sentToday);
  if (room === 0) {
    return {
      error: `Today's ${DAILY_CAP} have already gone out. The count is over the last 24 hours, so more can be sent tomorrow.`,
    };
  }

  // Fetch more than is needed: some will be dropped below.
  const base = (select: string) => {
    const q = admin
      .from('businesses')
      .select(select)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .is('owner_id', null)
      .not('email', 'is', null)
      .neq('email', '');
    return cc ? q.eq('country_code', cc) : q;
  };
  const query =
    filter === 'never'
      ? base('id, email, operator_outreach!left(business_id)').is('operator_outreach', null)
      : base('id, email, operator_outreach!inner(status)').in(
          'operator_outreach.status',
          filter === 'staged' ? ['draft', 'queued'] : ['failed'],
        );
  const { data, error } = await query.order('name').limit(room * 2 + 20);
  if (error) {
    console.error('planOutreachBatch:', error.message);
    return { error: 'Could not read the list. Try again.' };
  }
  const candidates = (data ?? []) as unknown as { id: string; email: string }[];

  const addresses = [...new Set(candidates.map((c) => c.email.trim().toLowerCase()))];
  const { data: stopped } = addresses.length
    ? await admin.from('outreach_suppressions').select('email').in('email', addresses)
    : { data: [] };
  const suppressed = new Set((stopped ?? []).map((s) => s.email));

  // One message per address per run: the registers repeat an address across
  // listings, and three invitations arriving together read as spam.
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const c of candidates) {
    const address = c.email.trim().toLowerCase();
    if (suppressed.has(address) || seen.has(address)) continue;
    seen.add(address);
    ids.push(c.id);
    if (ids.length === room) break;
  }

  return { ids, sentToday, cap: DAILY_CAP };
}

export async function sendOutreachChunk(ids: string[]): Promise<ChunkResult> {
  const empty = { sent: 0, skipped: 0, failed: 0 };
  if (!(await requireOutreachAdmin())) return { ...empty, stop: 'Not authorised.' };
  const config = outreachConfig();
  if (!config) return { ...empty, stop: NO_MAILER };
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    return { ...empty, stop: 'Bad request.' };
  }

  const admin = createAdminClient();
  // Counted again here: the cap is a property of the server, not of a plan
  // the browser was handed a minute ago.
  let room = DAILY_CAP - (await sentInLastDay(admin));
  const batch = `bulk-${new Date().toISOString().slice(0, 10)}`;
  const tally = { ...empty };
  let stop: string | undefined;

  for (const id of ids.slice(0, CHUNK_SIZE)) {
    if (room <= 0) {
      stop = `The daily limit of ${DAILY_CAP} has been reached.`;
      break;
    }
    const result = await deliverOutreach(admin, id, config, batch);
    if (result.kind === 'sent') {
      tally.sent += 1;
      room -= 1;
    } else if (result.kind === 'skipped') {
      tally.skipped += 1;
      continue; // nothing left the building, so nothing to pace
    } else {
      tally.failed += 1;
      if (result.fatal) {
        stop = result.reason;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }

  revalidatePath('/admin/outreach/unreached');
  revalidatePath('/admin/outreach');
  return { ...tally, stop };
}
