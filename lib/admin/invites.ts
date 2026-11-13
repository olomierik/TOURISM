'use server';

import { audit, requireAdmin, UUID_RE } from '@/lib/admin/guard';

/**
 * Notes that an admin opened a WhatsApp claim invitation for a listing.
 *
 * "Opened", not "sent": the message is sent from the admin's own WhatsApp and
 * this side cannot see whether they pressed send. It is recorded so two admins
 * do not message the same operator, and so the invitation has a date.
 */
export async function recordWhatsAppInvite(businessId: string): Promise<void> {
  if (!UUID_RE.test(businessId)) return;
  const ctx = await requireAdmin();
  if (!ctx) return;
  await audit(ctx, {
    action: 'business.whatsapp_invite_opened',
    entityType: 'business',
    entityId: businessId,
  });
}
