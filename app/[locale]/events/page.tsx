import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CalendarDays, ExternalLink, Lightbulb, MapPin } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getEvents } from '@/lib/queries/taxonomy';
import { countryName } from '@/lib/country-names';
import { ScopeSwitch } from '@/components/layout/scope-switch';
import { monthName, slugForMonth } from '@/lib/months';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHero } from '@/components/layout/page-hero';

type Params = { locale: Locale };

/**
 * The events calendar.
 *
 * The one content type here with a reason to return: a destination page is read
 * once, "when is Sauti za Busara" is asked every year by different people.
 *
 * Grouped by the month an event habitually falls in rather than by a countdown
 * to the next edition, because almost none of them have confirmed dates — and
 * the honest presentation of that is "February, dates usually announced later",
 * not a number invented to fill a slot.
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
  const t = await getTranslations({ locale, namespace: 'events' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/events',
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/events`])),
    },
  };
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const all = (Array.isArray(sp.all) ? sp.all[0] : sp.all) === '1';

  const [everything, t, tNav] = await Promise.all([
    getEvents(locale),
    getTranslations('events'),
    getTranslations('nav'),
  ]);

  // §9.3: "Country default Tanzania". The JSON-LD below is built from the same
  // filtered list, so the structured data describes the page rather than the
  // table behind it.
  const events = all
    ? everything
    : everything.filter((e) => (e.countryCode ?? 'TZ').toUpperCase() === 'TZ');

  // Grouped by habitual month, in calendar order. Events without one cannot
  // exist — a database constraint requires an annual event to have a month,
  // because a page that cannot say when is not worth publishing.
  const byMonth = new Map<number, typeof events>();
  for (const e of events) {
    if (e.typicalMonth === null) continue;
    const list = byMonth.get(e.typicalMonth) ?? [];
    list.push(e);
    byMonth.set(e.typicalMonth, list);
  }

  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });

  // The kind arrives from the database as a free string and next-intl's typed
  // keys will not take one. Narrowing here means an enum value added later
  // without a label renders nothing rather than a raw "kind.foo" to a reader.
  const KINDS = ['music', 'film', 'culture', 'sport', 'wildlife', 'food', 'trade'] as const;
  type Kind = (typeof KINDS)[number];
  const kindLabel = (k: string) =>
    KINDS.includes(k as Kind) ? t(`kind.${k as Kind}`) : null;

  /**
   * Event schema, per the SEO brief. Only emitted for events with real dates:
   * Google requires startDate, and supplying a guess to satisfy a validator is
   * how a structured-data warning becomes a wrong answer in a search result.
   */
  const dated = events.filter((e) => e.nextStart);
  const jsonLd =
    dated.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: dated.map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Event',
              name: e.name,
              startDate: e.nextStart,
              ...(e.nextEnd ? { endDate: e.nextEnd } : {}),
              eventStatus: 'https://schema.org/EventScheduled',
              ...(e.destination
                ? { location: { '@type': 'Place', name: e.destination.name } }
                : {}),
              ...(e.summary ? { description: e.summary } : {}),
              ...(e.website ? { url: e.website } : {}),
            },
          })),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <PageHero
        width="narrow"
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('events') }]}
          />
        }
        icon={CalendarDays}
        eyebrow={t('eyebrow')}
        title={t('h1')}
        lead={t('intro')}
      >
        <ScopeSwitch
          all={all}
          href={all ? '/events' : { pathname: '/events', query: { all: '1' } }}
        />
      </PageHero>

      <div className="container-page py-10 sm:py-14">

      {/* An agenda, not nine stacked sections.
      
          Measured before this: 5,940px — 6.6 screens — for sixteen events. Each
          month carried a full section frame with a text-2xl heading and 48px of
          space around it, so a month holding ONE event cost 309px, and the page
          was mostly the chrome around its own content.
      
          The grouping is right and stays: these events are grouped by the month
          they habitually fall in because most have no confirmed dates. What
          changes is the weight of the divider — a small tracked label on a rule
          rather than a section heading — and the events become rows on a shared
          divider instead of bordered cards. Nothing is removed: name, kind,
          place, country, summary, advice, dates and the official link are all
          still here.
      
          The month label sticks under the header while its events scroll past,
          which is what makes a long agenda readable — you can always see which
          month you are in. */}
      <div className="mx-auto max-w-3xl">
        {[...byMonth.keys()]
          .sort((a, b) => a - b)
          .map((month) => (
            <section key={month} className="mt-8 first:mt-0">
              <div className="sticky top-[var(--header-h)] z-10 flex flex-wrap items-baseline justify-between gap-3 border-b bg-background/95 py-2 backdrop-blur-sm">
                <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                  {monthName(month, locale)}
                </h2>
                <Link
                  href={{
                    pathname: '/when-to-go/[month]',
                    params: { month: slugForMonth(month, locale) },
                  }}
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  {t('conditionsThisMonth')}
                </Link>
              </div>

              <ul className="divide-y">
                {byMonth.get(month)!.map((e) => (
                  <li key={e.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="font-display text-lg font-semibold">{e.name}</h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {kindLabel(e.kind)}
                      </span>
                    </div>

                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {e.destination && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden />
                          <Link
                            href={{
                              pathname: '/destinations/[slug]',
                              params: { slug: e.destination.slug },
                            }}
                            className="hover:text-primary"
                          >
                            {e.destination.name}
                          </Link>
                        </span>
                      )}
                      {e.countryCode && <span>{countryName(e.countryCode, locale)}</span>}
                    </p>

                    {e.summary && (
                      <p className="mt-2 text-sm leading-relaxed">{e.summary}</p>
                    )}

                    {e.advice && (
                      /* A note on a rule rather than a filled box.
                      
                         This is the most useful thing on the page — "the first
                         week is a period of official mourning" is what changes
                         somebody's plans — so it is not going behind a
                         disclosure to win a scroll metric. But it appears on
                         every event, and a filled box on every row is 20px of
                         padding sixteen times over for something that reads
                         perfectly well as an indented note. */
                      <p className="mt-2 flex gap-2 border-l-2 border-primary/40 py-0.5 pl-3 text-sm leading-relaxed text-muted-foreground">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span>{e.advice}</span>
                      </p>
                    )}

                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {/* Confirmed dates when an organiser has announced them,
                          and a plain statement that they have not when they
                          have not. Never a guess: a festival date is the one
                          field on this site that puts somebody on a plane. */}
                      <span>
                        {e.nextStart
                          ? t('confirmed', {
                              dates: e.nextEnd
                                ? `${dateFmt.format(new Date(e.nextStart))} – ${dateFmt.format(
                                    new Date(e.nextEnd),
                                  )}`
                                : dateFmt.format(new Date(e.nextStart)),
                            })
                          : t('unconfirmed', { month: monthName(month, locale) })}
                      </span>
                      {e.website && (
                        <a
                          href={e.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5" aria-hidden />
                          {t('officialSite')}
                        </a>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>

      <p className="mx-auto mt-10 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {t('disclaimer')}
      </p>
      </div>
    </>
  );
}
