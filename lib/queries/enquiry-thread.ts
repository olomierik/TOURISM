import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ThreadMessage } from '@/lib/leads/messages';

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
    business: { name: string; slug: string };
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
       businesses!inner (name, slug),
       lead_messages (id, sender, body, created_at, read_at)`,
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
      business: r.businesses as { name: string; slug: string },
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
