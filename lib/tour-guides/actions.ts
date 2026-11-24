'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { audit, requireAdmin, UUID_RE } from '@/lib/admin/guard';
import { getEmailProvider } from '@/lib/notifications';
import { renderBrandedEmail } from '@/lib/notifications/template';
import { CONTACT_DETAILS } from '@/lib/billing/bank';
import { siteUrl } from '@/lib/seo';
import { slugify } from '@/lib/format';
import {
  DOC_KINDS,
  GROUP_AUDIENCES,
  GUIDE_KINDS,
  GUIDE_LANGUAGES,
  GUIDE_SPECIALTIES,
  isOneOf,
  missingDocuments,
  type DocKind,
} from '@/lib/tour-guides/constants';
import { myTourGuide } from '@/lib/tour-guides/queries';

export type GuideFormState = {
  success?: boolean;
  error?: 'signIn' | 'nameRequired' | 'phoneRequired' | 'generic';
};

const clean = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? '').trim().slice(0, max) || null;
const pick = <T extends readonly string[]>(fd: FormData, key: string, list: T) =>
  [...new Set(fd.getAll(key).map(String))].filter((v): v is T[number] => isOneOf(list, v));
const listText = (fd: FormData, key: string) =>
  String(fd.get(key) ?? '')
    .split(/[,\n]/)
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 20);

function profileFields(fd: FormData) {
  const rate = Number(String(fd.get('dayRate') ?? '').replace(/[ ,]/g, ''));
  const maxGroup = Number(fd.get('maxGroup') ?? '');
  const kind = String(fd.get('guideKind') ?? 'community');
  return {
    guide_kind: isOneOf(GUIDE_KINDS, kind) ? kind : 'community',
    licence_number: clean(fd, 'licenceNumber', 80),
    languages: pick(fd, 'languages', GUIDE_LANGUAGES),
    specialties: pick(fd, 'specialties', GUIDE_SPECIALTIES),
    audiences: pick(fd, 'audiences', GROUP_AUDIENCES),
    areas: listText(fd, 'areas'),
    day_rate: Number.isFinite(rate) && rate > 0 && rate < 100_000 ? Math.round(rate * 100) / 100 : null,
    day_rate_currency: String(fd.get('dayRateCurrency') ?? 'USD') === 'TZS' ? 'TZS' : 'USD',
    max_group: Number.isInteger(maxGroup) && maxGroup >= 1 && maxGroup <= 500 ? maxGroup : null,
    bio: clean(fd, 'bio', 2000),
  };
}

/**
 * Sign-up for a local tour guide, from a phone, in one form.
 *
 * A guide is a listing in the tour-guides category plus a tour_guide_profiles
 * row, so everything operators already have (enquiries, quotes, the
 * conversation, BOOKED, the trip document, reviews) works for guides on day
 * one. The listing starts as a draft and goes to review when the guide
 * submits their verification documents.
 */
export async function createTourGuide(_prev: GuideFormState, fd: FormData): Promise<GuideFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'signIn' };

  const existing = await myTourGuide();
  if (existing) return updateTourGuide(_prev, fd);

  const name = clean(fd, 'name', 120);
  if (!name) return { error: 'nameRequired' };
  const phone = clean(fd, 'phone', 40);
  if (!phone) return { error: 'phoneRequired' };

  const admin = createAdminClient();
  const base = slugify(name) || 'tour-guide';
  let slug = base;
  for (let n = 2; n < 60; n++) {
    const { data: taken } = await admin.from('businesses').select('id').eq('slug', slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${n}`;
  }

  const { data: category } = await admin.from('categories').select('id').eq('key', 'tour-guides').single();
  const { data: business, error } = await admin
    .from('businesses')
    .insert({
      owner_id: user.id,
      name,
      slug,
      status: 'draft',
      email: clean(fd, 'email', 160) ?? user.email ?? null,
      phone,
      whatsapp: clean(fd, 'whatsapp', 40) ?? phone,
      city: clean(fd, 'city', 80),
      country_code: 'TZ',
      claimed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !business) {
    console.error('[tour-guides] create failed', error?.message);
    return { error: 'generic' };
  }

  const profile = profileFields(fd);
  await Promise.all([
    category
      ? admin.from('business_categories').insert({ business_id: business.id, category_id: category.id, is_primary: true })
      : Promise.resolve(),
    admin.from('business_translations').insert({
      business_id: business.id,
      locale: 'en',
      tagline: clean(fd, 'tagline', 160),
      description: profile.bio,
    }),
    admin.from('tour_guide_profiles').insert({ business_id: business.id, ...profile }),
  ]);

  revalidatePath('/dashboard');
  return { success: true };
}

/** The guide edits their profile later; verification fields are not theirs to change. */
export async function updateTourGuide(_prev: GuideFormState, fd: FormData): Promise<GuideFormState> {
  const guide = await myTourGuide();
  if (!guide) return { error: 'signIn' };
  const supabase = await createClient();
  const name = clean(fd, 'name', 120);
  const phone = clean(fd, 'phone', 40);
  if (!name) return { error: 'nameRequired' };
  if (!phone) return { error: 'phoneRequired' };

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from('tour_guide_profiles').update(profileFields(fd)).eq('business_id', guide.businessId),
    supabase
      .from('businesses')
      .update({ name, phone, whatsapp: clean(fd, 'whatsapp', 40) ?? phone, city: clean(fd, 'city', 80) })
      .eq('id', guide.businessId),
  ]);
  if (e1 || e2) {
    console.error('[tour-guides] update failed', e1?.message ?? e2?.message);
    return { error: 'generic' };
  }
  revalidatePath('/tour-guides/join');
  return { success: true };
}

/**
 * Records one uploaded verification document. The browser has already put
 * the file in the private guide-verification bucket under the guide's own
 * folder (storage policies refuse anything else); this keeps one row per kind
 * and removes the file it replaces.
 */
export async function recordGuideDocument(kind: string, path: string): Promise<{ ok: boolean }> {
  const guide = await myTourGuide();
  if (!guide || !isOneOf(DOC_KINDS, kind) || !path.startsWith(`${guide.businessId}/`)) return { ok: false };
  const admin = createAdminClient();
  const { data: before } = await admin
    .from('tour_guide_documents')
    .select('path')
    .eq('business_id', guide.businessId)
    .eq('kind', kind)
    .maybeSingle();
  const { error } = await admin
    .from('tour_guide_documents')
    .upsert({ business_id: guide.businessId, kind, path, uploaded_at: new Date().toISOString() }, { onConflict: 'business_id,kind' });
  if (error) return { ok: false };
  if (before?.path && before.path !== path) {
    await admin.storage.from('guide-verification').remove([before.path]);
  }
  revalidatePath('/tour-guides/verify');
  return { ok: true };
}

export type SubmitState = { success?: boolean; missing?: string[]; error?: 'signIn' | 'generic' };

/** The guide asks to be checked. Admin is told; the listing goes to review. */
export async function submitGuideVerification(): Promise<SubmitState> {
  const guide = await myTourGuide();
  if (!guide) return { error: 'signIn' };
  const admin = createAdminClient();
  const { data: docs } = await admin.from('tour_guide_documents').select('kind').eq('business_id', guide.businessId);
  const have = Object.fromEntries((docs ?? []).map((d) => [d.kind, true])) as Partial<Record<DocKind, boolean>>;
  const missing = missingDocuments(have, guide.guideKind);
  if (missing.length) return { missing };

  const now = new Date().toISOString();
  const [{ error }] = await Promise.all([
    admin
      .from('tour_guide_profiles')
      .update({ verification_status: 'submitted', submitted_at: now, verification_note: null })
      .eq('business_id', guide.businessId),
    admin
      .from('businesses')
      .update({ status: 'pending', submitted_at: now })
      .eq('id', guide.businessId)
      .in('status', ['draft', 'rejected']),
  ]);
  if (error) return { error: 'generic' };

  try {
    const mail = renderBrandedEmail({
      heading: `Tour guide to verify: ${guide.name}`,
      paragraphs: [`${guide.name} (${guide.guideKind}) uploaded their documents and asked to be verified.`],
      action: { label: 'Review documents', url: `${siteUrl}/admin/tour-guides` },
    });
    await getEmailProvider().send({ to: CONTACT_DETAILS.email, subject: `Verify tour guide: ${guide.name}`, ...mail });
  } catch (err) {
    console.error('[tour-guides] admin notice failed', err);
  }
  revalidatePath('/tour-guides/verify');
  return { success: true };
}

export type DecisionState = { success?: boolean; error?: 'notAllowed' | 'noteRequired' | 'generic' };

/** Admin: verify a guide (publishes the listing) or send it back with a reason. */
export async function decideTourGuide(
  businessId: string,
  decision: 'verify' | 'reject',
  note: string,
): Promise<DecisionState> {
  const ctx = await requireAdmin();
  if (!ctx || !UUID_RE.test(businessId)) return { error: 'notAllowed' };
  const reason = note.trim().slice(0, 1000);
  if (decision === 'reject' && !reason) return { error: 'noteRequired' };

  const { data: guide } = await ctx.admin
    .from('businesses')
    .select('id, name, email, owner_id, published_at, tour_guide_profiles (guide_kind, verification_status)')
    .eq('id', businessId)
    .maybeSingle();
  if (!guide) return { error: 'generic' };
  const profile = (Array.isArray(guide.tour_guide_profiles) ? guide.tour_guide_profiles[0] : guide.tour_guide_profiles) as
    | { guide_kind: string; verification_status: string }
    | null;
  if (!profile) return { error: 'generic' };

  const now = new Date().toISOString();
  if (decision === 'verify') {
    const { data: lic } = await ctx.admin
      .from('tour_guide_documents')
      .select('id')
      .eq('business_id', businessId)
      .eq('kind', 'licence')
      .maybeSingle();
    await Promise.all([
      ctx.admin
        .from('tour_guide_profiles')
        .update({ verification_status: 'verified', verified_at: now, verified_by: ctx.userId, verification_note: reason || null })
        .eq('business_id', businessId),
      ctx.admin
        .from('businesses')
        .update({
          status: 'approved',
          published_at: guide.published_at ?? now,
          is_verified: true,
          verified_at: now,
          identity_checked_at: now,
          ...(profile.guide_kind === 'licensed' && lic
            ? { license_checked_at: now, license_checked_source: 'Licence document uploaded to Explore Tanzania' }
            : {}),
        })
        .eq('id', businessId),
    ]);
  } else {
    await Promise.all([
      ctx.admin
        .from('tour_guide_profiles')
        .update({ verification_status: 'rejected', verification_note: reason })
        .eq('business_id', businessId),
      ctx.admin.from('businesses').update({ status: 'rejected' }).eq('id', businessId),
    ]);
  }
  await audit(ctx, {
    action: `tour_guide.${decision}`,
    entityType: 'business',
    entityId: businessId,
    after: { note: reason || null },
  });

  // Tell the guide, in Swahili and English: most read Swahili first.
  let to = guide.email as string | null;
  if (!to && guide.owner_id) {
    const { data: owner } = await ctx.admin.from('profiles').select('email').eq('id', guide.owner_id).maybeSingle();
    to = owner?.email ?? null;
  }
  if (to) {
    try {
      const [tEn, tSw] = await Promise.all([
        getTranslations({ locale: 'en', namespace: 'tourGuides' }),
        getTranslations({ locale: 'sw', namespace: 'tourGuides' }),
      ]);
      const key = decision === 'verify' ? 'verifiedEmail' : 'rejectedEmail';
      const mail = renderBrandedEmail({
        heading: `${tSw(`${key}.heading`)} / ${tEn(`${key}.heading`)}`,
        paragraphs: [
          tSw(`${key}.body`, { name: guide.name }),
          tEn(`${key}.body`, { name: guide.name }),
          ...(reason ? [`${tSw('noteLabel')} / ${tEn('noteLabel')}: ${reason}`] : []),
        ],
        action: { label: tEn(`${key}.cta`), url: `${siteUrl}${decision === 'verify' ? '/dashboard' : '/tour-guides/verify'}` },
      });
      await getEmailProvider().send({ to, subject: `${tSw(`${key}.subject`)} / ${tEn(`${key}.subject`)}`, ...mail });
    } catch (err) {
      console.error('[tour-guides] decision email failed', err);
    }
  }

  revalidatePath('/admin/tour-guides');
  revalidatePath('/group-trips');
  return { success: true };
}
