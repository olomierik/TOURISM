import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { getDestinations, getCategories } from '@/lib/queries/taxonomy';
import { createClient } from '@/lib/supabase/server';
import { QuoteFlow } from '@/components/quote/quote-flow';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'quote' });

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: localeAlternates('/request-quote', locale),
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RequestQuotePage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;

  const [destinations, categories, t, tNav, tHero] = await Promise.all([
    getDestinations(locale),
    getCategories(locale),
    getTranslations('quote'),
    getTranslations('nav'),
    getTranslations('home.hero'),
  ]);

  // Knowing whether there is a session only changes which links the confirmation
  // offers, so a failure here degrades to "treat them as a guest".
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <div className="container-page pt-10">
        <Breadcrumbs
          locale={locale}
          items={[{ label: 'Explore Tanzania', href: '/' }, { label: t('title') }]}
        />
      </div>

      <div className="container-page pb-section pt-8">
        <div className="mx-auto max-w-2xl">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-semibold sm:text-5xl">{t('title')}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {t('subtitle')}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4" aria-hidden />
              {tHero('trustNote')}
            </p>
          </header>

          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <QuoteFlow
              destinations={destinations}
              categories={categories}
              isSignedIn={Boolean(user)}
              defaults={{
                // Prefilled when arriving from a destination, category or
                // business page, so the visitor does not re-answer what the
                // link already told us.
                destination: first(sp.destination),
                category: first(sp.category),
                // The homepage planner sends the whole brief, not just a link
                // target, so the long form opens already half-answered.
                travelStart: first(sp.travelStart),
                travelEnd: first(sp.travelEnd),
                adults: first(sp.adults),
                children: first(sp.children),
                interests: sp.interests
                  ? (Array.isArray(sp.interests) ? sp.interests : [sp.interests])
                  : undefined,
                sourceUrl: first(sp.business) ?? first(sp.package),
              }}
            />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">{tNav('requestQuote')}</p>
        </div>
      </div>
    </>
  );
}
