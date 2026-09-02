'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

/**
 * Approves or rejects one comment or traveller photograph.
 *
 * Reached through the signed-in admin's own client, not the service key. The
 * RLS policies in 055 grant an admin everything on both tables, so the check
 * that matters happens in the database — and a bug here that forgot to test the
 * caller's role would fail closed rather than moderating on behalf of whoever
 * asked.
 */
export async function moderateEngagement(
  kind: 'comment' | 'photo',
  id: string,
  status: 'published' | 'rejected',
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const table = kind === 'comment' ? 'business_comments' : 'traveler_photos';

  const { error } = await supabase
    .from(table)
    .update({ status, moderated_by: user.id, moderated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error(`[moderation] ${kind} ${id} -> ${status} failed`, error.message);
    return { ok: false };
  }

  // The counters in 055 move on this update, so the listing and every card
  // showing it are now stale.
  revalidatePath('/', 'layout');
  return { ok: true };
}
