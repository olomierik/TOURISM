'use server';

import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { absoluteUrl } from '@/lib/seo';
import { createCheckout } from './flutterwave';
import { createCheckout as createPaddleCheckout } from './paddle';
import { activeProvider } from './provider';

export type CheckoutState = {
  error?: 'notAllowed' | 'noBusiness' | 'unknownPlan' | 'notConfigured' | 'generic';
};

/**
 * Starts a subscription checkout.
 *
 * The plan's price is read from the database, never from the form. A price
 * posted by the browser is a price the operator chooses, and $200 of featured
 * placement would cost whatever they typed.
 *
 * The price is the annual one. Plans have billed annually since migration 042;
 * this path kept reading `price_monthly` long after that, which would have
 * charged a tenth of the plan and granted a full tier for it.
 *
 * A pending payment row is written before the operator leaves, so a checkout
 * that is abandoned or that fails on the provider's side is still visible here.
 * Reconciling against an absence is not possible.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const provider = activeProvider();
  if (!provider) return { error: 'notConfigured' };

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
    .select('id, key, price_yearly, currency')
    .eq('key', planKey)
    .eq('is_active', true)
    .maybeSingle();

  // A free plan has nothing to charge for, so there is no checkout to open.
  // price_yearly is nullable, and a null price is not a free plan — it is a
  // plan with no price set, which must not open a checkout for zero either.
  const amount = Number(plan?.price_yearly ?? 0);
  if (!plan || amount <= 0) return { error: 'unknownPlan' };

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
    amount,
    currency: plan.currency ?? 'USD',
    status: 'pending',
    provider,
    provider_ref: null,
    raw: { reference, plan_key: plan.key, plan_id: plan.id },
  });

  if (payErr) {
    console.error('startCheckout: payment row failed', payErr.message);
    return { error: 'generic' };
  }

  // Carried through the provider and back on the webhook, so the callback does
  // not have to re-derive which plan was being bought from the amount.
  const meta = { business_id: business.id, plan_id: plan.id, reference };
  const email = profile?.email ?? business.email ?? user.email ?? '';
  const name = profile?.full_name ?? business.name;
  const title = `Explore Tanzania — ${plan.key} plan`;

  let link: string;
  try {
    if (provider === 'paddle') {
      // Paddle's URL is our own /pay page with ?_ptxn= appended — the
      // transaction is created here, but the checkout itself is opened by
      // Paddle.js on that page. See lib/payments/paddle.ts.
      const checkout = await createPaddleCheckout({
        reference,
        amount,
        currency: plan.currency ?? 'USD',
        planName: title,
        description: `Annual ${plan.key} listing plan on Explore Tanzania`,
        customer: { email, name },
        meta,
      });
      link = checkout.checkoutUrl;
    } else {
      link = await createCheckout({
        reference,
        amount,
        currency: plan.currency ?? 'USD',
        redirectUrl: absoluteUrl(`/${locale}/dashboard/subscription`),
        customer: { email, name, phone: business.phone },
        meta,
        title,
      });
    }
  } catch (err) {
    console.error('startCheckout:', err);
    return { error: 'generic' };
  }

  // Outside the try: redirect() signals by throwing, and catching it here would
  // turn a successful checkout into a generic error.
  redirect(link);
}
