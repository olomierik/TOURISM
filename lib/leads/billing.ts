'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createCheckout as createPaddleCheckout } from '@/lib/payments/paddle';
import { activeProvider } from '@/lib/payments/provider';
import { CREDIT_TOP_UPS } from '@/lib/leads/pricing';

/**
 * Selling enquiries, operator side. The database does the deciding — see
 * supabase/migrations/089_selling_leads.sql — and these actions only carry a
 * request to it and translate its answer.
 *
 * None of them takes a price from the browser. A top-up amount is checked
 * against a fixed list, a bid is clamped by the database when it is used, and
 * the price of an enquiry was fixed when it was matched.
 */

export type AcceptResult =
  | { ok: true; fee: number; balance: number | null }
  | { ok: false; error: 'insufficientCredit'; fee: number; balance: number }
  | { ok: false; error: 'notAllowed' | 'declined' | 'generic' };

export async function acceptLead(leadBusinessId: string): Promise<AcceptResult> {
  if (!/^[0-9a-f-]{36}$/i.test(leadBusinessId)) return { ok: false, error: 'notAllowed' };

  // The cookie-bound client, so accept_lead_offer sees who is asking and
  // checks ownership itself. The admin client would make every caller an admin.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_lead_offer', { target: leadBusinessId });

  if (error || !data || typeof data !== 'object') {
    console.error('[leads] accept failed', leadBusinessId, error?.message);
    return { ok: false, error: 'generic' };
  }

  const r = data as {
    ok: boolean;
    error?: string;
    fee?: number | string;
    balance?: number | string;
  };

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard/credit');

  if (r.ok) {
    return {
      ok: true,
      fee: Number(r.fee ?? 0),
      balance: r.balance === undefined ? null : Number(r.balance),
    };
  }
  if (r.error === 'insufficientCredit') {
    return {
      ok: false,
      error: 'insufficientCredit',
      fee: Number(r.fee ?? 0),
      balance: Number(r.balance ?? 0),
    };
  }
  if (r.error === 'declined' || r.error === 'notAllowed') return { ok: false, error: r.error };
  return { ok: false, error: 'generic' };
}

export type TopUpState = {
  error?: 'notConfigured' | 'notAllowed' | 'noBusiness' | 'invalidAmount' | 'generic';
};

/**
 * Opens a Paddle checkout for enquiry credit.
 *
 * Paddle only, like the rest of the platform's billing (lib/payments/provider.ts
 * records why there is no fallback). The credit itself is written by the
 * Paddle webhook once Paddle confirms the money — never here, because a
 * checkout opened is not a checkout paid.
 */
export async function startCreditTopUp(_prev: TopUpState, formData: FormData): Promise<TopUpState> {
  const amount = Number(formData.get('amount'));
  if (!(CREDIT_TOP_UPS as readonly number[]).includes(amount)) return { error: 'invalidAmount' };

  const provider = await activeProvider();
  if (provider !== 'paddle') return { error: 'notConfigured' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, email')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (!business) return { error: 'noBusiness' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const reference = `ET-CREDIT-${business.id.slice(0, 8)}-${Date.now()}`;

  // A pending row before the operator leaves, as for subscriptions, so an
  // abandoned checkout still shows up when reconciling.
  const admin = createAdminClient();
  const { error: payErr } = await admin.from('payments').insert({
    business_id: business.id,
    amount,
    currency: 'USD',
    status: 'pending',
    provider,
    provider_ref: null,
    raw: { reference, purpose: 'lead_credit', credit_amount: amount },
  });
  if (payErr) {
    console.error('[credit] pending payment row failed', payErr.message);
    return { error: 'generic' };
  }

  let link: string;
  try {
    const checkout = await createPaddleCheckout({
      reference,
      amount,
      currency: 'USD',
      planName: 'Explore Tanzania — enquiry credit',
      description: `US$${amount} of credit for buying traveller enquiries on Explore Tanzania`,
      customer: {
        email: profile?.email ?? business.email ?? user.email ?? '',
        name: profile?.full_name ?? business.name,
      },
      // Read back by the webhook, which credits exactly this amount and no
      // more — whatever the transaction says it was for.
      meta: {
        business_id: business.id,
        purpose: 'lead_credit',
        credit_amount: String(amount),
        reference,
      },
    });
    link = checkout.checkoutUrl;
  } catch (err) {
    console.error('[credit] checkout failed', err);
    return { error: 'generic' };
  }

  // Outside the try: redirect() works by throwing.
  redirect(link);
}

export type LeadSettingsState = { error?: 'notAllowed' | 'invalidBid' | 'generic'; success?: boolean };

/**
 * The operator's bid and their choice about the marketing budget.
 *
 * The bid is stored as typed, within 0–100, and clamped to the platform range
 * wherever it is used. Storing the clamp instead would silently change an
 * operator's choice the day the range moves.
 */
export async function saveLeadSettings(
  _prev: LeadSettingsState,
  formData: FormData,
): Promise<LeadSettingsState> {
  const raw = String(formData.get('bid') ?? '').trim();
  const bid = raw === '' ? null : Number(raw);
  if (bid !== null && (!Number.isFinite(bid) || bid < 0 || bid > 100)) return { error: 'invalidBid' };
  const optOut = formData.get('markupOptOut') === 'on';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  const { error } = await supabase
    .from('businesses')
    .update({
      lead_bid_percent: bid === null ? null : Math.round(bid * 100) / 100,
      rate_markup_opt_out: optOut,
    })
    .eq('owner_id', user.id)
    .is('deleted_at', null);

  if (error) {
    console.error('[credit] settings save failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/credit');
  // The opt-out changes the prices on every public page that shows this
  // operator's rates.
  revalidatePath('/', 'layout');
  return { success: true };
}
