'use server';

import { revalidatePath } from 'next/cache';

import { audit, requireAdmin, UUID_RE, type AdminContext } from '@/lib/admin/guard';
import { addressFor, forwardEmail, sendAndRecord, type LeadForEmail } from '@/lib/leads/delivery';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Sending an enquiry to a business by hand.
 *
 * For the enquiry that matched nobody, matched five operators with no email
 * address, or matched the wrong five. The admin picks any business — any
 * country, claimed or not — and the enquiry is added to that business's
 * dashboard (a `lead_businesses` row, so it counts and is tracked like any
 * other) and emailed to it with the trip in the body.
 */

export type ForwardState = {
  error?: 'notAllowed' | 'invalid' | 'notFound' | 'generic';
  success?: boolean;
  /** Per business, for the confirmation. */
  results?: Array<{ name: string; outcome: 'emailed' | 'failed' | 'unreachable' | 'already' }>;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  owner_id: string | null;
};

async function loadLead(ctx: AdminContext, leadId: string) {
  const { data } = await ctx.supabase
    .from('leads')
    .select(
      `id, reference, status, full_name, email, phone, whatsapp, travel_start, travel_end,
       dates_flexible, adults, children, budget_min, budget_max, budget_currency,
       interests, message, destination_other, locale,
       destinations (destination_translations (locale, name)),
       categories (category_translations (locale, name))`,
    )
    .eq('id', leadId)
    .maybeSingle();
  if (!data) return null;
  const en = (rows: Array<{ locale: string; name: string }> | undefined) =>
    rows?.find((r) => r.locale === 'en')?.name ?? rows?.[0]?.name ?? null;
  const lead: LeadForEmail & { id: string; status: string; locale: string } = {
    ...data,
    budget_min: data.budget_min === null ? null : Number(data.budget_min),
    budget_max: data.budget_max === null ? null : Number(data.budget_max),
    destinationName: en(data.destinations?.destination_translations),
    categoryName: en(data.categories?.category_translations),
  };
  return lead;
}

/** Email one business about one enquiry and record how it went. */
async function deliver(
  ctx: AdminContext,
  lead: NonNullable<Awaited<ReturnType<typeof loadLead>>>,
  business: BusinessRow,
  opts: { overrideEmail: string | null; includeContact: boolean; note: string | null },
) {
  const to = opts.overrideEmail ?? (await addressFor(ctx.admin, business));
  return sendAndRecord(ctx.admin, {
    leadId: lead.id,
    businessId: business.id,
    to,
    message: forwardEmail({
      lead,
      businessName: business.name,
      businessSlug: business.slug,
      claimed: business.owner_id !== null,
      includeContact: opts.includeContact,
      note: opts.note,
      locale: lead.locale,
    }),
    via: 'admin',
    actorId: ctx.userId,
  });
}

function readOptions(formData: FormData) {
  const rawEmail = String(formData.get('overrideEmail') ?? '').trim().toLowerCase();
  return {
    overrideEmail: rawEmail || null,
    saveEmail: formData.get('saveEmail') === 'on',
    includeContact: formData.get('includeContact') === 'on',
    note: String(formData.get('note') ?? '').trim().slice(0, 1000) || null,
  };
}

export async function forwardLead(_prev: ForwardState, formData: FormData): Promise<ForwardState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const leadId = String(formData.get('leadId') ?? '');
  const businessIds = [
    ...new Set(formData.getAll('businessIds').map(String).filter((id) => UUID_RE.test(id))),
  ].slice(0, 10);
  const opts = readOptions(formData);

  if (!UUID_RE.test(leadId) || businessIds.length === 0) return { error: 'invalid' };
  if (opts.overrideEmail && !EMAIL_RE.test(opts.overrideEmail)) return { error: 'invalid' };
  // One typed address cannot belong to several businesses at once.
  if (opts.overrideEmail && businessIds.length > 1) return { error: 'invalid' };

  const lead = await loadLead(ctx, leadId);
  if (!lead) return { error: 'notFound' };

  const { data: businesses } = await ctx.supabase
    .from('businesses')
    .select('id, name, slug, email, owner_id')
    .in('id', businessIds)
    .is('deleted_at', null);
  if (!businesses?.length) return { error: 'notFound' };

  const { data: existing } = await ctx.supabase
    .from('lead_businesses')
    .select('business_id, rank')
    .eq('lead_id', leadId);
  const already = new Set((existing ?? []).map((r) => r.business_id));
  let nextRank = Math.max(0, ...(existing ?? []).map((r) => r.rank)) + 1;

  const results: NonNullable<ForwardState['results']> = [];

  for (const business of businesses) {
    // Already a recipient: forwarding again is a resend, not a second row —
    // `unique (lead_id, business_id)` would refuse it anyway, and the
    // operator's dashboard should show one enquiry, not two.
    if (!already.has(business.id)) {
      const { error } = await ctx.admin.from('lead_businesses').insert({
        lead_id: leadId,
        business_id: business.id,
        rank: nextRank++,
        match_reason: { added_by_admin: true, admin_id: ctx.userId } as Json,
      });
      if (error) {
        console.error('[admin] forward insert failed', lead.reference, error.message);
        return { error: 'generic', results };
      }

      // Into the owner's in-app inbox too, as the matcher does.
      if (business.owner_id) {
        await ctx.admin.from('notifications').insert({
          profile_id: business.owner_id,
          kind: 'lead_new',
          lead_id: leadId,
          business_id: business.id,
          payload: { reference: lead.reference, forwarded_by_admin: true } as Json,
        });
      }
    }

    if (opts.overrideEmail && opts.saveEmail && !business.email) {
      // Only fills a blank. Overwriting an address the operator set
      // themselves, from a box on an enquiry page, is not this form's job.
      await ctx.supabase.from('businesses').update({ email: opts.overrideEmail }).eq('id', business.id);
      business.email = opts.overrideEmail;
    }

    const outcome = await deliver(ctx, lead, business, opts);
    results.push({ name: business.name, outcome: outcome.kind });

    await ctx.admin.from('lead_events').insert({
      lead_id: leadId,
      business_id: business.id,
      actor_id: ctx.userId,
      event: already.has(business.id) ? 'admin_resent' : 'admin_forwarded',
      detail: {
        include_contact: opts.includeContact,
        override_email: opts.overrideEmail,
        note: opts.note,
      } as Json,
    });
  }

  // A forwarded enquiry has been distributed, whatever the matcher managed.
  if (lead.status === 'new') {
    await ctx.supabase
      .from('leads')
      .update({ status: 'distributed', distributed_at: new Date().toISOString() })
      .eq('id', leadId);
  }

  await audit(ctx, {
    action: 'lead.forwarded',
    entityType: 'lead',
    entityId: leadId,
    after: {
      reference: lead.reference,
      businesses: businesses.map((b) => b.id),
      include_contact: opts.includeContact,
      override_email: opts.overrideEmail,
      results,
    } as Json,
  });

  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true, results };
}

/** Resend to a business that already holds the enquiry, optionally to a new address. */
export async function resendLead(_prev: ForwardState, formData: FormData): Promise<ForwardState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: 'notAllowed' };

  const leadId = String(formData.get('leadId') ?? '');
  const businessId = String(formData.get('businessId') ?? '');
  const opts = readOptions(formData);
  if (!UUID_RE.test(leadId) || !UUID_RE.test(businessId)) return { error: 'invalid' };
  if (opts.overrideEmail && !EMAIL_RE.test(opts.overrideEmail)) return { error: 'invalid' };

  const fd = new FormData();
  fd.set('leadId', leadId);
  fd.append('businessIds', businessId);
  if (opts.overrideEmail) fd.set('overrideEmail', opts.overrideEmail);
  if (opts.saveEmail) fd.set('saveEmail', 'on');
  if (opts.includeContact) fd.set('includeContact', 'on');
  if (opts.note) fd.set('note', opts.note);
  return forwardLead({}, fd);
}
