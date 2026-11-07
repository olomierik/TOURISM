'use server';

import { revalidatePath } from 'next/cache';

import type { CrudState } from '@/lib/admin/crud';
import { audit, requireAdmin, safeTerm, UUID_RE } from '@/lib/admin/guard';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Enhanced visibility, sold or granted by an admin.
 *
 * A boost is one `featured_listings` row. Nothing here invents a new table:
 * migration 008 built the placement model — scoped, time-boxed, admin-only by
 * RLS — and lead matching (012) already ranks a live boost above an equal
 * operator without one. What was missing was any way to create a row, and any
 * public page that read it. See lib/queries/boosts.ts for the reading side.
 */

const SCOPES = new Set(['homepage', 'directory', 'destination', 'category']);
/** Offered durations, in days. 0 = until switched off. */
const DURATIONS = new Set([7, 14, 30, 60, 90, 180, 365, 0]);

function refreshPublic() {
  // The directory, category and combination pages are statically generated,
  // so a boost that did not invalidate them would appear at the next deploy.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/featured');
}

export async function boostBusiness(_prev: CrudState, formData: FormData): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const businessId = String(formData.get('businessId') ?? '');
  const scope = String(formData.get('scope') ?? '');
  const destinationId = String(formData.get('destinationId') ?? '') || null;
  const categoryId = String(formData.get('categoryId') ?? '') || null;
  const days = Number(formData.get('days') ?? 30);
  const position = Math.round(Number(formData.get('position') ?? 1));
  const note = String(formData.get('note') ?? '').trim().slice(0, 500) || null;

  if (!UUID_RE.test(businessId)) return { error: 'invalid' };
  if (!SCOPES.has(scope)) return { error: 'invalid' };
  if (!DURATIONS.has(days)) return { error: 'invalid' };
  if (!Number.isFinite(position) || position < 1 || position > 99) return { error: 'invalid' };
  // A scoped boost with nothing to scope to would silently apply nowhere.
  if (scope === 'destination' && !(destinationId && UUID_RE.test(destinationId))) {
    return { error: 'invalid' };
  }
  if (scope === 'category' && !(categoryId && UUID_RE.test(categoryId))) {
    return { error: 'invalid' };
  }

  const { data: business } = await ctx.supabase
    .from('businesses')
    .select('id, name, status')
    .eq('id', businessId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!business) return { error: 'notFound' };

  const startsAt = new Date();
  const endsAt = days > 0 ? new Date(startsAt.getTime() + days * 86_400_000) : null;

  const { data: row, error } = await ctx.supabase
    .from('featured_listings')
    .insert({
      business_id: businessId,
      placement: scope,
      destination_id: scope === 'destination' ? destinationId : null,
      category_id: scope === 'category' ? categoryId : null,
      // Position 1 sorts first; stored as the existing `priority` column.
      priority: position,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      created_by: ctx.userId,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !row) {
    console.error('[admin] boost failed', error?.message);
    return { error: 'generic' };
  }

  // The note is where "paid US$75 by M-Pesa, ref QX12…" lives. It goes in the
  // audit trail rather than a new column: the record of what was sold should
  // be append-only, and audit_logs already is.
  await audit(ctx, {
    action: 'business.boosted',
    entityType: 'business',
    entityId: businessId,
    after: {
      featured_listing_id: row.id,
      scope,
      destination_id: destinationId,
      category_id: categoryId,
      position,
      days,
      ends_at: endsAt?.toISOString() ?? null,
      note,
      business_status: business.status,
    } as Json,
  });

  refreshPublic();
  revalidatePath(`/admin/businesses/${businessId}`);
  return { success: true, id: row.id };
}

/** Switches a boost off now. The row stays, so the history of what ran does too. */
export async function endBoost(featuredListingId: string): Promise<CrudState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };
  if (!UUID_RE.test(featuredListingId)) return { error: 'invalid' };

  const { data: row, error } = await ctx.supabase
    .from('featured_listings')
    .update({ is_active: false })
    .eq('id', featuredListingId)
    .select('business_id')
    .single();

  if (error || !row) {
    console.error('[admin] end boost failed', error?.message);
    return { error: 'generic' };
  }

  await audit(ctx, {
    action: 'business.boost_ended',
    entityType: 'business',
    entityId: row.business_id,
    after: { featured_listing_id: featuredListingId } as Json,
  });

  refreshPublic();
  revalidatePath(`/admin/businesses/${row.business_id}`);
  return { success: true };
}

export type BusinessLookupHit = {
  id: string;
  name: string;
  place: string | null;
  email: string | null;
  claimed: boolean;
  status: string;
};

/**
 * Name/city/email/slug search for the admin pickers: choosing a business to
 * boost, or to forward an enquiry to. Every country and every status, because
 * the business an admin is looking for is often the one the directory hides.
 */
export async function lookupBusinesses(q: string): Promise<BusinessLookupHit[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];
  const term = safeTerm(q);
  if (term.length < 2) return [];

  const { data, error } = await ctx.supabase
    .from('businesses')
    .select('id, name, city, country_code, email, owner_id, status')
    .is('deleted_at', null)
    .or(`name.ilike.%${term}%,city.ilike.%${term}%,email.ilike.%${term}%,slug.ilike.%${term}%`)
    .order('name')
    .limit(12);

  if (error) {
    console.error('[admin] business lookup failed', error.message);
    return [];
  }

  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    place: [b.city, b.country_code].filter(Boolean).join(', ') || null,
    email: b.email,
    claimed: b.owner_id !== null,
    status: b.status,
  }));
}
