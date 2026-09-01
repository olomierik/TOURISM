'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type BankTransferState = {
  error?: 'signedOut' | 'noBusiness' | 'unknownPlan' | 'freePlan' | 'generic';
};

/**
 * Starts a bank transfer for one plan.
 *
 * The plan key is all the browser sends. The price is read from the database
 * inside this function, because a price posted by the browser is a price the
 * operator chooses — the same reason the card checkout worked this way.
 *
 * An operator who clicks twice gets the same reference rather than a second
 * pending payment. Two references for one intended transfer is how an admin
 * ends up looking at a statement line that matches neither.
 */
export async function startBankTransfer(
  _prev: BankTransferState,
  formData: FormData,
): Promise<BankTransferState> {
  const planKey = String(formData.get('planKey') ?? '').trim();
  if (!planKey) return { error: 'unknownPlan' };

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

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, key, price_yearly, currency, is_active')
    .eq('key', planKey)
    .eq('is_active', true)
    .maybeSingle();
  if (!plan) return { error: 'unknownPlan' };

  const amount = Number(plan.price_yearly ?? 0);
  // Nothing to transfer for the free tier, and a pending payment for zero would
  // sit in the admin queue forever waiting for a statement line that never comes.
  if (amount <= 0) return { error: 'freePlan' };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('payments')
    .select('provider_ref')
    .eq('business_id', business.id)
    .eq('plan_id', plan.id)
    .eq('provider', 'bank_transfer')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .maybeSingle();

  let reference = existing?.provider_ref ?? null;

  if (!reference) {
    // Generated in the database, where uniqueness is enforced. Generating it
    // here and hoping would eventually collide, and a duplicate reference makes
    // two operators' payments indistinguishable.
    const { data: generated, error: refError } = await admin.rpc('generate_payment_reference');
    if (refError || !generated) return { error: 'generic' };
    reference = generated as string;

    const { error } = await admin.from('payments').insert({
      business_id: business.id,
      plan_id: plan.id,
      amount,
      currency: plan.currency,
      status: 'pending',
      provider: 'bank_transfer',
      provider_ref: reference,
      method: 'bank_transfer',
    });
    if (error) return { error: 'generic' };
  }

  redirect(`/dashboard/subscription/pay/${reference}`);
}
