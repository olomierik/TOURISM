'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Link2, Minus, Plus, Receipt, TriangleAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { CostableDestination } from '@/lib/queries/taxonomy';
import { estimate, STYLES, type Style } from '@/lib/trip/cost';
import { DEFAULT_NIGHTS, MAX_STOPS, parseTrip, serializeTrip } from '@/lib/trip/url';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

/**
 * The trip cost estimator.
 *
 * All of the arithmetic lives in lib/trip/cost.ts and is tested against
 * fixtures; this file only collects the inputs and renders what comes back.
 * That split is deliberate — a wrong total is invisible in a screenshot, so the
 * part that can be quietly wrong is the part that has 40 assertions on it.
 *
 * Three presentational rules follow from the same honesty the destination cost
 * sections already commit to:
 *
 *   Ranges, never a single figure. The spread between a mid-range lodge in
 *   April and the same lodge in August is larger than most people's idea of
 *   the whole trip, and a single number would be read as a quote.
 *
 *   Destinations without published figures are named in the output rather than
 *   dropped. A total that silently omits two of five stops is worse than one
 *   that says which two it could not price.
 *
 *   The government floor is shown. It is the one number no operator can
 *   discount, and it is what lets a reader tell a cheap quote from a quote with
 *   something removed.
 */
export function CostEstimator({
  destinations,
  locale,
}: {
  destinations: CostableDestination[];
  locale: Locale;
}) {
  const t = useTranslations('tripCost');
  const router = useRouter();
  const searchParams = useSearchParams();

  const byId = useMemo(() => new Map(destinations.map((d) => [d.id, d])), [destinations]);

  // Read once, as the initial value. Deriving on every render would fight the
  // inputs — a number field cannot be typed into if each keystroke round-trips
  // through the router before coming back — and a useEffect that copies props
  // into state is the thing the React Compiler lint correctly rejects.
  //
  // A slug in the URL that matches no destination is dropped here rather than
  // held as a ghost leg: someone hand-editing a share link should get the
  // stops that exist, not an error.
  const [initial] = useState(() => parseTrip(new URLSearchParams(searchParams.toString())));

  const [legs, setLegs] = useState<Array<{ id: string; nights: number }>>(() =>
    initial.stops
      .map((s) => {
        const d = destinations.find((x) => x.slug === s.slug);
        return d ? { id: d.id, nights: s.nights } : null;
      })
      .filter((l): l is { id: string; nights: number } => l !== null),
  );
  const [style, setStyle] = useState<Style>(initial.style);
  const [travellers, setTravellers] = useState(initial.travellers);
  const [copied, setCopied] = useState(false);

  /**
   * Mirror the trip into the address bar.
   *
   * replace rather than push, so a ten-step build does not bury the page the
   * reader arrived from under ten history entries — the back button should
   * leave the calculator, not walk back through it a night at a time.
   */
  function syncUrl(
    nextLegs: Array<{ id: string; nights: number }>,
    nextStyle: Style,
    nextTravellers: number,
  ) {
    const query = serializeTrip({
      stops: nextLegs
        .map((l) => ({ slug: byId.get(l.id)?.slug ?? '', nights: l.nights }))
        .filter((s) => s.slug !== ''),
      style: nextStyle,
      travellers: nextTravellers,
    });

    // next-intl's router is typed against the declared pathnames and will not
    // take an assembled string, so the query goes through the object form.
    router.replace(
      {
        pathname: '/trip-cost',
        query: Object.fromEntries(new URLSearchParams(query)),
      },
      { scroll: false },
    );
    setCopied(false);
  }

  const result = useMemo(() => {
    if (legs.length === 0) return null;
    return estimate(
      legs.map((l) => {
        const d = byId.get(l.id);
        return {
          destinationId: l.id,
          name: d?.name ?? l.id,
          nights: l.nights,
          costs: d?.costs ?? null,
        };
      }),
      style,
      travellers,
    );
  }, [legs, style, travellers, byId]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: result?.currency ?? 'USD',
        maximumFractionDigits: 0,
      }),
    [locale, result?.currency],
  );

  const range = (low: number, high: number) =>
    low === high ? money.format(low) : `${money.format(low)} – ${money.format(high)}`;

  function addLeg(id: string) {
    if (!id || legs.some((l) => l.id === id) || legs.length >= MAX_STOPS) return;
    // Fired once, on the first stop. Every subsequent add would be the same
    // signal at ten times the volume.
    if (legs.length === 0) track('trip_planner_started', { tool: 'cost' });
    const next = [...legs, { id, nights: DEFAULT_NIGHTS }];
    setLegs(next);
    syncUrl(next, style, travellers);
  }

  function setNights(id: string, nights: number) {
    const next = legs.map((l) =>
      l.id === id ? { ...l, nights: Math.min(60, Math.max(1, nights)) } : l,
    );
    setLegs(next);
    syncUrl(next, style, travellers);
  }

  function removeLeg(id: string) {
    const next = legs.filter((l) => l.id !== id);
    setLegs(next);
    syncUrl(next, style, travellers);
  }

  function chooseStyle(next: Style) {
    setStyle(next);
    syncUrl(legs, next, travellers);
  }

  function chooseTravellers(next: number) {
    setTravellers(next);
    syncUrl(legs, style, next);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard access is refused in some browsers and every insecure
      // context. The URL is already correct in the address bar, so the button
      // simply does not confirm rather than throwing at the reader.
      setCopied(false);
    }
  }

  // The label carries the unit in words on the destination pages; here the
  // basis is data, so the two can never disagree.
  const FEE_KEYS = [
    'craterDescent',
    'gorillaPermit',
    'chimpPermit',
    'climbPackage',
    'trekPackage',
  ] as const;
  type FeeKey = (typeof FEE_KEYS)[number];
  const feeLabel = (k: string) =>
    FEE_KEYS.includes(k as FeeKey) ? t(`fee.${k as FeeKey}`) : null;

  const unpicked = destinations.filter((d) => !legs.some((l) => l.id === d.id));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <h2 className="font-display text-xl font-semibold">{t('buildTitle')}</h2>

        <label className="mt-4 block">
          <span className="text-sm font-medium">{t('addStop')}</span>
          <select
            className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value=""
            onChange={(e) => addLeg(e.target.value)}
            disabled={unpicked.length === 0}
          >
            <option value="">
              {unpicked.length === 0 ? t('allAdded') : t('choose')}
            </option>
            {unpicked.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        {legs.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {legs.map((l) => {
              const d = byId.get(l.id);
              // A seven-day climb costs what it costs. Leaving the stepper live
              // on a leg whose price cannot move invites a reader to set three
              // nights, see no change, and distrust the whole calculator.
              const fixed =
                d?.costs.notableBasis === 'package_per_person'
                  ? d.costs.notableNights
                  : null;
              const shown = fixed ?? l.nights;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-4"
                >
                  <span className="w-full min-w-0 sm:w-auto sm:flex-1">
                    <span className="block font-medium">{d?.name}</span>
                    {fixed !== null && (
                      <span className="block text-xs text-muted-foreground">
                        {t('fixedByPackage')}
                      </span>
                    )}
                  </span>

                  <div className="flex flex-1 items-center gap-1 sm:flex-none">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fixed !== null}
                      aria-label={t('fewerNights', { name: d?.name ?? '' })}
                      onClick={() => setNights(l.id, l.nights - 1)}
                    >
                      <Minus className="size-4" aria-hidden />
                    </Button>
                    <span className="w-20 text-center text-sm tabular-nums">
                      {t('nights', { count: shown })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fixed !== null}
                      aria-label={t('moreNights', { name: d?.name ?? '' })}
                      onClick={() => setNights(l.id, l.nights + 1)}
                    >
                      <Plus className="size-4" aria-hidden />
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('remove', { name: d?.name ?? '' })}
                    onClick={() => removeLeg(l.id)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <fieldset className="mt-8">
          <legend className="text-sm font-medium">{t('styleLabel')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => chooseStyle(s)}
                aria-pressed={style === s}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm transition-colors',
                  style === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-secondary',
                )}
              >
                {t(`style.${s}`)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t(`styleHint.${style}`)}</p>
        </fieldset>

        <label className="mt-8 block max-w-xs">
          <span className="text-sm font-medium">{t('travellers')}</span>
          <input
            type="number"
            min={1}
            max={20}
            value={travellers}
            onChange={(e) =>
              chooseTravellers(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
            }
            className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums"
          />
        </label>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border p-5">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Receipt className="size-5 text-primary" aria-hidden />
            {t('resultTitle')}
          </h2>

          {!result ? (
            <p className="mt-4 text-sm text-muted-foreground">{t('resultEmpty')}</p>
          ) : (
            <>
              <p className="mt-4 text-3xl font-semibold tabular-nums">
                {range(result.perPersonLow, result.perPersonHigh)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('perPerson', { nights: result.nights })}
              </p>

              {result.travellers > 1 && (
                <p className="mt-3 text-sm">
                  {t('groupTotal', {
                    total: range(result.groupLow, result.groupHigh),
                    count: result.travellers,
                  })}
                </p>
              )}

              <ul className="mt-5 space-y-2 border-t pt-4 text-sm">
                {result.lines.map((line) => (
                  <li key={line.destinationId} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="truncate">{line.name}</span>{' '}
                      <span className="text-muted-foreground">
                        {t('nights', { count: line.nights })}
                      </span>
                      {line.fee && feeLabel(line.fee.key) && (
                        <span className="block text-xs text-muted-foreground">
                          + {feeLabel(line.fee.key)}
                        </span>
                      )}
                      {line.pricedAsPackage && (
                        <span className="block text-xs text-muted-foreground">
                          {t('packagePriced')}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {line.low === null || line.high === null
                        ? t('noFigures')
                        : range(line.low, line.high)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* The one number no operator can discount. It is what turns a
                  quote from "cheap" into "cheap, with something removed". */}
              {result.floorLow > 0 && (
                <p className="mt-4 rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed">
                  {t('floor', { amount: range(result.floorLow, result.floorHigh) })}
                </p>
              )}

              {result.missing.length > 0 && (
                <p className="mt-4 flex gap-2 rounded-lg border border-dashed p-3 text-xs leading-relaxed">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{t('missing', { names: result.missing.join(', ') })}</span>
                </p>
              )}

              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {t('excludes')}
              </p>

              {result.asOf !== null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('asOf', { year: result.asOf })}
                </p>
              )}

              {/* The estimate lives in the URL, so sharing it is copying the
                  address bar. Worth a button: nobody thinks to select a URL to
                  send their partner a safari budget. */}
              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Link2 className="size-4" aria-hidden />
                )}
                {copied ? t('linkCopied') : t('copyLink')}
              </Button>

              <Button asChild className="mt-3 w-full">
                <Link
                  href={{
                    pathname: '/request-quote',
                    query: {
                      duration: String(result.nights),
                      travelers: String(result.travellers),
                      budget: style,
                    },
                  }}
                  onClick={() =>
                    track('trip_planner_completed', {
                      tool: 'cost',
                      nights: result.nights,
                      travellers: result.travellers,
                      style,
                    })
                  }
                >
                  {t('getQuote')}
                </Link>
              </Button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
