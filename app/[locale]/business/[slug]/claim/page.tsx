import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';
import { ClaimForm } from '@/components/business/claim-form';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

type Params = { locale: Locale; slug: string };

/**
 * Claiming a listing.
 *
 * Deliberately not in the sitemap and not indexable: it is a transactional page
 * reached from the listing it belongs to, and an indexed page inviting anyone to
 * claim any business is an invitation to exactly the wrong traffic.
 *
 * Dynamic rather than prerendered, because it reads the session to decide
 * whether to show the form or the sign-in prompt.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'claim' });

  const supabase = createPublicClient();
  const { data } = await supabase
    .from('businesses')
    .select('name')
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  return {
    title: t('title', { name: data?.name ?? '' }),
    robots: { index: false, follow: false },
  };
}

export default async function ClaimPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, owner_id, city')
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  // An already-claimed listing has nothing to offer here. 404 rather than a
  // message: the page has no purpose once an owner exists.
  if (!business || business.owner_id) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const t = await getTranslations('claim');
  const tNav = await getTranslations('nav');

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: 'Explore Tanzania', href: '/' },
          { label: tNav('directory'), href: '/directory' },
          {
            label: business.name,
            href: { pathname: '/business/[slug]', params: { slug: business.slug } },
          },
          { label: t('claimCta') },
        ]}
      />

      <div className="mx-auto mt-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          {t('title', { name: business.name })}
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">{t('intro')}</p>

        <div className="mt-8">
          <ClaimForm
            businessId={business.id}
            businessName={business.name}
            signedIn={Boolean(user)}
            defaultName={profile?.full_name}
            defaultEmail={profile?.email ?? user?.email}
          />
        </div>
      </div>
    </div>
  );
}
