'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type DealState = {
  error?:
    | 'signedOut'
    | 'noBusiness'
    | 'needsPlan'
    | 'tooMany'
    | 'priceNeedsPackage'
    | 'priceTooHigh'
    | 'discountTooSmall'
    | 'discountTooLarge'
    | 'badDates'
    | 'copyTooShort'
    | 'generic';
  created?: boolean;
};

/**
 * Creates a deal.
 *
 * Almost none of the rules live here. The reference price, the discount floor
 * and ceiling, the ownership check, the tier gate and the three-live-deals cap
 * are all enforced by a trigger in migration 040, because this form is not the
 * only way to reach the table — anyone with the publishable key can POST to it.
 * What this function does is translate the database's refusals into something a
 * person can act on, which is the part a trigger cannot do.
 *
 * The mapping below is deliberately explicit rather than a regex over the
 * message: if a rule is renamed in SQL and nothing here matches, the operator
 * gets the generic error and the form still refuses correctly — the failure
 * mode is a worse message, not a deal that should not exist.
 */
function classify(message: string): DealState['error'] {
  const m = message.toLowerCase();
  if (m.includes('paid plan')) return 'needsPlan';
  if (m.includes('three live deals')) return 'tooMany';
  if (m.includes('below the published')) return 'priceTooHigh';
  if (m.includes('under 5%')) return 'discountTooSmall';
  if (m.includes('over 70%')) return 'discountTooLarge';
  if (m.includes('no published price')) return 'priceTooHigh';
  if (m.includes('own package')) return 'generic';
  if (m.includes('end in the past') || m.includes('deals_dates_ordered') || m.includes('not_forever'))
    return 'badDates';
  if (m.includes('deals_price_needs_package')) return 'priceNeedsPackage';
  if (m.includes('deal_headline_length') || m.includes('deal_terms_substantial'))
    return 'copyTooShort';
  return 'generic';
}

export async function createDeal(_prev: DealState, formData: FormData): Promise<DealState> {
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

  const packageId = String(formData.get('packageId') ?? '').trim() || null;
  const priceRaw = String(formData.get('dealPrice') ?? '').trim();
  const dealPrice = priceRaw === '' ? null : Number(priceRaw);
  const endsAt = String(formData.get('endsAt') ?? '').trim();
  const headline = String(formData.get('headline') ?? '').trim();
  const terms = String(formData.get('terms') ?? '').trim();

  if (dealPrice !== null && (!Number.isFinite(dealPrice) || dealPrice <= 0)) {
    return { error: 'generic' };
  }
  if (dealPrice !== null && !packageId) return { error: 'priceNeedsPackage' };
  if (!endsAt) return { error: 'badDates' };

  // Caught here as well as in SQL, because the length constraints fire on the
  // translation insert — after the deal row exists — and an operator should not
  // have to discover a two-word headline by way of a half-written deal.
  if (headline.length < 8 || headline.length > 90) return { error: 'copyTooShort' };
  if (terms.length < 30) return { error: 'copyTooShort' };

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      business_id: business.id,
      package_id: packageId,
      deal_price: dealPrice,
      // A date input gives a day, not an instant. End of that day is what an
      // operator means by "until the 15th".
      ends_at: `${endsAt}T23:59:59Z`,
    })
    .select('id')
    .single();

  if (error || !deal) return { error: error ? classify(error.message) : 'generic' };

  const { error: copyError } = await supabase
    .from('deal_translations')
    .insert({ deal_id: deal.id, locale: 'en', headline, terms });

  // A deal with no copy renders as a blank badge, so a failed translation takes
  // the deal with it rather than leaving one behind.
  if (copyError) {
    await supabase.from('deals').delete().eq('id', deal.id);
    return { error: classify(copyError.message) };
  }

  revalidatePath('/dashboard/deals');
  return { created: true };
}

/** Ends a deal now. RLS decides whose it is; the copy cascades. */
export async function endDeal(dealId: string): Promise<DealState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signedOut' };

  const { error } = await supabase.from('deals').delete().eq('id', dealId);
  if (error) return { error: 'generic' };

  revalidatePath('/dashboard/deals');
  return {};
}
