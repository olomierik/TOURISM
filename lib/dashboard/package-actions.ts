'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { locales, type Locale } from '@/i18n/routing';

/**
 * Package create, edit and delete for a business owner.
 *
 * Packages are what a traveler actually compares, and the dashboard listed them
 * without offering any way to make one: the empty state said "add a package"
 * and linked back to itself. Everything below existed in the schema already —
 * only the write path was missing.
 *
 * Ownership is enforced by RLS through owns_package/owns_business, so these
 * actions never check it themselves. What they do own is the plan quota, which
 * has no database trigger behind it the way the gallery does.
 */

export type PackageState = {
  error?: 'notAllowed' | 'noBusiness' | 'titleRequired' | 'limitReached' | 'slugTaken' | 'generic';
  /** On limitReached, the plan's allowance, so the message can name it. */
  limit?: number;
  success?: boolean;
};

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/** The caller's business, or null when they have not created one yet. */
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

/**
 * Attaches a trip to the places it visits.
 *
 * package_destinations was read by three queries and written by none, so every
 * package was orphaned: absent from destination pages, absent from its own
 * TouristTrip itinerary, and findable only by name. The queries inner-join the
 * table, which is why the failure was silent — an empty join returns an empty
 * list, not an error, and the "tours here" section simply never rendered on any
 * of the 46 destination pages.
 *
 * Replace rather than merge, matching how the business form handles its
 * taxonomy: the submitted set is the complete intended set, so an unchecked box
 * has to remove the row it used to stand for.
 *
 * sort_order follows submission order. It is not a claimed route — nothing here
 * asks the operator which stop is first — but it is stable and operator-visible,
 * so an ordered itinerary can be built on it later without a migration.
 */
async function setPackageDestinations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
  destinationIds: string[],
): Promise<boolean> {
  const { error: delErr } = await supabase
    .from('package_destinations')
    .delete()
    .eq('package_id', packageId);

  if (delErr) {
    console.error('[packages] destination clear failed', delErr.message);
    return false;
  }

  if (destinationIds.length === 0) return true;

  const { error } = await supabase.from('package_destinations').insert(
    destinationIds.map((destination_id, i) => ({
      package_id: packageId,
      destination_id,
      sort_order: i,
    })),
  );

  if (error) {
    console.error('[packages] destination link failed', error.message);
    return false;
  }
  return true;
}

/** Reads the plan's package allowance the same way the gallery reads its own. */
async function packageAllowance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const [{ count }, { data: sub }] = await Promise.all([
    supabase
      .from('packages')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .is('deleted_at', null),
    supabase
      .from('subscriptions')
      .select('subscription_plans (max_packages)')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  let limit = (sub?.subscription_plans as { max_packages: number | null } | null)?.max_packages;

  if (limit === undefined) {
    const { data: free } = await supabase
      .from('subscription_plans')
      .select('max_packages')
      .eq('key', 'free')
      .single();
    limit = free?.max_packages ?? null;
  }

  return { used: count ?? 0, limit: limit ?? null };
}

export async function createPackage(
  _prev: PackageState,
  formData: FormData,
): Promise<PackageState> {
  const ctx = await myBusiness();
  if (!ctx) return { error: 'noBusiness' };

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'titleRequired' };

  const { used, limit } = await packageAllowance(ctx.supabase, ctx.businessId);
  if (limit !== null && used >= limit) return { error: 'limitReached', limit };

  const locale = (await getLocale()) as Locale;

  // The slug is globally unique, so two operators naming a package "3-Day
  // Serengeti" would collide. Suffixing keeps the first one's URL intact.
  const base = slugify(String(formData.get('slug') ?? '') || title) || 'package';
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;

  const { data: pkg, error } = await ctx.supabase
    .from('packages')
    .insert({
      business_id: ctx.businessId,
      slug,
      duration_days: numOrNull(formData.get('durationDays')),
      duration_nights: numOrNull(formData.get('durationNights')),
      price_from: numOrNull(formData.get('priceFrom')),
      currency: String(formData.get('currency') ?? 'USD').slice(0, 3).toUpperCase(),
      price_unit: String(formData.get('priceUnit') ?? 'per_person'),
      max_group_size: numOrNull(formData.get('maxGroupSize')),
      min_travelers: numOrNull(formData.get('minTravelers')),
      // Drafts by default: publishing is a separate, deliberate action so a
      // half-written package cannot reach the public site by submitting early.
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'slugTaken' };
    console.error('[packages] create failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('package_translations').insert({
    package_id: pkg.id,
    locale,
    title,
    summary: strOrNull(formData.get('summary')),
    description: strOrNull(formData.get('description')),
    itinerary: strOrNull(formData.get('itinerary')),
  });

  if (trErr) {
    // Without a translation the package has no title in any language, so it
    // would be unreadable and uneditable. Roll it back.
    await ctx.supabase.from('packages').delete().eq('id', pkg.id);
    console.error('[packages] translation failed', trErr.message);
    return { error: 'generic' };
  }

  // Not fatal if it fails: the package exists and is editable, and losing the
  // whole creation over a link table would be a worse outcome than a trip the
  // operator has to attach on the next save.
  await setPackageDestinations(
    ctx.supabase,
    pkg.id,
    formData.getAll('destinationIds').map(String).filter(Boolean),
  );

  revalidatePath('/dashboard/packages');
  redirect(`/dashboard/packages/${pkg.id}`);
}

export async function updatePackage(
  _prev: PackageState,
  formData: FormData,
): Promise<PackageState> {
  const ctx = await myBusiness();
  if (!ctx) return { error: 'noBusiness' };

  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'titleRequired' };

  const localeInput = String(formData.get('locale') ?? 'en');
  const locale: Locale = locales.includes(localeInput as Locale) ? (localeInput as Locale) : 'en';

  const { error } = await ctx.supabase
    .from('packages')
    .update({
      duration_days: numOrNull(formData.get('durationDays')),
      duration_nights: numOrNull(formData.get('durationNights')),
      price_from: numOrNull(formData.get('priceFrom')),
      currency: String(formData.get('currency') ?? 'USD').slice(0, 3).toUpperCase(),
      price_unit: String(formData.get('priceUnit') ?? 'per_person'),
      max_group_size: numOrNull(formData.get('maxGroupSize')),
      min_travelers: numOrNull(formData.get('minTravelers')),
    })
    .eq('id', id);

  if (error) {
    console.error('[packages] update failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('package_translations').upsert(
    {
      package_id: id,
      locale,
      title,
      summary: strOrNull(formData.get('summary')),
      description: strOrNull(formData.get('description')),
      itinerary: strOrNull(formData.get('itinerary')),
    },
    { onConflict: 'package_id,locale' },
  );

  if (trErr) {
    console.error('[packages] translation upsert failed', trErr.message);
    return { error: 'generic' };
  }

  const linked = await setPackageDestinations(
    ctx.supabase,
    id,
    formData.getAll('destinationIds').map(String).filter(Boolean),
  );
  if (!linked) return { error: 'generic' };

  revalidatePath('/dashboard/packages');
  // Package pages are statically generated, so an edit is invisible on the
  // public site until its path is invalidated. Destination pages list these
  // trips, so they need the same treatment or a newly attached trip stays
  // invisible on exactly the page it was attached for.
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Publishes or unpublishes a package. */
export async function setPackageStatus(
  id: string,
  status: 'draft' | 'published' | 'archived',
): Promise<PackageState> {
  const ctx = await myBusiness();
  if (!ctx) return { error: 'noBusiness' };

  const { error } = await ctx.supabase
    .from('packages')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    console.error('[packages] status change failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/packages');
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Removes a package.
 *
 * Soft-deleted. A published package may already be linked from an enquiry the
 * traveler is still reading, and the row carries the price that was quoted.
 */
export async function deletePackage(id: string): Promise<PackageState> {
  const ctx = await myBusiness();
  if (!ctx) return { error: 'noBusiness' };

  const { error } = await ctx.supabase
    .from('packages')
    .update({ deleted_at: new Date().toISOString(), status: 'archived' })
    .eq('id', id);

  if (error) {
    console.error('[packages] delete failed', error.message);
    return { error: 'generic' };
  }

  revalidatePath('/dashboard/packages');
  revalidatePath('/', 'layout');
  return { success: true };
}
