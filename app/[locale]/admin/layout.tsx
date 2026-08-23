import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { routing, type Locale } from '@/i18n/routing';
import { getAdminOverview } from '@/lib/queries/admin';
import { AdminNav } from '@/components/admin/admin-nav';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'admin' });
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  // Next's generated LayoutProps types params as a plain string, so narrow here
  // rather than declaring a type the route validator rejects.
  if (!routing.locales.includes(raw as Locale)) notFound();
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  // The proxy already gates /admin on the admin role. These counts drive the nav
  // badges and come back as zero for anyone who somehow reaches here without it,
  // because the admin RLS policies simply return nothing.
  const overview = await getAdminOverview();

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t('title')}</h1>
      </header>

      <div className="grid gap-8 md:grid-cols-[13rem_1fr] md:gap-10">
        <aside className="md:sticky md:top-24 md:self-start">
          <AdminNav
            pendingBusinesses={overview.pendingBusinesses}
            pendingReviews={overview.pendingReviews}
          />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
