'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type GrantState = { error?: string; ok?: boolean };

/**
 * Grants or extends an annual plan.
 *
 * Everything meaningful happens inside grant_annual_plan() in migration 042 —
 * the admin check, the period arithmetic, marking the payment settled. This
 * function exists to call it through the caller's own session, so the check
 * inside sees the real user.
 *
 * That matters more than it looks. The function is security definer, which
 * means it runs with the definer's rights; without the is_admin() check inside
 * it, being able to call it would be the same as being an admin. Calling it
 * through the admin service client here would defeat that check entirely, so
 * this deliberately uses the cookie-bound client.
 */
export async function grantPlan(
  businessId: string,
  planId: string,
  paymentId?: string,
): Promise<GrantState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signedOut' };

  // p_payment_id has a SQL default of null, which the type generator cannot
  // express — it emits every argument as required. Passing null explicitly is
  // what the function already handles (`if p_payment_id is not null`), so the
  // cast reflects the real signature rather than working around it.
  const { error } = await supabase.rpc('grant_annual_plan', {
    p_business_id: businessId,
    p_plan_id: planId,
    p_payment_id: (paymentId ?? null) as string,
  });

  if (error) return { error: error.message.slice(0, 120) };

  revalidatePath('/admin/subscriptions');
  return { ok: true };
}

/**
 * Ends a subscription now.
 *
 * Sets status rather than deleting the row: the history of who was on what and
 * when is the only evidence available if somebody disputes a charge, and it is
 * also what the sync_business_tier trigger reads to drop the listing back to
 * free.
 */
export async function endSubscription(subscriptionId: string): Promise<GrantState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signedOut' };

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', subscriptionId);

  if (error) return { error: error.message.slice(0, 120) };

  revalidatePath('/admin/subscriptions');
  return { ok: true };
}

/** Rejects a bank transfer that never arrived. */
export async function rejectPayment(paymentId: string, reason: string): Promise<GrantState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signedOut' };

  const { error } = await supabase
    .from('payments')
    .update({ status: 'failed', failed_reason: reason.slice(0, 200) })
    .eq('id', paymentId);

  if (error) return { error: error.message.slice(0, 120) };

  revalidatePath('/admin/subscriptions');
  return { ok: true };
}
