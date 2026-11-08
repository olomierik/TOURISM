import { cache } from 'react';

import { CONTACT_CLICKS_TRUSTED_FROM } from '@/lib/analytics/visitor';
import { createClient } from '@/lib/supabase/server';

/**
 * Listing performance for the owner dashboard.
 *
 * Wrapped in cache() so the window is computed once per request. Reading the
 * clock during a component's render is flagged as impure for good reason: a
 * re-render would move the window underneath the numbers already on screen, and
 * two tiles could end up describing different periods.
 */
export const getListingAnalytics = cache(async (businessId: string) => {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 864e5);
  const sinceIso = since.toISOString();
  // Chats are read from the later of the 30-day window and the date the count
  // started meaning anything. `chatsPartial` lets the screen say so rather
  // than quietly showing a shorter period under a "last 30 days" heading.
  const chatsSince =
    CONTACT_CLICKS_TRUSTED_FROM > since ? CONTACT_CLICKS_TRUSTED_FROM : since;
  const chatsSinceIso = chatsSince.toISOString();
  const chatsPartial = chatsSince > since;

  const [{ data: views }, { data: leads }, { data: chats }] = await Promise.all([
    supabase
      .from('page_views')
      .select('created_at, referrer, visitor_hash')
      .eq('business_id', businessId)
      .gte('created_at', sinceIso),
    supabase
      .from('lead_businesses')
      .select('id, status, created_at')
      .eq('business_id', businessId)
      .gte('created_at', sinceIso),
    // WhatsApp chats started from the site (contact_clicks, migration 069):
    // one per traveller per day, recorded by /api/whatsapp before it opens
    // the chat. Owners read their own rows.
    //
    // Never earlier than CONTACT_CLICKS_TRUSTED_FROM. Before migration 073
    // this table counted any request the agent blocklist missed, which over
    // the 30 days to 8 Nov 2026 was 839 "chats" against 246 page views. Those
    // rows stay in the table as a record of what arrived; showing them to an
    // operator as people who contacted them would be telling them something
    // untrue about their own listing.
    supabase
      .from('contact_clicks')
      .select('source')
      .eq('business_id', businessId)
      .gte('created_at', chatsSinceIso),
  ]);

  const viewRows = views ?? [];
  const leadRows = leads ?? [];
  const chatRows = chats ?? [];
  const contacts = leadRows.length + chatRows.length;
  const chatSources = chatRows.reduce((m, c) => m.set(c.source, (m.get(c.source) ?? 0) + 1), new Map<string, number>());

  // Thirty buckets, pre-seeded to zero so quiet days render as gaps rather than
  // being silently dropped and compressing the chart.
  const days = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(since.getTime() + (29 - i) * 864e5);
    days.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of viewRows) {
    const key = r.created_at.slice(0, 10);
    if (days.has(key)) days.set(key, (days.get(key) ?? 0) + 1);
  }

  const referrers = [
    ...viewRows.reduce((m, v) => {
      if (!v.referrer) return m;
      try {
        const host = new URL(v.referrer).hostname.replace(/^www\./, '');
        m.set(host, (m.get(host) ?? 0) + 1);
      } catch {
        // A referrer that is not a URL tells us nothing; drop it rather than
        // rendering a broken row.
      }
      return m;
    }, new Map<string, number>()),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    views: viewRows.length,
    visitors: new Set(viewRows.map((v) => v.visitor_hash).filter(Boolean)).size,
    enquiries: leadRows.length,
    whatsappChats: chatRows.length,
    /**
     * True when the chat figures cover less than the 30 days the rest of this
     * object describes, because the count only became trustworthy partway
     * through. The screen says so; a smaller number under an unchanged
     * heading would read as a collapse in demand.
     */
    chatsPartial,
    chatsSince,
    /** Enquiries plus WhatsApp chats: every traveller who reached the operator. */
    contacts,
    chatSources: [...chatSources.entries()].sort((a, b) => b[1] - a[1]),
    // Enquiries per profile view, not contacts: a WhatsApp chat started from a
    // card in a list never viewed the profile, so contacts per view can pass
    // 100%. Null rather than zero when there is nothing to divide by: "0%"
    // reads as a measured failure, when in fact nothing has been measured.
    conversion: viewRows.length
      ? ((leadRows.length / viewRows.length) * 100).toFixed(1)
      : null,
    daily: [...days.entries()],
    referrers,
  };
});
