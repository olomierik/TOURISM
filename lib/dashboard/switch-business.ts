'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { ACTIVE_BUSINESS_COOKIE, listOwnedBusinesses } from '@/lib/dashboard/active-business';

/** Switches the dashboard to another of the signed-in owner's listings. */
export async function switchBusiness(formData: FormData): Promise<void> {
  const id = String(formData.get('businessId') ?? '');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const owned = await listOwnedBusinesses(supabase, user.id);
  if (!owned.some((b) => b.id === id)) return;
  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
}
