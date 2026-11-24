import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPublicClient } from '@/lib/supabase/public';
import {
  GROUP_AUDIENCES,
  GUIDE_LANGUAGES,
  GUIDE_SPECIALTIES,
  isOneOf,
  type DocKind,
  type GroupAudience,
  type GuideKind,
} from '@/lib/tour-guides/constants';

export type TourGuideProfile = {
  businessId: string;
  name: string;
  slug: string;
  status: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  coverImageUrl: string | null;
  guideKind: GuideKind;
  licenceNumber: string | null;
  languages: Array<(typeof GUIDE_LANGUAGES)[number]>;
  areas: string[];
  specialties: Array<(typeof GUIDE_SPECIALTIES)[number]>;
  audiences: GroupAudience[];
  dayRate: number | null;
  dayRateCurrency: string;
  maxGroup: number | null;
  bio: string | null;
  verificationStatus: 'not_submitted' | 'submitted' | 'verified' | 'rejected';
  verificationNote: string | null;
  /** Where deposits are paid (migration 100); shown to booked travellers only. */
  mobileMoney: { provider: string; number: string; name: string | null } | null;
  ratingAvg: number;
  ratingCount: number;
};

type Row = {
  business_id: string;
  guide_kind: string;
  licence_number: string | null;
  languages: string[];
  areas: string[];
  specialties: string[];
  audiences: string[];
  day_rate: number | string | null;
  day_rate_currency: string;
  max_group: number | null;
  bio: string | null;
  verification_status: string;
  verification_note: string | null;
  mobile_money_provider?: string | null;
  mobile_money_number?: string | null;
  mobile_money_name?: string | null;
  businesses: {
    name: string;
    slug: string;
    status: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    city: string | null;
    cover_image_url: string | null;
    rating_avg: number | string | null;
    rating_count: number | null;
  } | null;
};

const SELECT = `business_id, guide_kind, licence_number, languages, areas, specialties, audiences, day_rate,
  day_rate_currency, max_group, bio, verification_status, verification_note, mobile_money_provider, mobile_money_number, mobile_money_name,
  businesses!inner (name, slug, status, phone, whatsapp, email, city, cover_image_url, rating_avg, rating_count, owner_id, deleted_at)`;

function toProfile(r: Row): TourGuideProfile {
  const b = r.businesses!;
  return {
    businessId: r.business_id,
    name: b.name,
    slug: b.slug,
    status: b.status,
    phone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    city: b.city,
    coverImageUrl: b.cover_image_url,
    guideKind: r.guide_kind === 'licensed' ? 'licensed' : 'community',
    licenceNumber: r.licence_number,
    languages: (r.languages ?? []).filter((v) => isOneOf(GUIDE_LANGUAGES, v)),
    areas: r.areas ?? [],
    specialties: (r.specialties ?? []).filter((v) => isOneOf(GUIDE_SPECIALTIES, v)),
    audiences: (r.audiences ?? []).filter((v) => isOneOf(GROUP_AUDIENCES, v)),
    dayRate: r.day_rate === null ? null : Number(r.day_rate),
    dayRateCurrency: r.day_rate_currency,
    maxGroup: r.max_group,
    bio: r.bio,
    verificationStatus: r.verification_status as TourGuideProfile['verificationStatus'],
    verificationNote: r.verification_note,
    mobileMoney:
      r.mobile_money_provider && r.mobile_money_number
        ? { provider: r.mobile_money_provider, number: r.mobile_money_number, name: r.mobile_money_name ?? null }
        : null,
    ratingAvg: Number(b.rating_avg ?? 0),
    ratingCount: b.rating_count ?? 0,
  };
}

/** The signed-in person's tour guide listing, if they have one. */
export const myTourGuide = cache(async (): Promise<TourGuideProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('tour_guide_profiles')
    .select(SELECT)
    .eq('businesses.owner_id', user.id)
    .is('businesses.deleted_at', null)
    .limit(1)
    .maybeSingle();
  return data ? toProfile(data as unknown as Row) : null;
});

/** Which documents the guide has uploaded. */
export async function myGuideDocuments(businessId: string): Promise<Partial<Record<DocKind, string>>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tour_guide_documents')
    .select('kind, uploaded_at')
    .eq('business_id', businessId);
  return Object.fromEntries((data ?? []).map((d) => [d.kind, d.uploaded_at]));
}

/** Verified, published guides for the group trips page, best rated first. */
export const getVerifiedGuides = cache(async (limit = 24): Promise<TourGuideProfile[]> => {
  const { data, error } = await createPublicClient()
    .from('tour_guide_profiles')
    .select(SELECT)
    .eq('verification_status', 'verified')
    .eq('businesses.status', 'approved')
    .is('businesses.deleted_at', null)
    .limit(limit);
  if (error) {
    console.warn('getVerifiedGuides', error.message);
    return [];
  }
  return ((data ?? []) as unknown as Row[])
    .map(toProfile)
    .sort((a, b) => b.ratingCount - a.ratingCount || b.ratingAvg - a.ratingAvg || a.name.localeCompare(b.name));
});

/** A guide's public profile, for the listing page. */
export const getGuideProfileFor = cache(async (businessId: string): Promise<TourGuideProfile | null> => {
  const { data } = await createPublicClient().from('tour_guide_profiles').select(SELECT).eq('business_id', businessId).maybeSingle();
  return data ? toProfile(data as unknown as Row) : null;
});

export type AdminGuide = TourGuideProfile & {
  submittedAt: string | null;
  documents: Array<{ kind: DocKind; url: string | null; isPdf: boolean; uploadedAt: string }>;
};

/**
 * Every tour guide for the admin review, waiting ones first, with each
 * document as a link that works for ten minutes. The bucket is private; the
 * links are made here, for admins only, and expire.
 */
export async function adminListGuides(): Promise<AdminGuide[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('tour_guide_profiles')
    .select(`${SELECT}, submitted_at`)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(300);
  const rows = (data ?? []) as unknown as Array<Row & { submitted_at: string | null }>;
  const ids = rows.map((r) => r.business_id);
  const { data: docRows } = ids.length
    ? await admin.from('tour_guide_documents').select('business_id, kind, path, uploaded_at').in('business_id', ids)
    : { data: [] as Array<{ business_id: string; kind: string; path: string; uploaded_at: string }> };
  const out: AdminGuide[] = [];
  for (const r of rows) {
    const docs = (docRows ?? []).filter((d) => d.business_id === r.business_id);
    const signed = await Promise.all(
      docs.map(async (d) => {
        const { data: s } = await admin.storage.from('guide-verification').createSignedUrl(d.path, 600);
        return {
          kind: d.kind as DocKind,
          url: s?.signedUrl ?? null,
          isPdf: d.path.toLowerCase().endsWith('.pdf'),
          uploadedAt: d.uploaded_at,
        };
      }),
    );
    out.push({ ...toProfile(r), submittedAt: r.submitted_at, documents: signed });
  }
  const order = { submitted: 0, rejected: 1, not_submitted: 2, verified: 3 } as const;
  return out.sort((a, b) => order[a.verificationStatus] - order[b.verificationStatus]);
}
