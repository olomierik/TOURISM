'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { deliverOutreach, NO_MAILER, outreachConfig } from '@/lib/outreach/deliver';
import { requireOutreachAdmin } from '@/lib/outreach/guard';

/**
 * Send one outreach message, now, from the admin console: one business, from
 * a page where an admin is looking at its name and address. For a failure to
 * retry, a corrected address, or one operator worth contacting today. The
 * sending itself, and every guard on it, is lib/outreach/deliver.ts.
 */

export type SendOneState = { error?: string; done?: string };

export async function sendOneOutreach(
  _prev: SendOneState,
  formData: FormData,
): Promise<SendOneState> {
  if (!(await requireOutreachAdmin())) return { error: 'Not authorised.' };

  const businessId = String(formData.get('businessId') ?? '');
  if (!businessId) return { error: 'No business given.' };

  const config = outreachConfig();
  if (!config) return { error: NO_MAILER };

  // Admin client: this writes outreach rows and claim invites, which the
  // cookie-bound client cannot under RLS.
  const result = await deliverOutreach(createAdminClient(), businessId, config);
  revalidatePath('/admin/outreach/unreached');
  return result.kind === 'sent'
    ? { done: `Sent to ${result.name}.` }
    : { error: result.reason };
}
