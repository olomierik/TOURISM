import { getTranslations } from 'next-intl/server';
import * as Icons from 'lucide-react';
import { BadgeCheck, CircleDollarSign, Store } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { BusinessCard } from '@/components/cards/business-card';
import { DestinationCard } from '@/components/cards/destination-card';
import { GuideCard } from '@/components/cards/guide-card';
import { meetsCuration } from '@/lib/curation';
import { getSiteFacts } from '@/lib/queries/site-facts';
import { getFeaturedBusinesses } from '@/lib/queries/businesses';
import { getDestinations, type CategoryWithCount } from '@/lib/queries/taxonomy';
import { getGuides } from '@/lib/queries/guides';
import type { Locale } from '@/i18n/routing';
import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/utils';

/**
 * The homepage sections, design.md §7.1.
 *
 * Nine blocks, in the order the spec sets, with a mobile target of 4,500px and
 * a desktop one of 4,200. The old page ran to 6,279px on mobile across twelve
 * blocks, five of which §7.1 removes outright: the events list, "Find what you
 * need near you", "Put your business on the map", the newsletter, and the
 * duplicate "Not sure where to start?". None of them are deleted from the site
 * — they move to /events, the Plan menu and the footer, which is where someone
 * looking for them goes.
 */

/** A section wrapper, so the vertical rhythm is set once rather than per block. */
function Band({
  children,
  tone = 'default',
  className,
  label,
}: {
  children: React.ReactNode;
  tone?: 'default' | 'muted' | 'night';
  className?: string;
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        tone === 'muted' && 'bg-surface-muted',
        tone === 'night' && 'on-dark bg-sunset text-night-text',
        className,
      )}
    >
      {/* Every band settles in as it is reached. One primitive, applied in one
          place, rather than an effect per section — see components/ui/reveal. */}
      <Reveal className="container-page py-16 sm:py-24">{children}</Reveal>
    </section>
  );
}

function Heading({
  title,
  link,
  linkLabel,
}: {
  title: string;
  /** A typed route. `string` would compile here and fail at every call site. */
  link?: React.ComponentProps<typeof Link>['href'];
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-10">
      {/* Premium-safari heading: a short gold rule, then the title at
          editorial size. */}
      <div>
        <span className="mb-4 block h-px w-10 bg-gold" aria-hidden />
        <h2 className="font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05]">{title}</h2>
      </div>
      {link && linkLabel && (
        <Link
          href={link}
          className="text-body-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {linkLabel}
          <span aria-hidden> {'→'}</span>
        </Link>
      )}
    </div>
  );
}

/**
 * §7.1.2 Trust strip — four facts in a row, 2×2 on a phone.
 *
 * The first count is live from the database. §8.2: numbers over adjectives,
 * and a hand-typed "over 1,000 operators" is a claim nobody remembers to
 * revise.
 */
export async function TrustStrip({ locale }: { locale: Locale }) {
  const [facts, t] = await Promise.all([getSiteFacts(), getTranslations('home.trust')]);
  const n = new Intl.NumberFormat(locale);

  const items = [
    { Icon: Store, text: t('businesses', { count: n.format(facts.operators) }) },
    { Icon: CircleDollarSign, text: t('free') },
    { Icon: WhatsAppGlyph, text: t('whatsapp') },
    { Icon: BadgeCheck, text: t('verified') },
  ];

  return (
    <section aria-label={t('label')} className="border-b bg-surface">
      <ul className="container-page grid grid-cols-2 gap-x-5 gap-y-4 py-6 lg:grid-cols-4 lg:divide-x lg:py-7">
        {items.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-3 lg:justify-center lg:px-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-sand text-gold">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="text-body-sm font-semibold">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * §7.1.3 "What you get back" — the QuoteCard list, labelled Example.
 *
 * Every figure here is invented, and the block says so twice: a Badge on the
 * heading and the word "Example" on each card. §7.1.3 is explicit that it stays
 * that way "until real anonymised data exists", and the reason is §8.2 — a
 * sample quote that reads as a real one is a price the site has made up and
 * attributed to an operator who never sent it.
 */
export async function SampleQuotes() {
  const t = await getTranslations('home.sample');

  const quotes = [
    { price: 'US$2,340', days: 7, style: t('styleMid'), hours: 4 },
    { price: 'US$1,890', days: 7, style: t('styleBudget'), hours: 9 },
    { price: 'US$3,750', days: 8, style: t('styleLuxury'), hours: 20 },
  ];

  return (
    <Band tone="muted">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-heading-xl">{t('title')}</h2>
        <Badge variant="listed">{t('exampleBadge')}</Badge>
      </div>
      <p className="mb-6 max-w-2xl text-body text-muted-foreground">{t('lead')}</p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-sm:[&>*:nth-child(n+3)]:hidden">
        {quotes.map((q, i) => (
          <li
            key={q.price}
            className="flex items-start gap-3 rounded-lg border bg-surface p-4 shadow-[var(--elev-xs)]"
          >
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-body-sm font-semibold text-muted-foreground"
              aria-hidden
            >
              {t('operatorInitial', { n: i + 1 })}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-body font-semibold">
                  {t('operatorName', { n: i + 1 })}
                </span>
                <span className="shrink-0 text-body font-semibold tabular-nums">{q.price}</span>
              </span>
              <span className="mt-0.5 flex items-baseline justify-between gap-2 text-body-sm text-muted-foreground">
                <span className="truncate">{t('meta', { days: q.days, style: q.style })}</span>
                <span className="shrink-0">{t('perPerson')}</span>
              </span>
              <span className="mt-1 block text-body-sm text-muted-foreground">
                {t('repliedIn', { hours: q.hours })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/**
 * §7.1.4 Browse by type — "only categories with ≥ 25 listings".
 *
 * The threshold is the point. Six category tiles were shown regardless of what
 * was behind them, so Tour Guides sent visitors to a page of twenty rows with
 * the same prominence as Stays, which has 1,080. The rest stay reachable from
 * the directory's own category filter.
 */
const MIN_CATEGORY_LISTINGS = 25;

export async function BrowseByType({
  locale,
  categories,
}: {
  locale: Locale;
  categories: CategoryWithCount[];
}) {
  const t = await getTranslations('home.categories');
  const n = new Intl.NumberFormat(locale);
  const shown = categories.filter((c) => c.businessCount >= MIN_CATEGORY_LISTINGS);
  if (shown.length === 0) return null;

  return (
    <Band>
      <Heading title={t('title')} link="/directory" linkLabel={t('viewAll')} />
      {/* Interface refresh (2026-10): the row fills its width whatever the
          number of categories. Five fixed columns left three cards and an
          empty half-row on a site with three categories over the minimum. */}
      <ul className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {shown.map((c) => {
          const Icon =
            (c.icon && (Icons as unknown as Record<string, typeof Icons.Compass>)[c.icon]) ||
            Icons.Compass;
          return (
            <li key={c.slug}>
              <Link
                href={{ pathname: '/directory', query: { category: c.slug } }}
                className="group flex h-full items-center gap-4 rounded-2xl border bg-surface p-5 shadow-[var(--elev-xs)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[var(--elev-lg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-pill bg-sand text-gold transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-heading-md font-semibold leading-snug">
                    {c.name}
                  </span>
                  <span className="mt-0.5 block text-body-sm tabular-nums text-muted-foreground">
                    {n.format(c.businessCount)}
                  </span>
                </span>
                <Icons.ArrowRight
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/**
 * §7.1.5 Where to go, and when — six DestinationCards with best months.
 *
 * Desktop grid, mobile horizontal scroll-snap at 80% card width, which is what
 * keeps six 4:5 cards from costing 2,000px on a phone. The strip is a real
 * scroll container rather than a carousel: §3.5 forbids autoplay, and a
 * scroll-snap strip is the thing a thumb already knows how to use.
 */
export async function WhereAndWhen({ locale }: { locale: Locale }) {
  const [destinations, t] = await Promise.all([
    getDestinations(locale, { limit: 24 }),
    getTranslations('home.destinations'),
  ]);

  // §9.3: Tanzania by default on every listing surface.
  const tz = destinations.filter((d) => (d.countryCode ?? 'TZ').toUpperCase() === 'TZ').slice(0, 6);
  if (tz.length === 0) return null;

  return (
    <Band tone="muted">
      <Heading title={t('title')} link="/destinations" linkLabel={t('viewAll')} />
      {/* Mobile: a scroll-snap strip at 80% width, so six destinations cost one
          card's height instead of six.

          Desktop: the bento §7.1.5 asks for — the lead across 2x2 and five
          tiles around it, on fixed rows. Fixed rows are the point. A flat grid
          of six 4:5 cards is 1,203px at 1920, because each card takes its
          height from its own aspect ratio and a third of the section's height
          is the second row repeating the first. Here the grid sets the heights
          and each card fills its cell, so the lead is genuinely larger and the
          block is 600px rather than 1,200. */}
      <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:auto-rows-[15rem] sm:grid-cols-4 sm:overflow-visible sm:px-0">
        {tz.map((d, i) => (
          <li
            key={d.id}
            className={cn(
              // The ratio lives on the item below 640 because the card fills
              // its cell from `sm` up, where the grid rows give it a height.
              'w-[80%] shrink-0 snap-start max-sm:aspect-[4/5] sm:w-auto',
              i === 0 && 'sm:col-span-2 sm:row-span-2',
            )}
          >
            <DestinationCard destination={d} size={i === 0 ? 'feature' : 'tile'} />
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** §7.1.6 How it works — three numbered steps. The numbers are the sequence. */
export async function HowItWorks() {
  const t = await getTranslations('home.how');
  const steps = [t('step1Title'), t('step2Title'), t('step3Title')];
  const bodies = [t('step1Body'), t('step2Body'), t('step3Body')];

  return (
    <Band>
      <Heading title={t('title')} />
      <ol className="grid gap-5 md:grid-cols-3">
        {steps.map((title, i) => (
          <li key={title} className="flex gap-3.5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-primary text-body-sm font-semibold text-primary-foreground tabular-nums"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-heading-sm font-semibold">{title}</span>
              <span className="mt-1 block text-body-sm text-muted-foreground">{bodies[i]}</span>
            </span>
          </li>
        ))}
      </ol>
    </Band>
  );
}

/**
 * §7.1.7 Featured operators — max 6, §9.2 rules, hidden below 3.
 *
 * On today's data this renders nothing, and that is the gate working. §9.2
 * wants licence-checked listings with three real photos and three reviews
 * averaging 4.0; the database holds 2 verified listings, 1 review in total, and
 * photo rows that are 96% dead Google hotlinks. Rather than relax the rule to
 * fill a row, §7.1.7's own instruction applies: hide the section.
 */
export async function FeaturedOperators({ locale }: { locale: Locale }) {
  const [pool, t] = await Promise.all([
    getFeaturedBusinesses(locale, 24),
    getTranslations('home.featured'),
  ]);

  const eligible = pool.filter((b) => meetsCuration(b, 'featured')).slice(0, 6);
  if (eligible.length < 3) return null;

  return (
    <Band>
      <Heading title={t('title')} link="/directory" linkLabel={t('viewAll')} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {eligible.map((b) => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </Band>
  );
}

/**
 * §7.1.8 Price transparency, on the Night band.
 *
 * The one place §3.1 allows the Sun fill, and the only dark section on the
 * page. The stacked bar has a text equivalent beside it rather than under it,
 * because the sentence is the fact and the bar is the illustration — a reader
 * who gets only one of the two should get the sentence.
 *
 * The figures are constants here and must stay in step with /trip-cost; §7.1.8
 * asks for them to be "pulled from the cost guide", which is a shared source
 * this codebase does not yet have. Named in one place so there is one edit
 * when it does.
 */
export const SAFARI_DAY_RATE = { low: 250, high: 450, feesLow: 100, feesHigh: 170 };

export async function PriceBand() {
  const t = await getTranslations('home.price');
  // The fee share of the midpoint, for the bar's split.
  const mid = (SAFARI_DAY_RATE.low + SAFARI_DAY_RATE.high) / 2;
  const feeMid = (SAFARI_DAY_RATE.feesLow + SAFARI_DAY_RATE.feesHigh) / 2;
  const feePct = Math.round((feeMid / mid) * 100);

  return (
    <Band tone="night">
      <h2 className="max-w-3xl text-balance font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.05]">{t('title')}</h2>
      <p className="mt-4 max-w-2xl text-body-lg text-night-muted">{t('body')}</p>

      <div className="mt-8 max-w-2xl">
        <div
          className="flex h-4 overflow-hidden rounded-pill"
          role="img"
          aria-label={t('barLabel', { fees: feePct, rest: 100 - feePct })}
        >
          <span className="bg-highlight" style={{ width: `${feePct}%` }} />
          <span className="flex-1 bg-white/25" />
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-body-sm">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-pill bg-highlight" aria-hidden />
            <dt className="text-night-muted">{t('fees')}</dt>
            <dd className="font-semibold tabular-nums">{feePct}%</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-pill bg-white/25" aria-hidden />
            <dt className="text-night-muted">{t('rest')}</dt>
            <dd className="font-semibold tabular-nums">{100 - feePct}%</dd>
          </div>
        </dl>
      </div>

      <Button asChild variant="highlight" size="lg" className="mt-8">
        <Link href="/trip-cost">{t('cta')}</Link>
      </Button>
    </Band>
  );
}

/** §7.1.9 Plan with confidence — three guides and the index link. */
export async function PlanWithConfidence({ locale }: { locale: Locale }) {
  const [guides, t] = await Promise.all([
    getGuides(locale, { limit: 3 }),
    getTranslations('home.guides'),
  ]);
  if (guides.length === 0) return null;

  return (
    <Band>
      <Heading title={t('title')} link="/guides" linkLabel={t('viewAll')} />
      {/* Three stacked guide cards cost 547px on a phone — more than the price
          band and more than any other block here. As a snap strip they cost
          one card, and the gesture is the same one the destinations above
          already taught. From 640 they fill the row and the strip is a grid. */}
      <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {guides.map((g) => (
          <li key={g.id} className="flex w-[82%] shrink-0 snap-start sm:w-auto">
            <GuideCard guide={g} className="w-full" />
          </li>
        ))}
      </ul>
    </Band>
  );
}

/**
 * §7.0 global end-of-page band — "One request, up to six quotes".
 *
 * Shared, because the rule attached to it is "Never twice on a page" and the
 * only way to keep that true across directory, destination, guides, when-to-go,
 * events and hidden gems is for there to be one component to put at the end.
 */
export async function EndBand() {
  const t = await getTranslations('home.endBand');
  return (
    <section className="bg-surface-muted">
      <div className="container-page flex flex-col items-start gap-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
        <div className="min-w-0">
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight">{t('title')}</h2>
          <p className="mt-2 text-body-lg text-muted-foreground">{t('body')}</p>
        </div>
        <Button asChild size="lg" className="shrink-0 max-sm:w-full">
          <Link href="/request-quote">{t('cta')}</Link>
        </Button>
      </div>
    </section>
  );
}
