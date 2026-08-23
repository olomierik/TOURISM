'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type FavoriteState = { saved: boolean; requiresLogin?: boolean };

/**
 * Toggles a saved business or package.
 *
 * Runs as the signed-in user rather than through the admin client, so RLS is the
 * thing enforcing "you may only touch your own favorites" — no ownership check
 * is duplicated here, because a duplicated check is one that can drift.
 *
 * A signed-out visitor gets `requiresLogin` instead of an error: wanting to save
 * something is a perfectly reasonable thing to do before having an account, and
 * the UI turns it into a prompt rather than a failure.
 */
export async function toggleFavorite(input: {
  businessId?: string;
  packageId?: string;
}): Promise<FavoriteState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { saved: false, requiresLogin: true };

  const column = input.businessId ? 'business_id' : 'package_id';
  const value = input.businessId ?? input.packageId;
  if (!value) return { saved: false };

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('profile_id', user.id)
    .eq(column, value)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    revalidatePath('/account');
    return { saved: false };
  }

  const { error } = await supabase.from('favorites').insert({
    profile_id: user.id,
    business_id: input.businessId ?? null,
    package_id: input.packageId ?? null,
  });

  if (error) {
    console.error('[favorites] insert failed', error.message);
    return { saved: false };
  }

  revalidatePath('/account');
  return { saved: true };
}

/** Whether the current user has saved a given business or package. */
export async function isFavorited(input: {
  businessId?: string;
  packageId?: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const column = input.businessId ? 'business_id' : 'package_id';
  const value = input.businessId ?? input.packageId;
  if (!value) return false;

  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('profile_id', user.id)
    .eq(column, value)
    .maybeSingle();

  return Boolean(data);
}
