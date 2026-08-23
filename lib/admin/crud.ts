'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { locales, type Locale } from '@/i18n/routing';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Create, edit and delete for the content an administrator owns: guides,
 * destinations and business listings.
 *
 * Separate from actions.ts, which is moderation — approving, verifying,
 * suspending. Those act on something a business owner created and are about
 * judgement; these create and destroy records outright. Keeping them apart makes
 * it obvious which operations can lose data.
 *
 * Deletes here are soft wherever the table supports it. A destination with
 * businesses attached, or a guide that has accumulated inbound links, should
 * stop being public without the row and its translations disappearing — an
 * accidental hard delete of a destination would cascade into every listing
 * pointing at it.
 */

export type CrudState = {
  error?: 'notAllowed' | 'slugTaken' | 'nameRequired' | 'notFound' | 'generic';
  success?: boolean;
  id?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return { supabase, admin: createAdminClient(), userId: user.id };
}

async function audit(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  entry: { action: string; entityType: string; entityId: string; after?: Json },
) {
  try {
    await admin.from('audit_logs').insert({
      actor_id: actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      after: entry.after ?? null,
    });
  } catch (err) {
    console.error('[audit] write failed', entry.action, err);
  }
}

/** URL-safe slug from a title, with diacritics folded rather than dropped. */
function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function refresh() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
}

// ---------------------------------------------------------------------------
// Destinations
// ---------------------------------------------------------------------------

/**
 * Creates a destination with its English translation.
 *
 * Only English is required at creation. Demanding all four languages up front
 * would mean a destination cannot exist until someone has translated it, which
 * in practice means it does not get created. The other locales are added later
 * through the same edit form, and the hreflang layer advertises only the ones
 * that exist.
 */
export async function createDestination(
  _prev: CrudState,
  formData: FormData,
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'nameRequired' };

  const slug = slugify(String(formData.get('slug') ?? '') || name);
  const key = slugify(String(formData.get('key') ?? '') || name);

  const { data: dest, error } = await ctx.supabase
    .from('destinations')
    .insert({
      key,
      latitude: numberOrNull(formData.get('latitude')),
      longitude: numberOrNull(formData.get('longitude')),
      is_featured: formData.get('isFeatured') === 'on',
      is_active: formData.get('isActive') !== null,
      sort_order: Number(formData.get('sortOrder') ?? 0) || 0,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'slugTaken' };
    console.error('[admin] destination create failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('destination_translations').insert({
    destination_id: dest.id,
    locale: 'en',
    name,
    slug,
    summary: strOrNull(formData.get('summary')),
    description: strOrNull(formData.get('description')),
    travel_tips: strOrNull(formData.get('travelTips')),
    best_time: strOrNull(formData.get('bestTime')),
  });

  if (trErr) {
    // Without a translation the destination has no name and no URL in any
    // locale, so it would be invisible and uneditable. Roll it back rather than
    // leaving an unreachable row behind.
    await ctx.supabase.from('destinations').delete().eq('id', dest.id);
    if (trErr.code === '23505') return { error: 'slugTaken' };
    console.error('[admin] destination translation failed', trErr.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: 'destination.created',
    entityType: 'destination',
    entityId: dest.id,
    after: { key, name, slug } as Json,
  });

  refresh();
  redirect(`/admin/destinations/${dest.id}`);
}

/** Updates a destination and one locale's translation. */
export async function updateDestination(
  _prev: CrudState,
  formData: FormData,
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const id = String(formData.get('id') ?? '');
  const localeInput = String(formData.get('locale') ?? 'en');
  const locale: Locale = locales.includes(localeInput as Locale) ? (localeInput as Locale) : 'en';

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'nameRequired' };

  const { error } = await ctx.supabase
    .from('destinations')
    .update({
      latitude: numberOrNull(formData.get('latitude')),
      longitude: numberOrNull(formData.get('longitude')),
      is_featured: formData.get('isFeatured') !== null,
      is_active: formData.get('isActive') !== null,
      sort_order: Number(formData.get('sortOrder') ?? 0) || 0,
    })
    .eq('id', id);

  if (error) {
    console.error('[admin] destination update failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('destination_translations').upsert(
    {
      destination_id: id,
      locale,
      name,
      slug: slugify(String(formData.get('slug') ?? '') || name),
      summary: strOrNull(formData.get('summary')),
      description: strOrNull(formData.get('description')),
      travel_tips: strOrNull(formData.get('travelTips')),
      best_time: strOrNull(formData.get('bestTime')),
    },
    { onConflict: 'destination_id,locale' },
  );

  if (trErr) {
    if (trErr.code === '23505') return { error: 'slugTaken' };
    console.error('[admin] destination translation failed', trErr.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: 'destination.updated',
    entityType: 'destination',
    entityId: id,
    after: { locale, name } as Json,
  });

  refresh();
  return { success: true, id };
}

/**
 * Retires a destination.
 *
 * Soft by default: sets deleted_at and clears is_active, which removes it from
 * the site and the sitemap while leaving every business_destinations row intact.
 * A hard delete cascades into those rows and would silently detach listings from
 * the place they operate in, so it is available only with an explicit flag.
 */
export async function deleteDestination(
  id: string,
  { hard = false }: { hard?: boolean } = {},
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { error } = hard
    ? await ctx.supabase.from('destinations').delete().eq('id', id)
    : await ctx.supabase
        .from('destinations')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);

  if (error) {
    console.error('[admin] destination delete failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: hard ? 'destination.deleted' : 'destination.retired',
    entityType: 'destination',
    entityId: id,
  });

  refresh();
  return { success: true };
}

/** Brings a soft-deleted destination back. */
export async function restoreDestination(id: string): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { error } = await ctx.supabase
    .from('destinations')
    .update({ deleted_at: null, is_active: true })
    .eq('id', id);

  if (error) return { error: 'generic' };

  await audit(ctx.admin, ctx.userId, {
    action: 'destination.restored',
    entityType: 'destination',
    entityId: id,
  });

  refresh();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Guides
// ---------------------------------------------------------------------------

/** Creates a guide as a draft with its English translation. */
export async function createGuide(_prev: CrudState, formData: FormData): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'nameRequired' };

  const { data: guide, error } = await ctx.supabase
    .from('guides')
    .insert({
      author_id: ctx.userId,
      // New guides start as drafts regardless of what the form says. Publishing
      // is a separate, deliberate action, so a half-written guide cannot reach
      // the sitemap because someone submitted the form early.
      status: 'draft',
      primary_destination_id: strOrNull(formData.get('destinationId')),
      primary_category_id: strOrNull(formData.get('categoryId')),
      reading_minutes: Number(formData.get('readingMinutes') ?? 0) || null,
      is_featured: formData.get('isFeatured') !== null,
      allow_ads: formData.get('allowAds') !== null,
      sort_order: Number(formData.get('sortOrder') ?? 0) || 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[admin] guide create failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('guide_translations').insert({
    guide_id: guide.id,
    locale: 'en',
    title,
    slug: slugify(String(formData.get('slug') ?? '') || title),
    excerpt: strOrNull(formData.get('excerpt')),
    body: String(formData.get('body') ?? ''),
    seo_title: strOrNull(formData.get('seoTitle')) ?? title,
    seo_description: strOrNull(formData.get('seoDescription')),
  });

  if (trErr) {
    await ctx.supabase.from('guides').delete().eq('id', guide.id);
    if (trErr.code === '23505') return { error: 'slugTaken' };
    console.error('[admin] guide translation failed', trErr.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: 'guide.created',
    entityType: 'guide',
    entityId: guide.id,
    after: { title } as Json,
  });

  refresh();
  redirect(`/admin/guides/${guide.id}`);
}

/** Updates a guide and one locale's translation. */
export async function updateGuide(_prev: CrudState, formData: FormData): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const id = String(formData.get('id') ?? '');
  const localeInput = String(formData.get('locale') ?? 'en');
  const locale: Locale = locales.includes(localeInput as Locale) ? (localeInput as Locale) : 'en';

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'nameRequired' };

  const { error } = await ctx.supabase
    .from('guides')
    .update({
      primary_destination_id: strOrNull(formData.get('destinationId')),
      primary_category_id: strOrNull(formData.get('categoryId')),
      reading_minutes: Number(formData.get('readingMinutes') ?? 0) || null,
      is_featured: formData.get('isFeatured') !== null,
      allow_ads: formData.get('allowAds') !== null,
      sort_order: Number(formData.get('sortOrder') ?? 0) || 0,
    })
    .eq('id', id);

  if (error) {
    console.error('[admin] guide update failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('guide_translations').upsert(
    {
      guide_id: id,
      locale,
      title,
      slug: slugify(String(formData.get('slug') ?? '') || title),
      excerpt: strOrNull(formData.get('excerpt')),
      body: String(formData.get('body') ?? ''),
      seo_title: strOrNull(formData.get('seoTitle')) ?? title,
      seo_description: strOrNull(formData.get('seoDescription')),
    },
    { onConflict: 'guide_id,locale' },
  );

  if (trErr) {
    if (trErr.code === '23505') return { error: 'slugTaken' };
    console.error('[admin] guide translation failed', trErr.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: 'guide.updated',
    entityType: 'guide',
    entityId: id,
    after: { locale, title } as Json,
  });

  refresh();
  return { success: true, id };
}

/** Removes one locale's translation of a guide. */
export async function deleteGuideTranslation(
  guideId: string,
  locale: Locale,
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  // English is the source text every other locale is a translation of, and the
  // fallback when a locale is missing. Removing it would leave the guide with no
  // canonical version.
  if (locale === 'en') return { error: 'notAllowed' };

  const { error } = await ctx.supabase
    .from('guide_translations')
    .delete()
    .eq('guide_id', guideId)
    .eq('locale', locale);

  if (error) return { error: 'generic' };

  await audit(ctx.admin, ctx.userId, {
    action: 'guide.translation_deleted',
    entityType: 'guide',
    entityId: guideId,
    after: { locale } as Json,
  });

  refresh();
  return { success: true };
}

/** Soft-deletes a guide, or removes it outright with an explicit flag. */
export async function deleteGuide(
  id: string,
  { hard = false }: { hard?: boolean } = {},
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { error } = hard
    ? await ctx.supabase.from('guides').delete().eq('id', id)
    : await ctx.supabase
        .from('guides')
        .update({ deleted_at: new Date().toISOString(), status: 'draft' })
        .eq('id', id);

  if (error) {
    console.error('[admin] guide delete failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: hard ? 'guide.deleted' : 'guide.retired',
    entityType: 'guide',
    entityId: id,
  });

  refresh();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

/**
 * Creates a business listing on behalf of an operator.
 *
 * The admin path exists because most Tanzanian operators will be added by
 * someone at a desk from a phone call or a WhatsApp message, not by the operator
 * signing up. owner_id is left null until a real person claims the listing —
 * inventing an account for them would create a login nobody controls.
 */
export async function createBusinessAsAdmin(
  _prev: CrudState,
  formData: FormData,
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'nameRequired' };

  const { data: biz, error } = await ctx.supabase
    .from('businesses')
    .insert({
      owner_id: strOrNull(formData.get('ownerId')),
      name,
      slug: slugify(String(formData.get('slug') ?? '') || name),
      legal_name: strOrNull(formData.get('legalName')),
      email: strOrNull(formData.get('email')),
      phone: strOrNull(formData.get('phone')),
      whatsapp: strOrNull(formData.get('whatsapp')),
      website: strOrNull(formData.get('website')),
      address: strOrNull(formData.get('address')),
      city: strOrNull(formData.get('city')),
      license_number: strOrNull(formData.get('licenseNumber')),
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'slugTaken' };
    console.error('[admin] business create failed', error.message);
    return { error: 'generic' };
  }

  await ctx.supabase.from('business_translations').insert({
    business_id: biz.id,
    locale: 'en',
    tagline: strOrNull(formData.get('tagline')),
    short_description: strOrNull(formData.get('shortDescription')),
    description: strOrNull(formData.get('description')),
  });

  await audit(ctx.admin, ctx.userId, {
    action: 'business.created',
    entityType: 'business',
    entityId: biz.id,
    after: { name } as Json,
  });

  refresh();
  redirect(`/admin/businesses/${biz.id}`);
}

/** Updates a business listing and its English copy. */
export async function updateBusinessAsAdmin(
  _prev: CrudState,
  formData: FormData,
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'nameRequired' };

  const localeInput = String(formData.get('locale') ?? 'en');
  const locale: Locale = locales.includes(localeInput as Locale) ? (localeInput as Locale) : 'en';

  const { error } = await ctx.supabase
    .from('businesses')
    .update({
      name,
      slug: slugify(String(formData.get('slug') ?? '') || name),
      legal_name: strOrNull(formData.get('legalName')),
      email: strOrNull(formData.get('email')),
      phone: strOrNull(formData.get('phone')),
      whatsapp: strOrNull(formData.get('whatsapp')),
      website: strOrNull(formData.get('website')),
      address: strOrNull(formData.get('address')),
      city: strOrNull(formData.get('city')),
      license_number: strOrNull(formData.get('licenseNumber')),
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') return { error: 'slugTaken' };
    console.error('[admin] business update failed', error.message);
    return { error: 'generic' };
  }

  const { error: trErr } = await ctx.supabase.from('business_translations').upsert(
    {
      business_id: id,
      locale,
      tagline: strOrNull(formData.get('tagline')),
      short_description: strOrNull(formData.get('shortDescription')),
      description: strOrNull(formData.get('description')),
    },
    { onConflict: 'business_id,locale' },
  );

  if (trErr) {
    console.error('[admin] business translation failed', trErr.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: 'business.updated',
    entityType: 'business',
    entityId: id,
    after: { name, locale } as Json,
  });

  refresh();
  return { success: true, id };
}

/**
 * Removes a business listing.
 *
 * Soft by default. A hard delete cascades into its leads, which is where the
 * record of who enquired and what was quoted lives — losing that to a misclick
 * on a listing screen would be the worst data loss available in this admin.
 */
export async function deleteBusinessAsAdmin(
  id: string,
  { hard = false }: { hard?: boolean } = {},
): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const { error } = hard
    ? await ctx.supabase.from('businesses').delete().eq('id', id)
    : await ctx.supabase
        .from('businesses')
        .update({ deleted_at: new Date().toISOString(), status: 'suspended' })
        .eq('id', id);

  if (error) {
    console.error('[admin] business delete failed', error.message);
    return { error: 'generic' };
  }

  await audit(ctx.admin, ctx.userId, {
    action: hard ? 'business.deleted' : 'business.retired',
    entityType: 'business',
    entityId: id,
  });

  refresh();
  return { success: true };
}

// ---------------------------------------------------------------------------

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s.length ? s : null;
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
