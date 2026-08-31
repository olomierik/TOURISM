import { getTranslations } from 'next-intl/server';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Compass,
  MapPin,
  Search,
  Store,
} from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
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

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {soon.map((e) => (
            <li key={e.id}>
              <Link
                href="/events"
                className="group flex items-start gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <CalendarDays className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold group-hover:text-primary">{e.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    {e.typicalMonth !== null && <span>{monthName(e.typicalMonth, locale)}</span>}
                    {e.destination && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{e.destination.name}</span>
                      </>
                    )}
                  </span>
                  {e.summary && (
                    <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-muted-foreground">
                      {e.summary}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
        <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground">
          <div className="grid gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:items-center md:p-12">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground/70">
                <Compass className="size-4" aria-hidden />
                {t('eyebrow')}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{t('title')}</h2>
              <p className="mt-3 max-w-lg leading-relaxed text-primary-foreground/80">
                {t('body')}
              </p>

              <Button
                asChild
                size="lg"
                className="mt-6 bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90"
              >
                <Link href="/near-me">
                  <MapPin className="size-4" aria-hidden />
                  {t('cta')}
                </Link>
              </Button>
            </div>

            <ul className="flex flex-wrap gap-2 md:justify-end">
              {chips.map((chip) => (
                <li key={chip.slug}>
                  <Link
                    href={{ pathname: '/directory', query: { category: chip.slug } }}
                    className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/15 transition-colors hover:bg-white/20"
                  >
                    {t(`chip.${chip.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
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
    { Icon: Store, value: n.format(facts.operators), title: t('t1'), body: t('b1') },
    { Icon: MapPin, value: n.format(facts.destinations), title: t('t2'), body: t('b2') },
    { Icon: BadgeCheck, value: n.format(facts.seasonality), title: t('t3'), body: t('b3') },
    { Icon: Search, value: n.format(facts.guides), title: t('t4'), body: t('b4') },
  ];

  return (
    <section className="border-t py-section">
      <div className="container-page">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{t('title')}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>

        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ Icon, value, title, body }) => (
            <li key={title}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-4 font-display text-2xl font-bold tabular-nums">{value}</p>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
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
    <section className="py-section">
      <div className="container-page">
        <div className="rounded-3xl border-2 border-brand-gold/40 bg-brand-gold/10 p-8 text-center md:p-14">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{t('title')}</h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">
            {t('body')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-brand-gold text-brand-gold-foreground hover:bg-brand-gold/90"
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
    <section className="border-t py-section">
      <div className="container-page">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{t('title')}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t('body')}</p>
          <div className="mt-6">
            <NewsletterForm locale={locale} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t('privacy')}</p>
        </div>
      </div>
    </section>
  );
}
