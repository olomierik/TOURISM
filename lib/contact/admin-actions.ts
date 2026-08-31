'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

/**
 * Marks a contact message handled, or unhandled.
 *
 * Goes through the cookie-bound client so the update policy decides whether
 * this caller is an admin. Nothing here re-checks that — a second check written
 * in TypeScript would be the one that drifts, and the one that gets trusted.
 */
export async function setMessageHandled(
  messageId: string,
  handled: boolean,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from('contact_messages')
    .update({
      handled_at: handled ? new Date().toISOString() : null,
      handled_by: handled ? user.id : null,
    })
    .eq('id', messageId);

  if (error) return { ok: false };

  revalidatePath('/admin/messages');
  return { ok: true };
}
