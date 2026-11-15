'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, X } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

/**
 * Recently viewed tours — SafariBookings shows "Your Recently Viewed Tour"
 * second on its home page, because someone comparing safaris comes back to
 * the ones they were weighing up.
 *
 * Kept in this browser only (localStorage), never sent anywhere: it is a
 * convenience for the person at this device, the same as a browser's own
 * history, and a list of which safaris someone looked at is not something the
 * site needs to hold. Storage can be missing or refuse a write — a private
 * window, blocked site data — so every read and write is guarded and the
 * component simply renders nothing.
 *
 * Rendered after mount only. The server cannot know what this browser
 * viewed, and rendering a guess would flash the wrong list.
 */

const KEY = 'et:recent-tours';
const MAX = 6;

export type RecentTour = {
  slug: string;
  /** The locale the tour was viewed in, which is a locale its page exists in. */
  locale: string;
  title: string;
  price: string | null;
  days: number | null;
  image: string | null;
  operator: string;
  at: number;
};

function read(): RecentTour[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as RecentTour[]).filter((t) => t && typeof t.slug === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: RecentTour[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Storage full or blocked: the list is a convenience, so it is dropped.
  }
}

/** Placed on a tour page: records the visit, renders nothing. */
export function RememberTour({ tour }: { tour: Omit<RecentTour, 'at'> }) {
  useEffect(() => {
    write([{ ...tour, at: Date.now() }, ...read().filter((t) => t.slug !== tour.slug)]);
    // The tour's identity is its slug; re-recording on other prop changes would
    // only reorder the same entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.slug]);
  return null;
}

/** The strip. `exclude` leaves out the tour the reader is already on. */
export function RecentlyViewedTours({ exclude, className }: { exclude?: string; className?: string }) {
  const t = useTranslations('tours');
  const locale = useLocale() as Locale;
  const [list, setList] = useState<RecentTour[] | null>(null);

  useEffect(() => {
    // Read once on mount: the list lives in this browser, not on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList(read().filter((r) => r.slug !== exclude));
  }, [exclude]);

  if (!list || list.length === 0) return null;

  function clear() {
    write([]);
    setList([]);
  }

  return (
    <section aria-labelledby="recent-tours-title" className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="recent-tours-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('recentTitle')}
        </h2>
        <button
          type="button"
          onClick={clear}
          className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
          {t('recentClear')}
        </button>
      </div>
      <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {list.map((r) => (
          <li key={r.slug} className="w-64 shrink-0 snap-start">
            <Link
              href={{ pathname: '/packages/[slug]', params: { slug: r.slug } }}
              locale={r.locale === locale ? undefined : (r.locale as Locale)}
              className="flex h-full gap-3 rounded-xl border bg-surface p-2.5 transition-colors hover:border-primary"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                {r.image && <Image src={r.image} alt="" fill sizes="64px" quality={60} className="object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{r.title}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {r.days ? (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" aria-hidden />
                      {t('recentDays', { days: r.days })}
                    </span>
                  ) : null}
                  {r.price && <span className="font-semibold text-foreground">{r.price}</span>}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
