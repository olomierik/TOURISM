'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/format';
import type { Locale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';

export type DashboardState = {
  error?: 'generic' | 'nameRequired' | 'slugTaken' | 'notAllowed' | 'alreadyRequested';
  success?: boolean;
};

/**
 * Moves one lead through the owner's pipeline.
 *
 * Goes through the cookie-bound client so RLS decides whether this owner may
 * touch this row, and the lead_businesses_guard_fields trigger blocks any
 * attempt to rewrite rank, match_reason or sent_at. Nothing here re-implements
 * either check.
 */
export async function updateLeadStatus(
  leadBusinessId: string,
  status: Enums<'lead_business_status'>,
  extra: { quotedAmount?: number; quotedCurrency?: string; declineReason?: string } = {},
): Promise<DashboardState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('lead_businesses')
    .update({
      status,
      quoted_amount: extra.quotedAmount ?? null,
      quoted_currency: extra.quotedCurrency ?? null,
      decline_reason: extra.declineReason ?? null,
    })
    .eq('id', leadBusinessId);

  if (error) {
    console.error('[dashboard] lead status update failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/leads');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Marks a lead as opened.
 *
 * Separate from updateLeadStatus because it fires on view rather than on an
 * explicit action, and must never overwrite a status the owner already set —
 * opening a lead you have already quoted should not reset it to "viewed".
 */
export async function markLeadViewed(leadBusinessId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('lead_businesses')
    .update({ status: 'viewed' })
    .eq('id', leadBusinessId)
    .eq('status', 'sent');
}

/** Creates the owner's business. One per owner; the form is hidden once one exists. */
export async function createBusiness(
  _prev: DashboardState,
  formData: FormData,
): Promise<DashboardState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'notAllowed' };

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'nameRequired' };

  const locale = (await getLocale()) as Locale;

  // Slugs are global and permanent-ish, so collisions are resolved once here
  // rather than surfacing as a constraint violation the user cannot act on.
  const admin = createAdminClient();
  const base = slugify(name) || 'business';
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data: taken } = await admin
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${n}`;
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name,
      slug,
      // 'draft' is the only status an owner may create in; publication is an
      // admin review decision, enforced again by RLS and by a trigger.
      status: 'draft',
      email: String(formData.get('email') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
      city: String(formData.get('city') ?? '').trim() || null,
    })
    .select('id')
    .single();

  if (error || !business) {
    console.error('[dashboard] business create failed', error?.message);
    return { error: 'generic' };
  }

  const tagline = String(formData.get('tagline') ?? '').trim();
  if (tagline) {
    await supabase
      .from('business_translations')
      .insert({ business_id: business.id, locale, tagline });
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/** Updates the owner's business profile and its translation for one locale. */
export async function updateBusiness(
  _prev: DashboardState,
  formData: FormData,
): Promise<DashboardState> {
  const supabase = await createClient();
  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return { error: 'generic' };

  const locale = (await getLocale()) as Locale;

  const numOrNull = (key: string) => {
    const raw = String(formData.get(key) ?? '').trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  // status, tier, is_verified and owner_id are deliberately absent. RLS gates the
  // row but not individual columns, so the businesses_guard_privileged_fields
  // trigger is what actually refuses them — omitting them here keeps the intent
  // obvious rather than relying on the reader to know that.
  const { error } = await supabase
    .from('businesses')
    .update({
      name: String(formData.get('name') ?? '').trim(),
      legal_name: String(formData.get('legalName') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
      website: String(formData.get('website') ?? '').trim() || null,
      address: String(formData.get('address') ?? '').trim() || null,
      city: String(formData.get('city') ?? '').trim() || null,
      founded_year: numOrNull('foundedYear'),
      team_size: numOrNull('teamSize'),
      license_number: String(formData.get('licenseNumber') ?? '').trim() || null,
    })
    .eq('id', businessId);

  if (error) {
    console.error('[dashboard] business update failed', error.message);
    return { error: 'generic' };
  }

  const { error: trError } = await supabase.from('business_translations').upsert(
    {
      business_id: businessId,
      locale,
      tagline: String(formData.get('tagline') ?? '').trim() || null,
      short_description: String(formData.get('shortDescription') ?? '').trim() || null,
      description: String(formData.get('description') ?? '').trim() || null,
    },
    { onConflict: 'business_id,locale' },
  );

  if (trError) {
    console.error('[dashboard] translation upsert failed', trError.message);
    return { error: 'generic' };
  }

  // Categories and destinations decide where this listing can be found at all.
  // Without them a business is reachable only by its own URL and by the
  // unfiltered directory — it cannot appear on a category page, a destination
  // page, or any of the category x destination pages that carry the commercial
  // search traffic. Every listing created before this was saved that way.
  const categoryIds = formData.getAll('categoryIds').map(String).filter(Boolean);
  const destinationIds = formData.getAll('destinationIds').map(String).filter(Boolean);

  // Replace rather than merge: the form submits the complete intended set, so an
  // unchecked box has to remove the row it used to represent.
  const [{ error: catDelErr }, { error: destDelErr }] = await Promise.all([
    supabase.from('business_categories').delete().eq('business_id', businessId),
    supabase.from('business_destinations').delete().eq('business_id', businessId),
  ]);

  if (catDelErr || destDelErr) {
    console.error('[dashboard] taxonomy clear failed', catDelErr?.message ?? destDelErr?.message);
    return { error: 'generic' };
  }

  if (categoryIds.length) {
    const { error } = await supabase.from('business_categories').insert(
      categoryIds.map((category_id) => ({ business_id: businessId, category_id })),
    );
    if (error) {
      console.error('[dashboard] category link failed', error.message);
      return { error: 'generic' };
    }
  }

  if (destinationIds.length) {
    const { error } = await supabase.from('business_destinations').insert(
      // The first selection is the primary one, which is what destination pages
      // rank on when a business serves several.
      destinationIds.map((destination_id, i) => ({
        business_id: businessId,
        destination_id,
        is_primary: i === 0,
      })),
    );
    if (error) {
      console.error('[dashboard] destination link failed', error.message);
      return { error: 'generic' };
    }
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  // The directory, category and destination pages are statically generated, so
  // a change to where this listing belongs is invisible until they revalidate.
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Submits a draft business for admin review. */
export async function submitForReview(businessId: string): Promise<DashboardState> {
  const supabase = await createClient();

  // draft -> pending is the one status transition an owner is permitted; the
  // trigger refuses anything else, so this needs no additional guard.
  const { error } = await supabase
    .from('businesses')
    .update({ status: 'pending' })
    .eq('id', businessId)
    .in('status', ['draft', 'rejected']);

  if (error) {
    console.error('[dashboard] submit for review failed', error.message);
    return { error: 'notAllowed' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
