import 'server-only';

import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';

/**
 * The admin check and audit write shared by the boost and lead-forwarding
 * actions. Same contract as actions.ts: privileged writes go through the
 * cookie-bound client so RLS authorises them, and the service client is for
 * the audit trail, which no browser-reachable role may write.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') return null;

  return { supabase, admin: createAdminClient(), userId: user.id };
}

export type AdminContext = NonNullable<Awaited<ReturnType<typeof requireAdmin>>>;

export async function audit(
  ctx: AdminContext,
  entry: { action: string; entityType: string; entityId: string; before?: Json; after?: Json },
) {
  try {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
    await ctx.admin.from('audit_logs').insert({
      actor_id: ctx.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip_address: ip || null,
    });
  } catch (err) {
    console.error('[audit] write failed', entry.action, entry.entityId, err);
  }
}

/** A search-box term made safe for PostgREST's or(...) and ilike. */
export const safeTerm = (q: string) => q.replace(/[,()*%]/g, ' ').trim().slice(0, 80);

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
