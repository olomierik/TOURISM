'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Enums } from '@/lib/supabase/database.types';

export type PaymentProvider = Enums<'payment_provider'>;

export type PaymentMethodState = {
  error?: 'notAllowed' | 'urlRequired' | 'urlInvalid' | 'hostNotAllowed' | 'generic';
  success?: boolean;
};

/**
 * An operator's own checkout link.
 *
 * The platform links to it and never handles the payment. That is the whole
 * point: collecting money and remitting it would make this site a payment
 * facilitator, with the licensing, PCI scope and chargeback liability that
 * carries. Sending the traveller to the operator's own hosted checkout leaves
 * the merchant relationship where it already is.
 *
 * Validation is duplicated here and in the database on purpose. The trigger in
 * migration 053 is the rule; this exists to turn a rejection into a message a
 * person can act on, because "check_violation" is not one.
 */

/** Hosts each provider serves checkouts from, read from the database. */
async function allowedHosts(provider: PaymentProvider): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('payment_provider_hosts')
    .select('host')
    .eq('provider', provider);
  return (data ?? []).map((r) => r.host);
}

export async function savePaymentMethod(
  _prev: PaymentMethodState,
  formData: FormData,
): Promise<PaymentMethodState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  // The business is resolved from the session rather than taken from the form:
  // a business_id in a POST body is a business_id somebody can change.
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!business) return { error: 'notAllowed' };

  const provider = String(formData.get('provider') ?? '') as PaymentProvider;
  const raw = String(formData.get('checkoutUrl') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim() || null;

  if (!raw) return { error: 'urlRequired' };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: 'urlInvalid' };
  }

  // https only, checked before the host: a checkout reached over http is one a
  // network between the traveller and the operator can rewrite.
  if (url.protocol !== 'https:') return { error: 'urlInvalid' };
  if (url.username || url.password) return { error: 'urlInvalid' };

  const hosts = await allowedHosts(provider);
  if (!hosts.includes(url.hostname.toLowerCase())) return { error: 'hostNotAllowed' };

  const { error } = await supabase.from('business_payment_methods').upsert(
    {
      business_id: business.id,
      provider,
      checkout_url: url.toString(),
      label,
      is_active: true,
    },
    { onConflict: 'business_id,provider' },
  );

  if (error) {
    console.error('[payments] save failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/payments');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function removePaymentMethod(methodId: string): Promise<PaymentMethodState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  // RLS restricts this to the owner's own rows; the id alone is not authority.
  const { error } = await supabase.from('business_payment_methods').delete().eq('id', methodId);

  if (error) {
    console.error('[payments] delete failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/payments');
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Records that a traveller was sent to pay, and returns where to send them.
 *
 * The destination is read from the database rather than accepted from the
 * caller. A URL in the request would be a redirect anyone could aim: the whole
 * value of the allow-list in 053 disappears the moment the browser gets to say
 * where the button goes.
 *
 * Returns null rather than throwing when there is nothing to return to, so the
 * component renders no button instead of a broken one.
 */
export async function beginPayment(
  methodId: string,
  packageId: string | null,
  locale: string,
): Promise<{ url: string } | null> {
  const admin = createAdminClient();

  const { data: method } = await admin
    .from('business_payment_methods')
    .select('id, business_id, provider, checkout_url, is_active, businesses (status, deleted_at)')
    .eq('id', methodId)
    .maybeSingle();

  if (!method?.is_active) return null;
  // An unapproved or deleted listing must not be able to take money through a
  // button this site rendered.
  const owner = method.businesses as { status: string; deleted_at: string | null } | null;
  if (!owner || owner.status !== 'approved' || owner.deleted_at) return null;

  // Intent, not revenue. Nothing tells us whether the traveller paid.
  const { error } = await admin.from('payment_referrals').insert({
    business_id: method.business_id,
    payment_method_id: method.id,
    package_id: packageId,
    provider: method.provider,
    locale,
  });

  // A failed record must not stop somebody paying an operator.
  if (error) console.error('[payments] referral record failed', error.message);

  return { url: method.checkout_url };
}
