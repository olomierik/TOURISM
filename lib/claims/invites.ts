import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { hashInviteToken, isInviteToken } from '@/lib/claims/invite-token';

export type InviteLookup =
  | { status: 'valid'; email: string; expiresAt: string }
  | { status: 'used'; email: string; usedBy: string | null }
  | { status: 'expired'; email: string }
  | { status: 'invalid' };

/**
 * What a claim link's token is worth for this listing.
 *
 * A token for another listing reads as invalid, not as "used" or "expired":
 * the page should tell a stranger nothing about links it did not receive.
 */
export async function lookupInvite(businessId: string, token: string): Promise<InviteLookup> {
  if (!isInviteToken(token)) return { status: 'invalid' };

  const { data } = await createAdminClient()
    .from('claim_invites')
    .select('email, expires_at, used_at, used_by')
    .eq('token_hash', hashInviteToken(token))
    .eq('business_id', businessId)
    .maybeSingle();

  if (!data) return { status: 'invalid' };
  if (data.used_at) return { status: 'used', email: data.email, usedBy: data.used_by };
  if (new Date(data.expires_at) <= new Date()) return { status: 'expired', email: data.email };
  return { status: 'valid', email: data.email, expiresAt: data.expires_at };
}
