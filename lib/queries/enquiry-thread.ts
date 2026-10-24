import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ThreadMessage } from '@/lib/leads/messages';
import { toQuote, type LeadQuote } from '@/lib/leads/quote-types';

export type EnquiryThreads = {
  reference: string;
  fullName: string;
  createdAt: string;
  travelStart: string | null;
  travelEnd: string | null;
  adults: number | null;
  children: number | null;
  /** Echoed back for the reply forms, only when the page was opened with it. */
  token?: string;
  threads: Array<{
    id: string;
    status: string;
    /** The review invitation key, only once the operator marked it won. */
    reviewToken: string | null;
    business: { name: string; slug: string; ratingAvg: number; ratingCount: number; isVerified: boolean };
    quote: LeadQuote | null;
    messages: ThreadMessage[];
  }>;
};

/**
 * An enquiry's conversations, for the traveller who sent it.
 *
 * Opened either signed in as the enquiry's owner, or from an emailed link that
 * carries the enquiry's access token. Anyone else gets null, and the page
 * shows "not found" rather than confirming the reference exists.
 */
export async function getEnquiryThreads(
  reference: string,
  token: string | undefined,
): Promise<EnquiryThreads | null> {
  if (!/^ET-\d{4}-\d{6}$/.test(reference)) return null;
  const admin = createAdminClient();

  const { data: lead } = await admin
    .from('leads')
    .select('id, reference, full_name, created_at, travel_start, travel_end, adults, children, traveler_id, access_token')
    .eq('reference', reference)
    .maybeSingle();
  if (!lead) return null;

  let allowed = Boolean(token) && token === lead.access_token;
  if (!allowed && lead.traveler_id) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    allowed = user?.id === lead.traveler_id;
  }
  if (!allowed) return null;

  const { data: rows } = await admin
    .from('lead_businesses')
    .select(
      `id, status, rank, review_token,
       businesses!inner (name, slug, rating_avg, rating_count, is_verified),
       lead_messages (id, sender, body, created_at, read_at),
       lead_quotes (total_amount, currency, price_basis, duration_days, valid_until, includes, excludes, notes, updated_at)`,
    )
    .eq('lead_id', lead.id)
    .order('rank', { ascending: true });

  return {
    reference: lead.reference,
    fullName: lead.full_name,
    createdAt: lead.created_at,
    travelStart: lead.travel_start,
    travelEnd: lead.travel_end,
    adults: lead.adults,
    children: lead.children,
    token: token && token === lead.access_token ? token : undefined,
    threads: (rows ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      reviewToken: r.status === 'won' ? r.review_token : null,
      business: (() => {
        const b = r.businesses as {
          name: string;
          slug: string;
          rating_avg: number | string | null;
          rating_count: number | null;
          is_verified: boolean;
        };
        return {
          name: b.name,
          slug: b.slug,
          ratingAvg: Number(b.rating_avg ?? 0),
          ratingCount: b.rating_count ?? 0,
          isVerified: b.is_verified,
        };
      })(),
      quote: toQuote((r as { lead_quotes?: unknown }).lead_quotes),
      messages: [...(r.lead_messages ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => ({
          id: m.id,
          sender: m.sender as ThreadMessage['sender'],
          body: m.body,
          createdAt: m.created_at,
          readAt: m.read_at,
        })),
    })),
  };
}
