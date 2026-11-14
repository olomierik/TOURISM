'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, BookOpenCheck, Crown } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { computeAchievements, type AchievementSpecies } from '@/lib/wildlife/achievements';
import { Button } from '@/components/ui/button';
import { AchievementGrid } from '@/components/wildlife/achievement-grid';
import { useMySightings } from '@/components/wildlife/use-my-sightings';

/**
 * The "your safari" panel at the top of the wildlife guide.
 *
 * Lifted out of the page so the page can stay static. The progress bar, the
 * badge count and the diary link all depend on who is reading, and resolving
 * that on the server meant a cookies() call, which made every guide page
 * dynamic and uncacheable. The guide is a search surface — 192 URLs in the
 * sitemap — so it is the wrong place to pay that.
 *
 * The species projection comes in as a prop rather than being imported here,
 * so the whole dataset is not bundled into the client a second time; the card
 * list below this panel already carries what the library needs.
 */
export function MySafari({
  species,
  bigFiveTotal,
}: {
  species: AchievementSpecies[];
  bigFiveTotal: number;
}) {
  const t = useTranslations('wildlife');
  const { signedIn, seenSlugs } = useMySightings();

  const total = species.length;
  const known = new Set(species.map((s) => s.slug));
  const seenCount = seenSlugs.filter((s) => known.has(s)).length;
  const bigFiveSeen = seenSlugs.filter((slug) => species.find((s) => s.slug === slug)?.bigFive)
    .length;
  const achievements = computeAchievements(seenSlugs, species);
  const earned = achievements.filter((a) => a.done).length;

  // Until the session resolves, show the signed-out panel. It is the state
  // almost every reader is in, it is what the page rendered before this moved
  // to the browser, and holding an empty box of the right height instead would
  // mean a visitor stares at nothing on the one panel meant to recruit them.
  // A signed-in reader sees it for as long as reading a local cookie takes.
  if (signedIn !== true) {
    return (
      <section
        aria-labelledby="my-safari"
        className="mb-5 overflow-hidden rounded-xl border bg-surface-muted sm:mb-8"
      >
        {/* Compact (2026-10): one row on a phone - title and Sign in. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3.5 sm:gap-5 sm:p-6">
          <div className="min-w-0 max-w-2xl">
            <div className="max-sm:hidden">
              <p className="eyebrow">{t('mySafari.title')}</p>
            </div>
            <h2
              id="my-safari"
              className="font-display text-[1rem] font-semibold leading-snug sm:mt-2 sm:text-heading-lg"
            >
              {t('mySafari.signedOutTitle')}
            </h2>
            <p className="mt-2 hidden text-body text-muted-foreground sm:line-clamp-2">
              {t('mySafari.signedOutBody')}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-3">
            <Button asChild>
              <Link href={{ pathname: '/login', query: { next: '/account/sightings' } }}>
                {t('mySafari.signIn')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="max-md:hidden">
              <Link href={{ pathname: '/register', query: { next: '/account/sightings' } }}>
                {t('mySafari.register')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="my-safari"
      className="mb-5 overflow-hidden rounded-xl border bg-surface-muted sm:mb-8"
    >
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,18rem)_1fr] lg:items-center">
        <div>
          <p className="eyebrow">{t('mySafari.title')}</p>
          <h2 id="my-safari" className="mt-2 font-display text-heading-lg font-semibold">
            {t('mySafari.seenOf', { seen: seenCount, total })}
          </h2>
          <div
            className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-sunken"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={seenCount}
            aria-label={t('mySafari.title')}
          >
            <div
              className="h-full rounded-pill bg-gold"
              style={{ width: `${total ? Math.round((seenCount / total) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-3 flex items-center gap-2 text-body-sm text-muted-foreground">
            <Crown className="size-4 text-gold" aria-hidden />
            {t('mySafari.bigFive', { seen: bigFiveSeen, total: bigFiveTotal })}
            <span aria-hidden>·</span>
            {t('mySafari.badges', { count: earned })}
          </p>
          <Button asChild className="mt-5">
            <Link href="/account/sightings">
              <BookOpenCheck className="size-4" aria-hidden />
              {t('mySafari.openDiary')}
            </Link>
          </Button>
        </div>
        <AchievementGrid achievements={achievements} limit={5} />
      </div>
    </section>
  );
}
