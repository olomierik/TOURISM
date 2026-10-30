import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';

import { routing, type Locale } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { Badge } from '@/components/ui/badge';
import { PageMasthead, workspaceAsideClass } from '@/components/layout/page-masthead';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'dashboard' });
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    robots: { index: false, follow: false },
  };
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  // Next's generated LayoutProps types params as a plain string, so narrow here
  // rather than declaring a type the route validator will reject.
  if (!routing.locales.includes(raw as Locale)) notFound();
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard');
  const business = await getMyBusiness(locale);

  // Unread count for the nav badge. RLS scopes this to the owner's own rows, so
  // no business filter is needed — and adding one would imply otherwise.
  const supabase = await createClient();
  const { count: pendingLeads } = await supabase
    .from('lead_businesses')
    .select('id', { count: 'exact', head: true })
    .in('status', ['sent', 'viewed']);

  const statusVariant = {
    draft: 'secondary',
    pending: 'secondary',
    approved: 'verified',
    rejected: 'demo',
    suspended: 'demo',
  } as const;

  return (
    <>
      <PageMasthead
        title={business?.name ?? t('title')}
        meta={
          business && (
            <>
              <Badge variant={statusVariant[business.status]}>
                {t(
                  `status${business.status.charAt(0).toUpperCase()}${business.status.slice(1)}` as 'statusDraft',
                )}
              </Badge>
              {business.is_verified && <Badge variant="verified">{t('verified')}</Badge>}
              {/* The plan badge is gone while subscriptions are withdrawn: it
                  said "Free" to every operator, against a price list nobody
                  can buy from. See lib/billing/enabled.ts. */}
            </>
          )
        }
        aside={
          // Only offered once the listing is actually public — linking to a
          // draft profile would 404, since the public queries filter on approved.
          business?.status === 'approved' && (
            <Link
              href={{ pathname: '/business/[slug]', params: { slug: business.slug } }}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-border-strong"
            >
              {t('viewPublic')}
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          )
        }
      />

      {business ? (
        <div className="container-page grid grid-cols-1 gap-8 py-8 sm:py-10 md:grid-cols-[14rem_1fr] md:gap-10">
          <aside className={workspaceAsideClass}>
            <DashboardNav pendingLeads={pendingLeads ?? 0} />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        // No listing yet: the nav would point at pages that cannot render, so
        // the onboarding page takes the full width instead.
        <div className="container-page py-8 sm:py-10">{children}</div>
      )}
    </>
  );
}
