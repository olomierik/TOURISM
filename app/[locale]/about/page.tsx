import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, BadgeCheck, Compass, Scale } from 'lucide-react';

import { locales, type LocaleParams, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { getSiteFacts } from '@/lib/queries/site-facts';
import { PageHero } from '@/components/layout/page-hero';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates('/about', locale),
  };
}

/**
 * What this site is, in numbers that cannot go stale.
 *
 * Every figure below is counted at render time rather than typed into the copy.
 * An about page that says "over 1,000 operators" is a claim somebody has to
 * remember to update, and nobody ever does — it is still saying 1,000 when the
 * number is 40 or 12,000, and by then it has quietly become untrue.
 *
 * The unflattering numbers are here too: how many listings are unclaimed, how
 * many are verified. A directory that only publishes the impressive half of its
 * own statistics is asking to be believed about everything else on the strength
 * of nothing.
 */
export default async function AboutPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [facts, t] = await Promise.all([
    getSiteFacts(),
    getTranslations({ locale, namespace: 'about' } as { locale: Locale; namespace: 'about' }),
  ]);

  const number = new Intl.NumberFormat(locale);

  const stats = [
    { value: number.format(facts.operators), label: t('statOperators') },
    { value: number.format(facts.destinations), label: t('statDestinations') },
    { value: number.format(facts.seasonality), label: t('statSeasonality') },
    { value: number.format(facts.guides), label: t('statGuides') },
  ];

  const principles = [
    { Icon: Scale, title: t('p1Title'), body: t('p1Body') },
    { Icon: BadgeCheck, title: t('p2Title'), body: t('p2Body') },
    { Icon: Compass, title: t('p3Title'), body: t('p3Body') },
  ];

  return (
    <>
      <PageHero
        width="prose"
        title={t('h1')}
        lead={t('lede')}
      />

      <div className="container-page py-6 sm:py-10">

      <dl className="mx-auto grid max-w-3xl grid-cols-4 gap-2 sm:gap-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border px-1.5 py-3 text-center sm:p-5">
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <span className="block font-display text-xl font-semibold tabular-nums sm:text-3xl">
                {s.value}
              </span>
              <span className="mt-1 block text-[0.6875rem] leading-snug text-muted-foreground sm:text-xs">
                {s.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mx-auto mt-14 max-w-2xl space-y-10">
        <section>
          <h2 className="font-display text-xl font-semibold">{t('howTitle')}</h2>
          <div className="mt-3 space-y-4 leading-relaxed">
            <p>{t('howBody1')}</p>
            <p>{t('howBody2', { count: number.format(facts.operators) })}</p>
          </div>
        </section>

        {/* The paragraph most directories leave out. Saying it here is cheaper
            than having a traveller discover it by emailing a company that shut
            three years ago. */}
        <section className="rounded-xl border border-dashed p-5">
          <h2 className="font-display text-xl font-semibold">{t('honestTitle')}</h2>
          <div className="mt-3 space-y-4 text-sm leading-relaxed">
            <p>
              {t('honestClaimed', {
                claimed: number.format(facts.claimed),
                total: number.format(facts.operators),
              })}
            </p>
            <p>{t('honestVerified', { verified: number.format(facts.verified) })}</p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">{t('principlesTitle')}</h2>
          <ul className="mt-5 space-y-5">
            {principles.map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">{t('moneyTitle')}</h2>
          <p className="mt-3 leading-relaxed">{t('moneyBody')}</p>
        </section>

        <div className="flex flex-wrap gap-3 border-t pt-8">
          <Button asChild>
            <Link href="/request-quote">
              {t('ctaTraveller')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/directory">{t('ctaOperator')}</Link>
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}
