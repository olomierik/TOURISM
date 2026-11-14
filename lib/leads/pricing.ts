import 'server-only';

import { createPublicClient } from '@/lib/supabase/public';

/**
 * The read side of selling enquiries: the platform's price settings, and the
 * worked example the credit page shows an operator.
 *
 * Kept out of lib/leads/billing.ts because a 'use server' module may export
 * only async functions, and these are constants and plain reads.
 */

/** The credit packs on offer, in USD. Checked server-side on every top-up. */
export const CREDIT_TOP_UPS = [50, 100, 250, 500] as const;

export type LeadPricing = {
  enabled: boolean;
  percentMin: number;
  percentMax: number;
  percentDefault: number;
  feeMin: number;
  feeMax: number;
};

const DEFAULTS: LeadPricing = {
  enabled: false,
  percentMin: 1,
  percentMax: 10,
  percentDefault: 2,
  feeMin: 5,
  feeMax: 120,
};

const KEYS: Record<keyof LeadPricing, string> = {
  enabled: 'lead_billing_enabled',
  percentMin: 'lead_fee_percent_min',
  percentMax: 'lead_fee_percent_max',
  percentDefault: 'lead_fee_percent_default',
  feeMin: 'lead_fee_min_usd',
  feeMax: 'lead_fee_max_usd',
};

/** platform_settings is readable by anyone, so the public client suffices. */
export async function getLeadPricing(): Promise<LeadPricing> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', Object.values(KEYS));

  if (error || !data) return DEFAULTS;

  const byKey = new Map(data.map((r) => [r.key, r.value]));
  const num = (k: keyof LeadPricing) => {
    const v = Number(byKey.get(KEYS[k]));
    return Number.isFinite(v) ? v : (DEFAULTS[k] as number);
  };

  return {
    enabled: byKey.get(KEYS.enabled) === true,
    percentMin: num('percentMin'),
    percentMax: num('percentMax'),
    percentDefault: num('percentDefault'),
    feeMin: num('feeMin'),
    feeMax: num('feeMax'),
  };
}

/** The operator's bid as the database will use it. */
export function effectivePercent(bid: number | null, p: LeadPricing): number {
  return Math.min(p.percentMax, Math.max(p.percentMin, bid ?? p.percentDefault));
}

/**
 * What one typical enquiry would cost this operator, for the credit page.
 *
 * The same arithmetic as estimate_lead_value and the offer trigger in 089 —
 * two adults, seven days, the mid-range band of US$250–450 a day — so the
 * example an operator reads is the price they would actually be charged.
 */
export function typicalEnquiry(bid: number | null, p: LeadPricing) {
  const value = 2 * 7 * ((250 + 450) / 2);
  const percent = effectivePercent(bid, p);
  const fee = Math.min(p.feeMax, Math.max(p.feeMin, Math.round(value * percent) / 100));
  return { value, percent, fee };
}
