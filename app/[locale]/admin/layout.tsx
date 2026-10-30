import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { routing, type Locale } from '@/i18n/routing';
import { getAdminOverview } from '@/lib/queries/admin';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/admin-nav';
import { PageMasthead, workspaceAsideClass } from '@/components/layout/page-masthead';

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

  // The proxy gates /admin on the admin role; this is the second lock. When the
  // proxy failed open (a deployment without its Supabase variables) the admin
  // shell rendered for anyone, which is exactly what this check prevents.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') notFound();

  const t = await getTranslations('admin');

  // These counts drive the nav
  // badges and come back as zero for anyone who somehow reaches here without it,
  // because the admin RLS policies simply return nothing.
  const overview = await getAdminOverview();

  return (
    <>
      <PageMasthead title={t('title')} />
      <div className="container-page grid grid-cols-1 gap-8 py-8 sm:py-10 md:grid-cols-[14rem_1fr] md:gap-10">
        <aside className={workspaceAsideClass}>
          <AdminNav
            pendingBusinesses={overview.pendingBusinesses}
            pendingReviews={overview.pendingReviews}
            pendingClaims={overview.pendingClaims}
          />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
