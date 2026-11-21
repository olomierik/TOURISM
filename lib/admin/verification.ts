'use server';

import { revalidatePath } from 'next/cache';

import { audit, requireAdmin, UUID_RE } from '@/lib/admin/guard';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Recording what an administrator checked before a listing is called
 * verified (SEO brief T14, migration 093). The public chip lists exactly these
 * checks, so each one is stamped with when it was done; the licence check also
 * records who did it and against what source.
 *
 * Owners cannot write any of these: the business guard preserves them.
 */

export type VerificationState = { error?: string; success?: boolean };

const clean = (v: FormDataEntryValue | null, max = 120) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

export async function saveVerification(_prev: VerificationState, form: FormData): Promise<VerificationState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Please sign in as an administrator.' };

  const id = String(form.get('businessId') ?? '');
  if (!UUID_RE.test(id)) return { error: 'Unknown listing.' };

  const { data: before } = await ctx.supabase
    .from('businesses')
    .select('license_number, license_checked_at, registration_number, registration_checked_at, identity_checked_at, is_verified')
    .eq('id', id)
    .maybeSingle();
  if (!before) return { error: 'Unknown listing.' };

  const now = new Date().toISOString();
  const licenseChecked = form.get('licenseChecked') === 'on';
  const registrationChecked = form.get('registrationChecked') === 'on';
  const identityChecked = form.get('identityChecked') === 'on';
  const verified = form.get('verified') === 'on';
  const licenseNumber = clean(form.get('licenseNumber'));
  const registrationNumber = clean(form.get('registrationNumber'));

  if (verified && !licenseChecked && !registrationChecked) {
    return { error: 'Record at least a licence or a registration check before marking the listing verified.' };
  }

  // A check keeps its original date while it stays ticked; unticking clears it.
  const stamp = (on: boolean, prev: string | null) => (on ? (prev ?? now) : null);

  const update = {
    license_number: licenseNumber,
    license_checked_at: stamp(licenseChecked, licenseNumber === before.license_number ? before.license_checked_at : null),
    license_checked_by: licenseChecked ? ctx.userId : null,
    license_checked_source: licenseChecked ? clean(form.get('licenseSource')) : null,
    registration_number: registrationNumber,
    registration_checked_at: stamp(
      registrationChecked,
      registrationNumber === before.registration_number ? before.registration_checked_at : null,
    ),
    identity_checked_at: stamp(identityChecked, before.identity_checked_at),
    verification_notes: clean(form.get('notes'), 1000),
    is_verified: verified,
    verified_by: verified ? ctx.userId : null,
    verified_at: verified ? (before.is_verified ? undefined : now) : null,
  };

  const { error } = await ctx.supabase.from('businesses').update(update).eq('id', id);
  if (error) {
    console.error('[admin] verification save failed', error.message);
    return { error: 'That could not be saved. Please try again.' };
  }

  await audit(ctx, {
    action: 'business.verification_recorded',
    entityType: 'business',
    entityId: id,
    before: before as unknown as Json,
    after: { licenseChecked, registrationChecked, identityChecked, verified } as Json,
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

/** The address or pin was looked at and is right (or was corrected): show the map again. */
export async function markLocationReviewed(businessId: string): Promise<VerificationState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'Please sign in as an administrator.' };
  if (!UUID_RE.test(businessId)) return { error: 'Unknown listing.' };

  const { error } = await ctx.supabase
    .from('businesses')
    .update({ location_reviewed_at: new Date().toISOString() })
    .eq('id', businessId);
  if (error) return { error: 'That could not be saved. Please try again.' };

  await audit(ctx, { action: 'business.location_reviewed', entityType: 'business', entityId: businessId });
  revalidatePath('/', 'layout');
  return { success: true };
}
