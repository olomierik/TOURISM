'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { absoluteUrl } from '@/lib/seo';
import { createCheckout, paymentsConfigured } from './flutterwave';

export type CheckoutState = {
  error?: 'notAllowed' | 'noBusiness' | 'unknownPlan' | 'notConfigured' | 'generic';
};

/**
 * Starts a subscription checkout.
 *
 * The plan's price is read from the database, never from the form. A price
 * posted by the browser is a price the operator chooses, and $149 of featured
 * placement would cost whatever they typed.
 *
 * A pending payment row is written before the operator leaves, so a checkout
 * that is abandoned or that fails on the provider's side is still visible here.
 * Reconciling against an absence is not possible.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  if (!paymentsConfigured()) return { error: 'notConfigured' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  const planKey = String(formData.get('planKey') ?? '').trim();

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, email, phone')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (!business) return { error: 'noBusiness' };

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id, key, price_monthly, currency')
    .eq('key', planKey)
    .eq('is_active', true)
    .maybeSingle();

  // A free plan has nothing to charge for, so there is no checkout to open.
  if (!plan || Number(plan.price_monthly) <= 0) return { error: 'unknownPlan' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const reference = `ET-SUB-${business.id.slice(0, 8)}-${Date.now()}`;
  const locale = await getLocale();

  // Written with the admin client: payments is not writable by an operator, and
  // it must not be — a client that could insert a succeeded payment could grant
  // itself a plan.
  const admin = createAdminClient();
  const { error: payErr } = await admin.from('payments').insert({
    business_id: business.id,
    amount: Number(plan.price_monthly),
    currency: plan.currency ?? 'USD',
    status: 'pending',
    provider: 'flutterwave',
    provider_ref: null,
    raw: { reference, plan_key: plan.key, plan_id: plan.id },
  });

  if (payErr) {
    console.error('startCheckout: payment row failed', payErr.message);
    return { error: 'generic' };
  }

  let link: string;
  try {
    link = await createCheckout({
      reference,
      amount: Number(plan.price_monthly),
      currency: plan.currency ?? 'USD',
      redirectUrl: absoluteUrl(`/${locale}/dashboard/subscription`),
      customer: {
        email: profile?.email ?? business.email ?? user.email ?? '',
        name: profile?.full_name ?? business.name,
        phone: business.phone,
      },
      // Carried through the provider and back on the webhook, so the callback
      // does not have to re-derive which plan was being bought from the amount.
      meta: { business_id: business.id, plan_id: plan.id, reference },
      title: `Explore Tanzania — ${plan.key} plan`,
    });
  } catch (err) {
    console.error('startCheckout:', err);
    return { error: 'generic' };
  }

  // Outside the try: redirect() signals by throwing, and catching it here would
  // turn a successful checkout into a generic error.
  redirect(link);
}
