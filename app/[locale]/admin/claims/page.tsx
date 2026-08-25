import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { ClaimsQueue, type PendingClaim } from '@/components/admin/claims-queue';

type Params = { locale: Locale };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.claimsPage' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * The claim review queue.
 *
 * Reads through the cookie-bound client, so RLS applies — an admin sees every
 * claim, and were this page ever reached by anyone else they would see only
 * their own. The layout already gates on role; this is the second lock.
 */
export default async function AdminClaimsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data } = await supabase
    .from('business_claims')
    .select(
      `id, created_at, contact_name, contact_email, contact_phone, evidence,
       businesses!inner (name, slug, city)`,
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const claims: PendingClaim[] = (data ?? []).map((c) => {
    const b = c.businesses as unknown as { name: string; slug: string; city: string | null };
    return {
      id: c.id,
      createdAt: c.created_at,
      contactName: c.contact_name,
      contactEmail: c.contact_email,
      contactPhone: c.contact_phone,
      evidence: c.evidence,
      businessName: b.name,
      businessSlug: b.slug,
      businessCity: b.city,
    };
  });

  const t = await getTranslations('admin.claimsPage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ClaimsQueue claims={claims} locale={locale} />
    </div>
  );
}
