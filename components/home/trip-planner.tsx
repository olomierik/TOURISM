'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { CalendarDays, MapPin, Search, Sparkles, Users } from 'lucide-react';

import type { DestinationSummary } from '@/lib/queries/taxonomy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { track } from '@/lib/analytics/track';

/**
 * The homepage trip planner.
 *
 * Asks the three questions anyone can answer standing up — where, when, how
 * many — and hands the answers to the quote form rather than asking again. The
 * long form already collects all of this; what it lacked was a way in that does
 * not look like a form.
 *
 * Deliberately not a second quote form. Everything typed here arrives as query
 * parameters on /request-quote, so there is one lead pipeline, one validation
 * path and one honeypot, and this component can be redesigned without touching
 * any of them.
 *
 * The free-text search stays alongside it. Someone who knows they want
 * "gorilla trekking" should not have to express that as a destination and a
 * date range first, and that search is how most people currently arrive.
 */
export function TripPlanner({ destinations }: { destinations: DestinationSummary[] }) {
  const t = useTranslations('home.planner');
  const router = useRouter();

  const [mode, setMode] = useState<'plan' | 'search'>('plan');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [adults, setAdults] = useState('2');

  // Today, so the date field cannot be set in the past — a trip starting
  // yesterday is a typo, and the quote would be routed on it.
  const today = new Date().toISOString().slice(0, 10);

  function plan(e: React.FormEvent) {
    e.preventDefault();
    track('trip_planner_completed', { destination: destination || null, adults });

    const query: Record<string, string> = { adults };
    if (destination) query.destination = destination;
    if (start) query.travelStart = start;

    router.push({ pathname: '/request-quote', query });
  }

  return (
    <div className="w-full max-w-2xl">
      <div
        role="tablist"
        aria-label={t('modeLabel')}
        className="mb-3 flex gap-1 rounded-full bg-background/70 p-1 backdrop-blur-sm"
      >
        {(['plan', 'search'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            {t(m === 'plan' ? 'tabPlan' : 'tabSearch')}
          </button>
        ))}
      </div>

      {mode === 'plan' ? (
        <form
          onSubmit={plan}
          className="rounded-2xl bg-background/95 p-4 shadow-lg backdrop-blur-sm sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="tp-destination" className="flex items-center gap-1.5 text-xs">
                <MapPin className="size-3.5" aria-hidden />
                {t('where')}
              </Label>
              <select
                id="tp-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="">{t('anywhere')}</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tp-start" className="flex items-center gap-1.5 text-xs">
                <CalendarDays className="size-3.5" aria-hidden />
                {t('when')}
              </Label>
              <Input
                id="tp-start"
                type="date"
                min={today}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tp-adults" className="flex items-center gap-1.5 text-xs">
                <Users className="size-3.5" aria-hidden />
                {t('who')}
              </Label>
              <Input
                id="tp-adults"
                type="number"
                min={1}
                max={40}
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="h-11 w-full sm:w-20"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="mt-4 w-full">
            <Sparkles className="size-4" aria-hidden />
            {t('cta')}
          </Button>

          <p className="mt-2.5 text-center text-xs text-muted-foreground">{t('note')}</p>
        </form>
      ) : (
        <form
          action="/search"
          onSubmit={() => track('search_started', { from: 'hero' })}
          className="rounded-2xl bg-background/95 p-4 shadow-lg backdrop-blur-sm sm:p-5"
        >
          <Label htmlFor="tp-q" className="sr-only">
            {t('searchLabel')}
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="tp-q"
                name="q"
                type="search"
                required
                placeholder={t('searchPlaceholder')}
                className="h-12 pl-9"
              />
            </div>
            <Button type="submit" size="lg">
              {t('searchButton')}
            </Button>
          </div>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">{t('note')}</p>
        </form>
      )}
    </div>
  );
}
