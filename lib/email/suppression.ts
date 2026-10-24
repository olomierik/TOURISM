import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Addresses we stop writing to (outreach_suppressions, migration 028).
 *
 * Unsubscribes and admin removals stop outreach only. A hard bounce, or the
 * provider refusing an address it has already seen bounce or complain, means
 * the mailbox is gone or will hurt every message that follows, so those stop
 * transactional mail too.
 */
export type SuppressionReason = 'bounced' | 'complaint' | 'provider-suppressed';

const STOPS_ALL_MAIL = ['bounced', 'provider-suppressed'];

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Adds an address to the list and stops anything staged for it.
 *
 * A complaint keeps whatever reason came first. A dead mailbox replaces it,
 * so an address that unsubscribed and later bounced stops transactional mail
 * too; it stays off the outreach list either way.
 */
export async function suppressEmail(email: string, reason: SuppressionReason): Promise<void> {
  const address = normaliseEmail(email);
  if (!address.includes('@')) return;
  const admin = createAdminClient();

  const { error } = await admin
    .from('outreach_suppressions')
    .upsert(
      { email: address, reason },
      { onConflict: 'email', ignoreDuplicates: !STOPS_ALL_MAIL.includes(reason) },
    );
  if (error) throw new Error(`suppress ${reason}: ${error.message}`);

  await admin
    .from('operator_outreach')
    .update({ status: 'skipped', error: reason })
    .eq('email', address)
    .in('status', ['draft', 'queued']);
}

/** Whether transactional mail to this address should be skipped. */
export async function isUndeliverable(email: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('outreach_suppressions')
    .select('reason')
    .eq('email', normaliseEmail(email))
    .maybeSingle();
  return Boolean(data && STOPS_ALL_MAIL.includes(data.reason));
}
