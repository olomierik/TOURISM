import 'server-only';

import { cookies } from 'next/headers';

import type { createClient } from '@/lib/supabase/server';

/**
 * Which of an operator's listings the dashboard is working on.
 *
 * An account can own more than one listing: seven did by 21 November 2026,
 * mostly an operator who created a listing and then also claimed the one the
 * register import had made for them. Every "my listing" lookup asked for
 * exactly one row, so for those seven the dashboard threw ("JSON object
 * requested, multiple rows returned") and so did saving a package, a deal, a
 * service, billing and payment methods.
 *
 * Now every one of those lookups asks this function. The operator picks a
 * listing with the switcher in the dashboard header (a cookie); without a
 * choice, the live listing published most recently is used, then the newest.
 * The id is always re-checked against the signed-in owner, so a cookie
 * pointing at somebody else's listing is ignored rather than trusted.
 */

export const ACTIVE_BUSINESS_COOKIE = 'et_active_business';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type OwnedBusiness = { id: string; name: string; status: string };

/** Every live listing the owner holds, in the default order. */
export async function listOwnedBusinesses(supabase: Supabase, userId: string): Promise<OwnedBusiness[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, status, published_at, created_at')
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listOwnedBusinesses: ${error.message}`);
  const rows = data ?? [];
  // Approved first: a draft duplicate should not be what the dashboard opens on.
  return [...rows.filter((b) => b.status === 'approved'), ...rows.filter((b) => b.status !== 'approved')].map(
    (b) => ({ id: b.id, name: b.name, status: b.status }),
  );
}

/** The id of the listing the dashboard is working on, or null if the owner has none. */
export async function activeBusinessId(supabase: Supabase, userId: string): Promise<string | null> {
  const owned = await listOwnedBusinesses(supabase, userId);
  if (!owned.length) return null;
  const chosen = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
  return owned.find((b) => b.id === chosen)?.id ?? owned[0].id;
}
