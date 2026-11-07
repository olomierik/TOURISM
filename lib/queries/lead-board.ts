import 'server-only';

import { unstable_cache } from 'next/cache';

import { contentLocale, type Locale } from '@/i18n/routing';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The public enquiry board: real traveller demand, with the traveller removed.
 *
 * This is the page the business sells from. An operator deciding whether to
 * claim a listing or pay for placement is deciding whether travellers are
 * actually asking, and a board of real requests answers that better than any
 * sentence about "thousands of travellers".
 *
 * It reads `leads` with the service key because anonymous visitors have no
 * policy on that table, and should not: so the anonymisation is done here, by
 * selecting only fields that cannot identify anybody. Never added to this
 * select, whatever a design asks for:
 *
 *   full_name, email, phone, whatsapp      — the traveller themselves
 *   message, destination_other             — free text, where people write
 *                                            their own names and numbers
 *   ip_address, user_agent, referrer,
 *   source_url, traveler_id, reference     — trace back to a person or session
 *
 * The travel month is shown, never the day: a named park plus an exact date
 * and a party of two is closer to identifying someone than it looks.
 */

export type PublicLead = {
  key: string;
  createdAt: string;
  destinationName: string | null;
  categoryName: string | null;
  /** 'YYYY-MM', or null when the traveller has no dates yet. */
  travelMonth: string | null;
  nights: number | null;
  adults: number;
  children: number;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string;
  interests: string[];
  quality: 'strong' | 'good' | 'basic';
  operators: number;
  replied: boolean;
};

export type LeadBoard = {
  items: PublicLead[];
  last30Days: number;
  allTime: number;
};

const BOARD_SIZE = 30;

/** The quote form's interest chips (messages: `interests`). */
const KNOWN_INTERESTS = new Set([
  'wildlife',
  'photography',
  'beach',
  'trekking',
  'culture',
  'luxury',
  'budget',
  'family',
  'honeymoon',
  'birding',
]);

async function loadBoard(locale: Locale): Promise<LeadBoard> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [rows, recent, total] = await Promise.all([
    admin
      .from('leads')
      .select(
        `id, created_at, travel_start, travel_end, adults, children,
         budget_min, budget_max, budget_currency, interests, quality_score,
         destinations (destination_translations (locale, name)),
         categories (category_translations (locale, name)),
         lead_businesses (status)`,
      )
      .neq('status', 'spam')
      .order('created_at', { ascending: false })
      .limit(BOARD_SIZE),
    admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'spam')
      .gte('created_at', since),
    admin.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'spam'),
  ]);

  if (rows.error) {
    console.error('[lead board] query failed', rows.error.message);
    return { items: [], last30Days: 0, allTime: 0 };
  }

  const pick = (list: Array<{ locale: string; name: string }> | undefined) =>
    list?.find((r) => r.locale === contentLocale(locale))?.name ??
    list?.find((r) => r.locale === 'en')?.name ??
    null;

  const items = (rows.data ?? []).map((l, i): PublicLead => {
    const nights =
      l.travel_start && l.travel_end
        ? Math.max(
            0,
            Math.round((Date.parse(l.travel_end) - Date.parse(l.travel_start)) / 86_400_000),
          )
        : null;
    return {
      // Position, not the row id: nothing on this page needs to point back
      // at a particular enquiry.
      key: `${i}-${l.created_at}`,
      createdAt: l.created_at,
      destinationName: pick(l.destinations?.destination_translations),
      categoryName: pick(l.categories?.category_translations),
      travelMonth: l.travel_start ? l.travel_start.slice(0, 7) : null,
      nights,
      adults: l.adults,
      children: l.children,
      budgetMin: l.budget_min === null ? null : Number(l.budget_min),
      budgetMax: l.budget_max === null ? null : Number(l.budget_max),
      budgetCurrency: l.budget_currency,
      // The form offers a fixed list, but the server stores whatever is
      // posted, so anything off the list is dropped rather than published.
      interests: l.interests.filter((k) => KNOWN_INTERESTS.has(k)).slice(0, 4),
      quality: l.quality_score >= 60 ? 'strong' : l.quality_score >= 35 ? 'good' : 'basic',
      operators: l.lead_businesses.length,
      replied: l.lead_businesses.some((lb) => ['responded', 'quoted', 'won'].includes(lb.status)),
    };
  });

  return { items, last30Days: recent.count ?? 0, allTime: total.count ?? 0 };
}

/** Cached for ten minutes: demand is the point, not to-the-second freshness. */
export function getLeadBoard(locale: Locale) {
  return unstable_cache(() => loadBoard(locale), ['lead-board', locale], {
    revalidate: 600,
    tags: ['lead-board'],
  })();
}
