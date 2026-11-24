import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Backpack, Church, GraduationCap, HeartHandshake, ShieldCheck, Users } from 'lucide-react';

import { locales, type LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { getVerifiedGuides } from '@/lib/tour-guides/queries';
import { getBudgetStayIds, listOpenDepartures } from '@/lib/group-trips/departures';
import { getBusinessCardsByIds } from '@/lib/queries/businesses';
import { BusinessCard } from '@/components/cards/business-card';
import { DepartureCard } from '@/components/group-trips/departure-card';
import { PageHero } from '@/components/layout/page-hero';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { GroupCostCalculator } from '@/components/group-trips/cost-calculator';
import { GroupRequestForm } from '@/components/group-trips/group-request-form';
import { GuideCard } from '@/components/group-trips/guide-card';

export const revalidate = 3600;

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'groupTrips' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: localeAlternates('/group-trips', locale) };
}

/**
 * Budget group trips with local guides (owner, 24 Nov 2026): churches,
 * schools and backpackers seeing Tanzania the cheap way, hostels or
 * homestays, local food, a local guide. Culture, villages, towns and hikes
 * outside the national parks, where a local guide may lead and the cost stays
 * low; a park day goes through a licensed operator.
 */
export default async function GroupTripsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, guides, departures, stayIds] = await Promise.all([
    getTranslations('groupTrips'),
    getVerifiedGuides(12),
    listOpenDepartures(12),
    getBudgetStayIds(8),
  ]);
  const stays = stayIds.length ? await getBusinessCardsByIds(stayIds, locale) : [];

  const audiences = [
    { key: 'church', Icon: Church },
    { key: 'school', Icon: GraduationCap },
    { key: 'backpackers', Icon: Backpack },
  ] as const;
  const steps = ['step1', 'step2', 'step3', 'step4'] as const;
  const faqs = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'] as const;

  return (
    <>
      <PageHero
        width="wide"
        breadcrumbs={<Breadcrumbs locale={locale} items={[{ label: 'Explore Tanzania', href: '/' }, { label: t('crumb') }]} />}
        icon={Users}
        eyebrow={t('eyebrow')}
        title={t('title')}
        lead={t('lead')}
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="lg">
            <a href="#request">{t('ctaRequest')}</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#calculator">{t('ctaCost')}</a>
          </Button>
        </div>
      </PageHero>

      <div className="container-page space-y-10 py-6 sm:space-y-14 sm:py-10">
        {/* Who it is for. */}
        <section className="grid gap-3 sm:grid-cols-3">
          {audiences.map(({ key, Icon }) => (
            <article key={key} className="rounded-2xl border bg-card p-4">
              <Icon className="size-6 text-primary" aria-hidden />
              <h2 className="mt-2 text-lg font-semibold">{t(`audience.${key}.title`)}</h2>
              <p className="mt-1 text-body-sm text-muted-foreground">{t(`audience.${key}.body`)}</p>
            </article>
          ))}
        </section>

        {/* How it works. */}
        <section>
          <h2 className="font-display text-2xl font-semibold">{t('howTitle')}</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s} className="rounded-2xl border bg-card p-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-body-sm font-bold text-primary-foreground">{i + 1}</span>
                <p className="mt-2 font-semibold">{t(`${s}.title`)}</p>
                <p className="mt-1 text-body-sm text-muted-foreground">{t(`${s}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Phase 2: trips with dates and seats, for anyone who wants group
            prices without a group of their own. */}
        <section id="join">
          <h2 className="font-display text-2xl font-semibold">{t('openTitle')}</h2>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{t('openLead')}</p>
          {departures.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {departures.map((d) => (
                <DepartureCard key={d.id} departure={d} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed p-5 text-body-sm text-muted-foreground">{t('openEmpty')}</p>
          )}
        </section>

        <div id="calculator" className="scroll-mt-[calc(var(--header-h)+1rem)]">
          <GroupCostCalculator />
        </div>

        {/* The guides. */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold">{t('guidesTitle')}</h2>
              <p className="mt-1 text-body-sm text-muted-foreground">{t('guidesLead')}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/tour-guides/join">{t('joinCta')}</Link>
            </Button>
          </div>
          {guides.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <GuideCard key={g.businessId} guide={g} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed p-5 text-body-sm text-muted-foreground">{t('guidesEmpty')}</p>
          )}
        </section>

        {/* Phase 3: where groups sleep cheaply, already in the directory. */}
        {stays.length > 0 && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold">{t('staysTitle')}</h2>
                <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{t('staysLead')}</p>
              </div>
              <Button asChild variant="outline">
                <Link href={{ pathname: '/directory', query: { q: 'hostel', all: '1' } }}>{t('staysAll')}</Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-sm:[&>*:nth-child(n+5)]:hidden">
              {stays.map((b) => (
                <BusinessCard key={b.id} business={b} size="responsive" />
              ))}
            </div>
          </section>
        )}

        <section id="request" className="scroll-mt-[calc(var(--header-h)+1rem)]">
          <h2 className="font-display text-2xl font-semibold">{t('requestTitle')}</h2>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{t('requestLead')}</p>
          <div className="mt-4">
            <GroupRequestForm />
          </div>
        </section>

        {/* Safety and the honest limits. */}
        <section className="grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border bg-card p-5">
            <ShieldCheck className="size-6 text-primary" aria-hidden />
            <h2 className="mt-2 text-lg font-semibold">{t('safetyTitle')}</h2>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-body-sm text-muted-foreground">
              <li>{t('safety1')}</li>
              <li>{t('safety2')}</li>
              <li>{t('safety3')}</li>
              <li>{t('safety4')}</li>
            </ul>
          </article>
          <article className="rounded-2xl border bg-card p-5">
            <HeartHandshake className="size-6 text-primary" aria-hidden />
            <h2 className="mt-2 text-lg font-semibold">{t('parksTitle')}</h2>
            <p className="mt-2 text-body-sm text-muted-foreground">{t('parksBody')}</p>
          </article>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">{t('faqTitle')}</h2>
          <div className="mt-4 divide-y rounded-2xl border bg-card">
            {faqs.map((f) => (
              <details key={f} className="group p-4">
                <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">{t(`${f}.q`)}</summary>
                <p className="mt-2 text-body-sm text-muted-foreground">{t(`${f}.a`)}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
