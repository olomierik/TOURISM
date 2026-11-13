import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Calculator, CalendarDays, Gem, LocateFixed, Ticket } from 'lucide-react';

import { locales, type LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { PageHero } from '@/components/layout/page-hero';
import { EndBand } from '@/components/home/sections';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'planHub' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates('/plan', locale),
  };
}

const TOOLS = [
  { href: '/when-to-go', key: 'whenToGo', Icon: CalendarDays },
  { href: '/trip-cost', key: 'tripCost', Icon: Calculator },
  { href: '/hidden-gems', key: 'hiddenGems', Icon: Gem },
  { href: '/near-me', key: 'nearMe', Icon: LocateFixed },
  { href: '/events', key: 'events', Icon: Ticket },
] as const;

/**
 * Plan — the five planning tools behind one menu item (13 Nov 2026).
 *
 * Each used to be a row of its own in a sixteen-item side menu. Here each is
 * a card that says what it answers, which the menu never had room for.
 */
export default async function PlanPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tNav] = await Promise.all([getTranslations('planHub'), getTranslations('nav')]);

  return (
    <>
      <PageHero icon={CalendarDays} title={t('title')} lead={t('lead')} width="medium" />
      <div className="container-page max-w-5xl py-6 sm:py-10">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ href, key, Icon }) => (
            <li key={key}>
              <Link
                href={href}
                className="group flex h-full items-start gap-3.5 rounded-xl border bg-surface p-4 shadow-[var(--elev-xs)] transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-[var(--elev-md)] sm:p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-heading-sm font-semibold">
                    {tNav(key)}
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary rtl:rotate-180"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-body-sm text-muted-foreground">
                    {tNav(`planHint.${key}`)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <EndBand />
    </>
  );
}
