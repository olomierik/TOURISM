import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Compass, Scale } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getHiddenGems } from '@/lib/queries/taxonomy';
import { countryName } from '@/lib/country-names';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

type Params = { locale: Locale };

/**
 * The places most itineraries skip.
 *
 * Forty-six destinations exist here and six carry nearly every link. That is a
 * discovery problem, and the usual fix — a "10 hidden gems" list — does not
 * solve it, because a list of names gives a reader no reason to click any of
 * them and no way to tell whether the place suits the trip they are planning.
 *
 * So every entry here is framed against something the reader already knows, and
 * every entry names what it costs to take it. The trade-off is the product: a
 * page that only sells is an advert, and the reader discovers the charter fare
 * at the airstrip. Naming it is also, bluntly, why somebody would trust the
 * next recommendation on the page.
 */
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hiddenGems' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/hidden-gems',
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/hidden-gems`])),
    },
  };
}

export default async function HiddenGemsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [gems, t, tNav] = await Promise.all([
    getHiddenGems(locale),
    getTranslations('hiddenGems'),
    getTranslations('nav'),
  ]);

  // Grouped by country, because the first constraint on a trip is which visa
  // and which flight — a Ugandan alternative is no use to somebody already
  // committed to Tanzania.
  const byCountry = new Map<string, typeof gems>();
  for (const g of gems) {
    const code = g.destination.countryCode ?? 'ZZ';
    const list = byCountry.get(code) ?? [];
    list.push(g);
    byCountry.set(code, list);
  }

  // Tanzania first, then the rest alphabetically. Alphabetical throughout puts
  // Kenya at the top of a site called Explore Tanzania, and the agreed scope is
  // East Africa with Tanzania leading — the ordering should say so.
  const countries = [...byCountry.keys()].sort((a, b) => {
    if (a === 'TZ') return -1;
    if (b === 'TZ') return 1;
    return countryName(a, locale).localeCompare(countryName(b, locale), locale);
  });

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        locale={locale}
        items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('hiddenGems') }]}
      />

      <header className="mx-auto mt-8 max-w-3xl">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Compass className="size-4" aria-hidden />
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{t('h1')}</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          {/* Counted, not written into the copy. A hardcoded "seventeen"
              is right until somebody adds an eighteenth. */}
          {t('intro', { count: gems.length })}
        </p>
      </header>

      <div className="mx-auto mt-12 max-w-3xl space-y-12">
        {countries.map((code) => (
          <section key={code}>
            <h2 className="border-b pb-2 font-display text-2xl font-semibold">
              {countryName(code, locale)}
            </h2>

            <ul className="mt-5 space-y-5">
              {byCountry.get(code)!.map((g) => (
                <li key={g.id} className="rounded-xl border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="font-display text-lg font-semibold">
                      <Link
                        href={{
                          pathname: '/destinations/[slug]',
                          params: { slug: g.destination.slug },
                        }}
                        className="hover:text-primary"
                      >
                        {g.destination.name}
                      </Link>
                    </h3>

                    {/* The comparison is the hook and the search term. A few
                        gems substitute for nothing in particular and say so
                        rather than being forced into a pairing. */}
                    {g.insteadOf ? (
                      <span className="text-xs text-muted-foreground">
                        {t.rich('insteadOf', {
                          name: g.insteadOf.name,
                          link: (chunks) => (
                            <Link
                              href={{
                                pathname: '/destinations/[slug]',
                                params: { slug: g.insteadOf!.slug },
                              }}
                              className="font-medium text-foreground hover:text-primary"
                            >
                              {chunks}
                            </Link>
                          ),
                        })}
                      </span>
                    ) : (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t('standsAlone')}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm leading-relaxed">{g.pitch}</p>

                  <p className="mt-3 flex gap-2 rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed">
                    <Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="font-medium">{t('tradeOffLabel')}</span> {g.tradeOff}
                    </span>
                  </p>

                  <Link
                    href={{
                      pathname: '/destinations/[slug]',
                      params: { slug: g.destination.slug },
                    }}
                    className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    {t('readMore', { name: g.destination.name })}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {t('disclaimer')}
      </p>
    </div>
  );
}
