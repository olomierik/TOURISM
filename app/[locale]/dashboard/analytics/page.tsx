import { redirect } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BarChart3, Eye, Inbox, MessageCircle, TrendingUp } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { getListingAnalytics } from '@/lib/queries/analytics';
import { createClient } from '@/lib/supabase/server';
import { isPaidFeatureLocked } from '@/lib/billing/enabled';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Stat, StatGrid } from '@/components/ui/stat';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('analytics'), robots: { index: false, follow: false } };
}

export default async function AnalyticsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  // No listing yet: setup is on the dashboard itself, not a 404.
  if (!business) return redirect({ href: '/dashboard', locale });

  const supabase = await createClient();

  const [stats, t, { data: planRow }] = await Promise.all([
    getListingAnalytics(business.id),
    getTranslations('dashboard.analyticsPage'),
    supabase
      .from('subscriptions')
      .select('subscription_plans (tier)')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  // `has_analytics` has been false on the free plan since migration 008 and
  // this page never read it, so every tier saw the numbers and the
  // subscription card was selling something a free listing already had.
  // Gated the way deals are — on the active subscription's plan tier, which
  // is what every other entitlement check uses — so the card and the page now
  // agree.
  const tier =
    (planRow?.subscription_plans as unknown as { tier: string } | null)?.tier ?? 'free';
  const isPaid = !isPaidFeatureLocked(tier);

  // Returned early rather than wrapping the whole page in a conditional: the
  // locked state shares nothing with the unlocked one but the heading, and
  // threading `isPaid` through five sections would leave every one of them
  // able to leak a number.
  if (!isPaid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="rounded-2xl border border-dashed p-5">
          <h2 className="font-medium">{t('needsPlanTitle')}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t('needsPlanBody')}
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/dashboard/subscription">{t('seePlans')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const peak = Math.max(1, ...stats.daily.map(([, n]) => n));

  const tiles = [
    { label: t('views'), value: stats.views, Icon: Eye },
    { label: t('visitors'), value: stats.visitors, Icon: TrendingUp },
    {
      label: t('contacts'),
      value: stats.contacts,
      Icon: Inbox,
      hint: t('contactsHint', { enquiries: stats.enquiries, chats: stats.whatsappChats }),
    },
    { label: t('conversion'), value: stats.conversion ? `${stats.conversion}%` : '—', Icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {stats.views === 0 && (
        // Said plainly rather than rendering four zeros and leaving the owner to
        // wonder whether the page is broken or the listing is.
        <Alert>
          <AlertDescription>{t('noDataYet')}</AlertDescription>
        </Alert>
      )}

      {/* Label above value, and tabular figures.
      
          This block led with the glyph and dropped both `tabular-nums` and
          `font-display`, so it was the only stat grid on the site whose digits
          did not line up in a column — which is most of why a stat grid exists.
          It reads the same way as the admin overview now. */}
      <StatGrid>
        {tiles.map(({ label, value, Icon, hint }) => (
          <Stat key={label} label={label} value={value} icon={<Icon />} hint={hint} />
        ))}
      </StatGrid>

      {/* Where WhatsApp chats started, so an operator can see that the button
          on their card in a list is doing work, not only the one on their page. */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageCircle className="size-4 text-success" aria-hidden />
          {t('chatsTitle')}
        </h2>
        {/* Said plainly rather than hidden: the figure below covers a shorter
            period than the rest of the page, and an operator who remembers a
            bigger number last week deserves to know why it fell. */}
        {stats.chatsPartial && (
          <p className="text-sm text-muted-foreground">
            {t('chatsPartial', { date: stats.chatsSince })}
          </p>
        )}
        {stats.whatsappChats === 0 ? (
          <p className="text-sm text-muted-foreground">{t('chatsNone')}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {stats.chatSources.map(([source, count]) => (
              <li key={source} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>{t(`chatSource.${source as 'card' | 'profile' | 'package' | 'enquiry'}`)}</span>
                <span className="font-semibold tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('overTime')}</h2>
        {/* A plain bar row rather than a charting library: thirty numbers do not
            justify shipping one to every visitor's browser. */}
        <div className="flex h-40 items-end gap-1 rounded-2xl border bg-card p-4">
          {stats.daily.map(([day, n]) => (
            <div
              key={day}
              className="flex-1 rounded-t bg-primary/70"
              style={{ height: `${Math.max(2, (n / peak) * 100)}%` }}
              title={`${day}: ${n}`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('referrers')}</h2>
        {stats.referrers.length === 0 ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            {t('noReferrers')}
          </p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {stats.referrers.map(([host, n]) => (
              <li key={host} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{host}</span>
                <span className="font-medium text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        {t('improveHint')}{' '}
        <Link href="/dashboard/gallery" className="font-medium text-primary hover:underline">
          {t('improveLink')}
        </Link>
      </p>
    </div>
  );
}
