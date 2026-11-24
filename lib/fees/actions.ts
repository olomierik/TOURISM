'use server';

import { revalidatePath } from 'next/cache';

import { audit, requireAdmin, UUID_RE } from '@/lib/admin/guard';

export type FeeActionState = { success?: boolean; error?: 'notAllowed' | 'invalid' | 'generic' };

/** Admin: a guide paid (with the bank or mobile money reference), or the fee is waived. */
export async function settleFee(feeId: string, outcome: 'paid' | 'waived', reference: string): Promise<FeeActionState> {
  const ctx = await requireAdmin();
  if (!ctx || !UUID_RE.test(feeId)) return { error: 'notAllowed' };
  const ref = reference.trim().slice(0, 200) || null;
  const { error } = await ctx.admin
    .from('platform_fees')
    .update({
      status: outcome,
      paid_at: outcome === 'paid' ? new Date().toISOString() : null,
      paid_reference: outcome === 'paid' ? ref : null,
      note: outcome === 'waived' ? ref : null,
    })
    .eq('id', feeId);
  if (error) return { error: 'generic' };
  await audit(ctx, { action: `fee.${outcome}`, entityType: 'platform_fee', entityId: feeId, after: { reference: ref } });
  revalidatePath('/admin/fees');
  revalidatePath('/dashboard/fees');
  return { success: true };
}

/** Admin: the fee per traveller for new bookings (existing fees keep theirs). */
export async function setFeePerPerson(amount: number, currency: string): Promise<FeeActionState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000 || !/^[A-Z]{3}$/.test(currency)) return { error: 'invalid' };
  const value = { amount: Math.round(amount * 100) / 100, currency };
  const { error } = await ctx.admin
    .from('platform_settings')
    .upsert({ key: 'group_trip_fee_per_person', value, updated_by: ctx.userId, updated_at: new Date().toISOString() });
  if (error) return { error: 'generic' };
  await audit(ctx, { action: 'settings.group_trip_fee_per_person', entityType: 'platform_settings', entityId: 'group_trip_fee_per_person', after: value });
  revalidatePath('/admin/fees');
  return { success: true };
}
