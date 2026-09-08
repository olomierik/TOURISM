import { getTranslations } from 'next-intl/server';
import { ArrowRight, Compass, MapPin } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { RowList, Row } from '@/components/ui/row-list';
import { getEvents } from '@/lib/queries/taxonomy';
import { getSiteFacts } from '@/lib/queries/site-facts';
import { monthName } from '@/lib/months';
import { NewsletterForm } from '@/components/home/newsletter-form';

/**
 * The sections that turn a safari directory homepage into a discovery homepage.
 *
 * Everything here reads from queries that already existed — events, site facts,
 * destinations. Nothing new is stored and nothing is invented: where a number
 * appears it was counted, and where a section would have nothing to show it
 * does not render.
 */

/* ------------------------------------------------------------------ events */

/**
 * What is on, as a strip rather than a grid.
 *
 * Deliberately a different shape from the business and destination cards above
 * it. Four sections of identical rounded cards is where a homepage stops being
 * scannable and becomes wallpaper, and an event's useful content — a month and
 * a place — is a line of text, not a photograph.
 */
export async function EventsStrip({ locale }: { locale: Locale }) {
  const [events, t] = await Promise.all([
    getEvents(locale),
    getTranslations({ locale, namespace: 'home.eventsStrip' }),
  ]);

  if (events.length === 0) return null;

  const soon = events.slice(0, 4);

  return (
    <section className="border-y bg-primary/5 py-section">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{t('title')}</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{t('subtitle')}</p>
          </div>
          <Link
            href="/events"
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            {t('viewAll')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {/* The month is the meta, hard right, because it is what somebody
            scanning this actually sorts by — and it is one word, which is
            exactly what the right-hand column of a row is for.

            The 48px calendar tile is gone. Four identical calendar glyphs
            beside four events tell a reader nothing they did not know from the
            heading, and they cost more height than the summary they sat
            beside. */}
        <RowList columns={2} className="mt-5">
          {soon.map((e) => (
            <Row
              key={e.id}
              href="/events"
              title={e.name}
              meta={e.typicalMonth !== null ? monthName(e.typicalMonth, locale) : undefined}
              description={
                e.destination && e.summary
                  ? `${e.destination.name} · ${e.summary}`
                  : (e.destination?.name ?? e.summary)
              }
            />
          ))}
        </RowList>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- near me */

/**
 * Discovery from where somebody is standing.
 *
 * Links into /near-me, which already does the work: it rounds the position in
 * the browser, sends it through a server action rather than a URL, and stores
 * nothing. The chips pre-select a category so "hotels near me" is one tap
 * rather than a search.
 */
export async function NearMeTeaser({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home.nearMe' });

  // Only categories that exist. A chip reading "Health services near me" on a
  // site with no health listings is a promise the next screen breaks.
  const chips = [
    { key: 'hotels' as const, slug: 'hotels' },
    { key: 'safaris' as const, slug: 'safaris' },
    { key: 'carRental' as const, slug: 'car-rental' },
    { key: 'activities' as const, slug: 'activities' },
  ];

  return (
    <section className="py-section">
      <div className="container-page">
        {/* A band, not a panel.

            It was 445px to carry a heading, one button and four pills, because
            `p-8 md:p-12` sat inside a section that already paid `py-section`
            and the left column ran heading, eyebrow and a three-line paragraph
            before reaching the button.

            The paragraph's second half — that the position is rounded in the
            browser and never stored — moved to /near-me, which is where the
            permission is actually requested and therefore where the promise
            has to be made. A disclosure on the teaser is a disclosure one page
            early. */}
        <div className="overflow-hidden rounded-3xl bg-banner text-banner-foreground">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 px-6 py-7 md:px-10 md:py-8">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
                <Compass className="size-3.5" aria-hidden />
                {t('eyebrow')}
              </p>
              <h2 className="mt-1.5 font-display text-xl font-bold sm:text-2xl">{t('title')}</h2>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-primary-foreground/80">
                {t('body')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ul className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <li key={chip.slug}>
                    <Link
                      href={{ pathname: '/directory', query: { category: chip.slug } }}
                      className="inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium ring-1 ring-white/15 transition-colors hover:bg-white/20"
                    >
                      {t(`chip.${chip.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link href="/near-me">
                  <MapPin className="size-4" aria-hidden />
                  {t('cta')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- why us */

/**
 * Four reasons, each with a real number under it.
 *
 * "Thousands of listings" is a claim; "1,329 listings" is a fact, and the
 * difference is the whole point of a section like this. The counts come from
 * the same query the about page uses, so they cannot drift from what the
 * database holds.
 */
export async function WhyExploreTanzania({ locale }: { locale: Locale }) {
  const [facts, t] = await Promise.all([
    getSiteFacts(),
    getTranslations({ locale, namespace: 'home.why' }),
  ]);

  const n = new Intl.NumberFormat(locale);

  const items = [
    { value: n.format(facts.operators), title: t('t1'), body: t('b1') },
    { value: n.format(facts.destinations), title: t('t2'), body: t('b2') },
    { value: n.format(facts.seasonality), title: t('t3'), body: t('b3') },
    { value: n.format(facts.guides), title: t('t4'), body: t('b4') },
  ];

  return (
    <section className="border-t py-section">
      <div className="container-page">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{t('title')}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>

        {/* No icon tiles. A 44px filled square holding a shop glyph above the
            number "2,618" adds nothing the number does not already say, and
            four of them cost 60px each once the margin below is counted. The
            figure is the mark. */}
        <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ value, title, body }) => (
            <li key={title}>
              <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
              <h3 className="mt-0.5 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------- list your business */

export async function ListBusinessCta({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home.listBusiness' });

  return (
    /* Not a third centred panel.

       QuoteCta, this and the newsletter closed the homepage as three
       consecutive centred boxes — heading, body, button, three times, so by the
       second one the reader has stopped reading. Nothing here is cut; the shape
       changes instead.

       And the shape should differ anyway: everything above this speaks to
       somebody planning a trip, and this speaks to an operator deciding whether
       to list. A different audience answering a different question reads better
       left-aligned with the ask beside it than centred like the rest. */
    <section className="py-section">
      <div className="container-page">
        <div className="grid items-center gap-6 border-l-4 border-accent bg-muted px-6 py-6 md:grid-cols-[1.4fr_auto] md:gap-12 md:px-10 md:py-7">
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">{t('title')}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t('body')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/register">{t('primary')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/about">{t('secondary')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- newsletter */

export async function Newsletter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home.newsletter' });

  return (
    /* A strip between two hairlines rather than a third panel. Same words, a
       quieter object — which is the right weight for the last thing on the
       page, and it saves roughly 120px on every homepage. */
    <section className="border-y">
      <div className="container-page py-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_minmax(0,26rem)] md:gap-12">
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">{t('title')}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t('body')}</p>
          </div>
          <div>
            <NewsletterForm locale={locale} />
            <p className="mt-2 text-xs text-muted-foreground">{t('privacy')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
