'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import {
  BedDouble,
  Binoculars,
  Car,
  Compass,
  Crosshair,
  Mountain,
  Search,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { PinMap, type Pin } from '@/components/map/pin-map';
import type { Locale } from '@/i18n/routing';
import { nearbyResults } from '@/lib/trip/near-action';
import { NEAR_LIMIT } from '@/lib/trip/near';
import { parseNearQuery } from '@/lib/trip/near-query';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

type Anchor = { name: string; lat: number; lng: number };
type Category = { id: string; key: string; name: string };

/** The directory's six kinds, by category key, as tiles a thumb can hit. */
const KIND_ICONS: Record<string, LucideIcon> = {
  hotels: BedDouble,
  'car-rental': Car,
  safaris: Binoculars,
  restaurants: UtensilsCrossed,
  activities: Mountain,
  'tour-guides': Compass,
};
/** Tile order: what people look for nearby first, not the directory's order. */
const KIND_ORDER = ['hotels', 'car-rental', 'restaurants', 'safaris', 'activities', 'tour-guides'];

/**
 * "What is around me."
 *
 * Three things this has to get right, and none of them is the list.
 *
 * The permission prompt is explained before it appears. A browser dialog that
 * arrives unannounced on page load is refused by most people and cannot be
 * asked again, so the button says what it is for and the reader presses it.
 *
 * The position goes through a server action rather than a URL, so it never
 * reaches a query string, a route or a log line. Nothing is stored.
 *
 * The card list comes back as an element rather than as rows, because the
 * cards are async server components and cannot render inside this file. The
 * map comes back as data and is rendered here, because it is a client
 * component and one returned through an action cannot be resolved at all.
 *
 * A refusal is not a dead end: the destination chips do the same job from a
 * place the reader picks, which is also what somebody planning from home wants.
 */
type Results = {
  count: number;
  pins: Pin[];
  list: ReactNode;
  place: string;
  km: number;
  lat: number;
  lng: number;
  /** How many of each category lie in the radius, keyed by category id. */
  categoryCounts: Record<string, number>;
};

export function Nearby({
  anchors,
  quickPlaces,
  categories,
  locale,
  initial,
}: {
  /**
   * Every place that can be searched from: the main towns, then the
   * destinations. Also what the search box recognises as "in Zanzibar".
   */
  anchors: Anchor[];
  /** The few offered as one-tap chips; the rest are in the "More places" list. */
  quickPlaces: string[];
  /** Every category the directory has, in curation order. */
  categories: Category[];
  locale: Locale;
  /**
   * The opening set, rendered on the server by the page. It is what the reader
   * sees before pressing anything, and it is also what puts the card tree's
   * client components into this route's manifest — without it the action's
   * results cannot be resolved at all. See the page for the full reason.
   */
  initial: Results;
}) {
  const t = useTranslations('nearMe');
  const [pending, startTransition] = useTransition();
  // The map is rendered here rather than inside the element the action
  // returns. PinMap is a client component, and a client component reached only
  // through a server action's return value is not in the route's client
  // manifest — React cannot resolve it and the whole result lands in the error
  // boundary. Imported in this file it is part of the route's own client graph,
  // which is what makes it resolvable.
  const [results, setResults] = useState<Results | null>(initial);
  // The opening set came from a destination, so that chip starts selected —
  // the results on screen and the highlighted chip have to agree.
  const [from, setFrom] = useState<Anchor | null>(
    anchors.find((a) => a.name === initial.place) ?? null,
  );
  const [usedLocation, setUsedLocation] = useState(false);
  const [radius, setRadius] = useState(initial.km);
  const [denied, setDenied] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [notUnderstood, setNotUnderstood] = useState(false);
  // Which listing the reader is pointing at, in either half. One piece of
  // state for both directions, so the map and the list cannot disagree about
  // what is highlighted.
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Map -> list. The cards come from the server as an opaque element, so the
  // highlight is written onto the DOM node rather than passed as a prop. Only
  // the previously-marked node is cleared, so this stays O(1) per hover
  // instead of walking two dozen cards every time the pointer moves.
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const previous = root.querySelector('[data-active="true"]');
    if (previous) previous.removeAttribute('data-active');
    if (!activeId) return;
    const next = root.querySelector(`[data-business-id="${CSS.escape(activeId)}"]`);
    next?.setAttribute('data-active', 'true');
  }, [activeId]);

  // Stable references for the map.
  //
  // These were object literals in the JSX, which meant a new `center` and a new
  // `you` on every render of this component — and both are in PinMap's map
  // effect dependency list. So hovering a card, which sets state here, was
  // disposing and rebuilding the entire Leaflet instance: tiles repainted,
  // bounds refitted, and the marker registry cleared out from under the
  // highlight that the hover had just asked for. The pairing looked broken and
  // was in fact working on markers that no longer existed.
  //
  // Memoised on the coordinates themselves, so the map rebuilds when the search
  // moves and not when the pointer does.
  const mapCenter = useMemo(
    () => (results ? { lat: results.lat, lng: results.lng } : null),
    [results],
  );
  // `place` is already 'your location' or the chip's name.
  const mapYou = useMemo(
    () => (results ? { lat: results.lat, lng: results.lng, label: results.place } : null),
    [results],
  );

  const RADII = [25, 50, 100, 200];

  // One chip shape for all three filter rows.
  //
  // They had three: the destinations were `rounded-lg px-3 py-1.5 text-sm`, the
  // categories the same, and the radius buttons `rounded-md px-2.5 py-1 text-xs`
  // — smaller, tighter and a different corner, for no reason anybody chose.
  // Three rows of filters in two shapes reads as drift, and it is the sort that
  // is invisible while you are writing it and obvious on the page.
  const chip = 'rounded-lg border px-3 py-1.5 text-sm transition-colors';
  const chipOn = 'border-primary bg-primary text-primary-foreground';
  const chipOff = 'hover:bg-secondary';

  function search(lat: number, lng: number, place: string, km: number, cat = category) {
    startTransition(async () => {
      const r = await nearbyResults(lat, lng, km, locale, cat ?? undefined);
      // The origin is kept alongside the results rather than in the action's
      // response: it is what the map centres on and what the heading names,
      // and it never leaves this component except as one POST body.
      setResults({ ...r, place, km, lat, lng });
    });
  }

  function fromAnchor(a: Anchor, km = radius, cat = category) {
    setFrom(a);
    setUsedLocation(false);
    search(a.lat, a.lng, a.name, km, cat);
  }

  /**
   * No position: say so, and still answer the question from wherever the page
   * is already searching. Somebody who asked for "car hire near me" and said
   * no to the browser still wants car hire, just from a place they pick.
   */
  function refused(km: number, cat: string | null) {
    setDenied(true);
    if (from) fromAnchor(from, km, cat);
    else if (results) search(results.lat, results.lng, results.place, km, cat);
  }

  function locate(km = radius, cat = category) {
    if (!('geolocation' in navigator)) {
      refused(km, cat);
      return;
    }

    const found = (pos: GeolocationPosition) => {
      setDenied(false);
      setFrom(null);
      setUsedLocation(true);
      // Passed through as reported. It used to be rounded to ~1km, which
      // protected nothing — the coordinate builds one query and is never
      // stored — while moving every result by up to a kilometre.
      track('search_started', { tool: 'near_me' });
      search(pos.coords.latitude, pos.coords.longitude, t('yourLocation'), km, cat);
    };

    navigator.geolocation.getCurrentPosition(
      found,
      (err) => {
        // A refusal is final; a timeout is not. Asking for GPS makes timeouts
        // considerably more likely — a laptop indoors has no GPS to answer
        // with — and giving up there would make this button worse than it was
        // before, for the people it was already working for. So the second
        // attempt takes the network estimate, which is a few kilometres out
        // and still an answer.
        if (err.code === err.PERMISSION_DENIED) {
          refused(km, cat);
          return;
        }
        navigator.geolocation.getCurrentPosition(found, () => refused(km, cat), {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 300_000,
        });
      },
      // High accuracy asks for GPS rather than settling for the wifi and cell
      // estimate, which in a city can be several kilometres out — that was the
      // larger half of "near me is not accurate". It costs a little battery
      // and a few seconds, which is why the timeout is longer.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    );
  }

  /**
   * Repeat the current search with one thing changed.
   *
   * The origin is already in state: search() stores it on results, and the
   * map centres on it. So neither widening the radius nor switching category
   * has to go back through the browser's permission prompt. The radius buttons
   * used to re-prompt, on the stated grounds that this component did not keep
   * the coordinate — it does, and re-asking cost a round trip through the
   * geolocation stack for a position already in memory.
   *
   * Nothing about that weakens the privacy claim, which is that the position
   * is never stored, never put in a URL and never logged. Reusing a value this
   * component already holds does none of those things.
   */
  function rerun(km: number, cat: string | null) {
    if (from) {
      fromAnchor(from, km, cat);
      return;
    }
    if (results) {
      search(results.lat, results.lng, results.place, km, cat);
      return;
    }
    locate(km, cat);
  }

  /**
   * "car hire near me", "hotels in Zanzibar": what kind, and from where.
   *
   * `fromLink` is set when the words came from a link rather than the box:
   * then "near me" does not open the browser's location prompt by itself
   * (an unannounced prompt is refused and cannot be asked again), it waits
   * for the button.
   */
  function runQuery(text: string, fromLink = false) {
    const q = parseNearQuery(
      text,
      anchors.map((a) => a.name),
    );
    const cat = q.categoryKey ? (categories.find((c) => c.key === q.categoryKey)?.id ?? null) : category;
    const anchor = q.place ? anchors.find((a) => a.name === q.place) : undefined;
    setNotUnderstood(!q.categoryKey && !anchor && !q.nearMe);
    if (!q.categoryKey && !anchor && !q.nearMe) return;
    setCategory(cat);
    track('search_started', { tool: 'near_me_text' });
    if (anchor) fromAnchor(anchor, radius, cat);
    else if (q.nearMe && !fromLink) locate(radius, cat);
    else rerun(radius, cat);
  }

  // A link can ask for a search: /near-me?q=car+hire+near+me, or
  // ?type=car-rental&near=Moshi. Read once, on arrival.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const typed = p.get('q');
    const type = p.get('type');
    const near = p.get('near');
    if (!typed && !type && !near) return;
    const text = [typed, type?.replace('-', ' '), near ? `in ${near}` : null].filter(Boolean).join(' ');
    // Deferred out of the effect body: a one-off sync from the URL on arrival.
    queueMicrotask(() => {
      setQuery(typed ?? '');
      runQuery(text, true);
    });
    // Once, on arrival; the search itself depends on nothing that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kinds = KIND_ORDER.map((key) => categories.find((c) => c.key === key)).filter(
    (c): c is Category => Boolean(c),
  );
  const quick = quickPlaces
    .map((name) => anchors.find((a) => a.name === name))
    .filter((a): a is Anchor => Boolean(a));
  const others = anchors.filter((a) => !quickPlaces.includes(a.name));

  return (
    <div>
      {/* One card, three questions in the order people ask them: what am I
          looking for (typed, or a tile), and near where. It replaces a row of
          twelve park names above a category row that only appeared after a
          search had run — the kind of place was the first thing people wanted
          to say and the last thing the page let them say. */}
      <section className="rounded-2xl border bg-card p-3 shadow-[var(--elev-xs)] sm:p-4">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runQuery(query);
          }}
          className="flex gap-2"
        >
          <label htmlFor="near-q" className="sr-only">
            {t('queryLabel')}
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="near-q"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setNotUnderstood(false);
              }}
              placeholder={t('queryPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
              className="h-11 w-full rounded-xl border bg-background ps-9 pe-3 text-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" className="h-11 shrink-0" disabled={pending}>
            {t('searchButton')}
          </Button>
        </form>
        <p className="mt-1.5 text-caption text-muted-foreground">
          {notUnderstood ? t('notUnderstood') : t('examples')}
        </p>

        {/* What kind: six tiles, counted for the current place and radius. */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label={t('whatKind')}>
          {kinds.map((c) => {
            const Icon = KIND_ICONS[c.key] ?? Compass;
            const n = results?.categoryCounts[c.id];
            const on = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? null : c.id;
                  setCategory(next);
                  rerun(radius, next);
                }}
                className={cn(
                  'press flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary',
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="text-body-sm font-medium leading-tight">
                  {t.has(`kinds.${c.key}` as 'kinds.hotels') ? t(`kinds.${c.key}` as 'kinds.hotels') : c.name}
                </span>
                {n !== undefined && (
                  <span className={cn('text-caption tabular-nums', on ? 'opacity-90' : 'text-muted-foreground')}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Near where. */}
        <div className="mt-3 flex items-center gap-2">
          <span className="shrink-0 text-body-sm font-medium">{t('nearLabel')}</span>
          <div className="scrollbar-none -me-3 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pe-3 sm:flex-wrap sm:overflow-visible">
            <Button
              type="button"
              size="sm"
              variant={usedLocation ? 'primary' : 'outline'}
              onClick={() => locate()}
              disabled={pending}
              className="shrink-0"
            >
              <Crosshair className="size-4" aria-hidden />
              {pending && usedLocation ? t('locating') : t('useMyLocation')}
            </Button>
            {quick.map((a) => (
              <button
                key={a.name}
                type="button"
                onClick={() => fromAnchor(a)}
                aria-pressed={from?.name === a.name}
                className={cn(chip, 'shrink-0 whitespace-nowrap', from?.name === a.name ? chipOn : chipOff)}
              >
                {a.name}
              </button>
            ))}
            {others.length > 0 && (
              <select
                aria-label={t('morePlaces')}
                value={from && !quickPlaces.includes(from.name) ? from.name : ''}
                onChange={(e) => {
                  const a = anchors.find((x) => x.name === e.target.value);
                  if (a) fromAnchor(a);
                }}
                className={cn(
                  chip,
                  'shrink-0 bg-background',
                  from && !quickPlaces.includes(from.name) ? 'border-primary text-primary' : '',
                )}
              >
                <option value="">{t('morePlaces')}</option>
                {others.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {denied && <p className="mt-2 text-body-sm">{t('denied')}</p>}
      </section>
      <p className="mt-2 text-caption leading-relaxed text-muted-foreground max-sm:line-clamp-2">
        {t('privacy')}
      </p>

      {(results || pending) && (
        <>
          {/* What kind of thing, before how far.
              
              This is the fix for "near me only shows tour operators". It always
              returned every category — from Arusha at 50km it returns hotels,
              car hire, restaurants, activities and guides as well as safaris —
              but it returns them nearest first, and in a town whose directory
              runs 565 operators deep the nearest two dozen of anything are
              operators. The reader could not tell the difference between a tool
              that only knows tour companies and one that is merely sorted that
              way.
              
              So the counts are shown before anything is pressed. 'Hotels (105)'
              beside 'Safaris (98)' is the page stating what it has, and
              choosing one asks the database for the nearest of that kind rather
              than filtering the two dozen already on screen — which would have
              answered 11 and been wrong by an order of magnitude. */}
          {/* What kind, and how far, on the same line.
          
              They were two rows with a 32px and a 24px margin above them, and
              the radius row was right-aligned on a line of its own carrying
              four buttons. "What kind of thing, within what distance" is one
              question asked twice, so it reads better as one line: kinds from
              the left, distance pushed right by `ml-auto`, wrapping to its own
              line only when there is genuinely no room. */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-b pb-3">
            <span className="text-body-sm font-medium">{t('within')}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {RADII.map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => {
                    setRadius(km);
                    rerun(km, category);
                  }}
                  aria-pressed={radius === km}
                  className={cn(chip, 'tabular-nums', radius === km ? chipOn : chipOff)}
                >
                  {t('km', { km })}
                </button>
              ))}
            </div>
          </div>

          <div className={cn('mt-5', pending && 'opacity-50')}>
            {results && (
              <>
                <h2 className="font-display text-xl font-semibold">
                  {results.count === 0
                    ? t('noneFound', { place: results.place, km: results.km })
                    : // A full page means there are more; saying '24 listings
                      // within 50 km' would state a total that is not true, and
                      // the chips above are already showing 86 of one kind.
                      results.count >= NEAR_LIMIT
                      ? t('foundNearest', {
                          count: results.count,
                          place: results.place,
                          km: results.km,
                        })
                      : t('found', {
                          count: results.count,
                          place: results.place,
                          km: results.km,
                        })}
                </h2>

                {/* Map and list side by side, paired both ways.
                
                    "Near me" is a question about space, and a column of names
                    is a poor answer to it — but so is a map stacked above a
                    list, which is what this was: you read a name, scroll up to
                    find which dot it is, and lose your place. Beside each
                    other, pointing at either half rings the other, so the two
                    are one answer rather than two.
                
                    The map sticks and the list scrolls past it, because the map
                    is the frame of reference and a frame of reference that
                    scrolls away is not one. Only from `lg`: on a phone there is
                    no room for two columns, so it falls back to the map above
                    the list at a fixed height, which is the honest shape at
                    that width.
                
                    Listings placed from a town are drawn as a soft area rather
                    than a pin, and take no part in the pairing — one circle can
                    stand for 251 businesses, so ringing it because one of them
                    is hovered would point at the wrong thing. */}
                <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
                  <div
                    ref={listRef}
                    onMouseOver={(e) => {
                      const card = (e.target as HTMLElement).closest?.('[data-business-id]');
                      const id = card?.getAttribute('data-business-id') ?? null;
                      if (id !== activeId) setActiveId(id);
                    }}
                    onMouseLeave={() => setActiveId(null)}
                  >
                    {results.list}
                  </div>

                  {results.pins.length > 0 && (
                    <div className="order-first lg:order-none lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:h-[calc(100vh-var(--header-h)-3rem)]">
                      <PinMap
                        pins={results.pins}
                        center={mapCenter}
                        you={mapYou}
                        label={t('mapLabel')}
                        activeId={activeId}
                        onActivate={setActiveId}
                        height="fill"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
