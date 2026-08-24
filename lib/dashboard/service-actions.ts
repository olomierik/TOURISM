'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { locales, type Locale } from '@/i18n/routing';

/**
 * Services a business offers — the list shown on its public profile.
 *
 * The public business page has read and rendered these since Phase 3, and
 * nothing anywhere could create one, so the section was permanently empty on
 * every listing. Same shape of gap as packages had: the schema, the query and
 * the display were all present, only the write path was missing.
 *
 * Ownership is enforced by RLS through owns_business, so these actions do not
 * re-check it. What they own is the plan quota, which has no database trigger
 * behind it the way the gallery does.
 */

export type ServiceState = {
  error?: 'noBusiness' | 'nameRequired' | 'limitReached' | 'generic';
  /** On limitReached, the plan's allowance, so the message can name it. */
  limit?: number;
  success?: boolean;
};

async function myBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  return data ? { supabase, businessId: data.id } : null;
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? '').trim();
  return s.length ? s : null;
}

/** Reads the plan's service allowance the same way packages read theirs. */
async function serviceAllowance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const [{ count }, { data: sub }] = await Promise.all([
    supabase
      .from('business_services')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),
    supabase
      .from('subscriptions')
      .select('subscription_plans (max_services)')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  let limit = (sub?.subscription_plans as { max_services: number | null } | null)?.max_services;

  if (limit === undefined) {
    const { data: free } = await supabase
      .from('subscription_plans')
      .select('max_services')
      .eq('key', 'free')
      .single();
    limit = free?.max_services ?? null;
  }

  return { used: count ?? 0, limit: limit ?? null };
}

export async function createService(
  _prev: ServiceState,
  formData: FormData,
): Promise<ServiceState> {
  const ctx = await myBusiness();
  if (!ctx) return { error: 'noBusiness' };

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'nameRequired' };

  const { used, limit } = await serviceAllowance(ctx.supabase, ctx.businessId);
  if (limit !== null && used >= limit) return { error: 'limitReached', limit };

  const locale = (await getLocale()) as Locale;

  const { data: service, error } = await ctx.supabase
    .from('business_services')
    .insert({
      business_id: ctx.businessId,
      price_from: numOrNull(formData.get('priceFrom')),
      currency: String(formData.get('currency') ?? 'USD').slice(0, 3).toUpperCase(),
      sort_order: used,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[services] create failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('business_service_translations').insert({
    service_id: service.id,
    locale,
    name,
    description: strOrNull(formData.get('description')),
  });

  if (trErr) {
    // Without a translation the service has no name in any language, so it would
    // render as a blank row. Roll it back.
    await ctx.supabase.from('business_services').delete().eq('id', service.id);
    console.error('[services] translation failed', trErr.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/services');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateService(
  _prev: ServiceState,
  formData: FormData,
): Promise<ServiceState> {
  const ctx = await myBusiness();
  if (!ctx) return { error: 'noBusiness' };

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'nameRequired' };

  const localeInput = String(formData.get('locale') ?? 'en');
  const locale: Locale = locales.includes(localeInput as Locale) ? (localeInput as Locale) : 'en';

  const { error } = await ctx.supabase
    .from('business_services')
    .update({
      price_from: numOrNull(formData.get('priceFrom')),
      currency: String(formData.get('currency') ?? 'USD').slice(0, 3).toUpperCase(),
      is_active: formData.get('isActive') !== null,
    })
    .eq('id', id);

  if (error) {
    console.error('[services] update failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('business_service_translations').upsert(
    {
      service_id: id,
      locale,
      name,
      description: strOrNull(formData.get('description')),
    },
    { onConflict: 'service_id,locale' },
  );

  if (trErr) {
    console.error('[services] translation upsert failed', trErr.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/services');
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Removes a service outright.
 *
 * Hard delete, unlike packages. A service is a line on a profile, not something
 * a traveler can have been quoted — there is no enquiry referencing it and no
 * price history worth keeping.
 */
export async function deleteService(id: string): Promise<ServiceState> {
  const ctx = await myBusiness();
  if (!ctx) return { error: 'noBusiness' };

  const { error } = await ctx.supabase.from('business_services').delete().eq('id', id);

  if (error) {
    console.error('[services] delete failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/services');
  revalidatePath('/', 'layout');
  return { success: true };
}
