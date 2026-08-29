'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The two things an admin does to an outreach batch: approve it, or take
 * somebody off the list forever.
 *
 * Both re-check the caller's role server-side rather than trusting that the
 * admin layout kept anyone else out. A server action is a public endpoint with
 * a hard-to-guess name, and the layout is a rendering decision.
 */

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return profile?.role === 'admin' ? user : null;
}

export type OutreachActionState = { error?: string; done?: string };

/**
 * Moves a batch from draft to queued.
 *
 * Queueing is not sending — the send script is separate and still needs
 * --confirm at a terminal. This exists so that approval is a recorded decision
 * made by a named human on a page where they can read the messages, rather than
 * an implicit consequence of typing a command.
 */
export async function queueBatch(
  _prev: OutreachActionState,
  formData: FormData,
): Promise<OutreachActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'notAllowed' };

  const batch = String(formData.get('batch') ?? '').trim();
  if (!batch) return { error: 'noBatch' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('operator_outreach')
    .update({ status: 'queued', queued_at: new Date().toISOString() })
    .eq('batch', batch)
    .eq('status', 'draft')
    .select('id');

  if (error) {
    console.error('queueBatch:', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/admin/outreach');
  // The suppression trigger may have turned some of these into 'skipped' on the
  // way in, which is the correct outcome and worth reporting honestly.
  return { done: `${data?.length ?? 0} queued` };
}

/**
 * Permanent opt-out.
 *
 * Keyed on the address, so it covers every listing that shares it and survives
 * a listing being deleted and re-imported. Anything already staged for that
 * address is marked skipped in the same breath — a suppression that leaves a
 * queued message behind is not a suppression.
 */
export async function suppressAddress(
  _prev: OutreachActionState,
  formData: FormData,
): Promise<OutreachActionState> {
  const user = await requireAdmin();
  if (!user) return { error: 'notAllowed' };

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const reason = String(formData.get('reason') ?? 'requested').trim() || 'requested';
  if (!email.includes('@')) return { error: 'badEmail' };

  const admin = createAdminClient();

  const { error } = await admin
    .from('outreach_suppressions')
    .upsert({ email, reason }, { onConflict: 'email' });

  if (error) {
    console.error('suppressAddress:', error.message);
    return { error: 'generic' };
  }

  await admin
    .from('operator_outreach')
    .update({ status: 'skipped', error: 'suppressed' })
    .eq('email', email)
    .in('status', ['draft', 'queued']);

  revalidatePath('/admin/outreach');
  return { done: `${email} will not be contacted` };
}
