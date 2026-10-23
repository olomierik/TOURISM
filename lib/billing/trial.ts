'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type TrialState = {
  error?: 'signedOut' | 'noBusiness' | 'notLive' | 'used' | 'hasPlan' | 'generic';
  /** ISO timestamp the trial ends, once it has started. */
  endsAt?: string;
};

/** Error codes raised by start_premium_trial() (migration 061), mapped to message keys. */
const DB_ERRORS: Record<string, TrialState['error']> = {
  trial_not_eligible: 'noBusiness',
  trial_not_owner: 'noBusiness',
  trial_not_live: 'notLive',
  trial_used: 'used',
  trial_has_plan: 'hasPlan',
};

/**
 * Starts the one 30-day Premium trial for the signed-in owner's listing.
 *
 * Only ever started by the owner pressing the button: claiming a listing must
 * not enrol anybody in anything. Nothing is charged at the end — the period
 * simply expires and the listing returns to the free plan.
 *
 * The session is checked here; the write goes through the service role because
 * starting a trial changes businesses.tier, which the guard from migration 013
 * refuses from an owner's own session. The database function re-checks
 * ownership, eligibility and the one-trial rule under a row lock, so a second
 * click or a forged business id gets nothing.
 */
export async function startPremiumTrial(): Promise<TrialState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signedOut' };

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!business) return { error: 'noBusiness' };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('start_premium_trial', {
    p_business_id: business.id,
    p_owner_id: user.id,
  });

  if (error) {
    const known = DB_ERRORS[error.message];
    if (!known) console.error('[trial] start failed', error.message);
    return { error: known ?? 'generic' };
  }

  revalidatePath('/', 'layout');
  return { endsAt: String(data) };
}
