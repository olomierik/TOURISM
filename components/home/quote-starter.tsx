'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarDays, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ChipGroup, ToggleChip } from '@/components/ui/chip';
import { DestinationCombobox, type ComboboxOption } from '@/components/ui/destination-combobox';
import {
  MonthPicker,
  monthNamesFor,
  type DateRange,
  type MonthValue,
} from '@/components/ui/month-picker';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';

/**
 * QuoteStarter — design.md §7.1.1.
 *
 * The homepage's one job, in one form: trip type, where, when, who, budget, and
 * a button that says what you get. §7.0 names it as the home template's single
 * primary action.
 *
 * It does not submit a quote. It carries everything into `/request-quote` at
 * step 2 with the fields prefilled — "Submitting carries all values to
 * /request-quote?step=2&... **Never lose input.**" That sentence is the design:
 * the old homepage had a search bar and a separate "plan my trip" disclosure,
 * and both of them threw away what the visitor typed when they led somewhere
 * else. Here the first screen's work is the second screen's starting state.
 *
 * On a phone this collapses to the two fields §7.1 allows above the fold —
 * Where and the CTA — with the trip-type chips scrolling horizontally above
 * them. When, who and budget are step 2's job on a small screen, and asking
 * five questions before a visitor knows what the site does is how a form gets
 * abandoned.
 */

export type TripType = 'safari' | 'kilimanjaro' | 'zanzibar' | 'safari-beach';
export type Budget = 'under-250' | '250-450' | 'over-450';

/**
 * The four trip types, and the message key for each.
 *
 * Several can be chosen at once. A safari followed by a week on Zanzibar is
 * the ordinary Tanzanian itinerary rather than an unusual one, and asking for
 * exactly one forced that visitor to describe half their trip — then to
 * correct it in the wizard, or not at all.
 */
const TRIP_TYPE_OPTIONS = [
  { value: 'safari', labelKey: 'typeSafari' },
  { value: 'kilimanjaro', labelKey: 'typeKilimanjaro' },
  { value: 'zanzibar', labelKey: 'typeZanzibar' },
  { value: 'safari-beach', labelKey: 'typeSafariBeach' },
] as const satisfies ReadonlyArray<{ value: TripType; labelKey: string }>;

/** Toggle one on or off, but never leave the form with none selected. */
function toggle(current: TripType[], value: TripType): TripType[] {
  if (!current.includes(value)) return [...current, value];
  return current.length > 1 ? current.filter((t) => t !== value) : current;
}

export function QuoteStarter({
  destinations,
  className,
  variant = 'hero',
}: {
  destinations: ComboboxOption[];
  className?: string;
  /** `inline` is the smaller card §7.12 puts inside a guide article. */
  variant?: 'hero' | 'inline';
}) {
  const t = useTranslations('quoteStarter');
  const locale = useLocale();
  const router = useRouter();

  const [tripTypes, setTripTypes] = React.useState<TripType[]>(['safari']);
  const [where, setWhere] = React.useState<string[]>([]);
  const [when, setWhen] = React.useState<MonthValue>(null);
  const [exactDates, setExactDates] = React.useState<DateRange>(null);
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [budget, setBudget] = React.useState<Budget | ''>('');
  const [openPanel, setOpenPanel] = React.useState<'when' | 'who' | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const monthNames = React.useMemo(() => monthNamesFor(locale), [locale]);
  const inline = variant === 'inline';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Step 2, because step 1 is trip type and where — which this form has
    // already asked. Arriving at step 1 with it filled in looks like the site
    // forgot, even when every field is correct.
    const params = new URLSearchParams({ step: '2' });
    for (const type of tripTypes) params.append('tripType', type);
    for (const d of where) params.append('destination', d);
    // Exact dates win when they are set, because somebody who typed two days
    // has told us more than a month can carry.
    if (exactDates?.start || exactDates?.end) {
      if (exactDates.start) params.set('start', exactDates.start);
      if (exactDates.end) params.set('end', exactDates.end);
    } else if (when) {
      params.set('month', String(when.month));
      params.set('year', String(when.year));
    }
    params.set('adults', String(adults));
    if (children > 0) params.set('children', String(children));
    if (budget) params.set('budget', budget);
    router.push(`/${locale}/request-quote?${params.toString()}`);
  }

  const budgets: { value: Budget; label: string }[] = [
    { value: 'under-250', label: t('budgetUnder') },
    { value: '250-450', label: t('budgetMid') },
    { value: 'over-450', label: t('budgetOver') },
  ];

  // What the When button reads when it is closed. Exact dates are shown as a
  // range in the page's own locale; a half-filled range still says what it
  // knows rather than falling back to "Not sure yet", which would look like
  // the field had been ignored.
  const dateFmt = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    [locale],
  );
  const asDate = (v: string) => dateFmt.format(new Date(`${v}T00:00:00`));

  const whenSummary = exactDates?.start
    ? exactDates.end
      ? `${asDate(exactDates.start)} – ${asDate(exactDates.end)}`
      : asDate(exactDates.start)
    : exactDates?.end
      ? asDate(exactDates.end)
      : when
        ? `${monthNames[when.month - 1]} ${when.year}`
        : t('whenAny');

  return (
    <form
      onSubmit={submit}
      aria-label={t('formLabel')}
      className={cn(
        // §3.4: the hero quote form is the one place that takes radius-xl and
        // --elev-lg, so it reads as the page's instrument rather than a panel.
        // @container, not sm:. This card lives in a hero column roughly
        // half the viewport wide, so `sm:grid-cols-2` fired at 640px of
        // *window* while the card itself was still ~290px — which is how
        // three budget chips ended up overlapping each other inside a
        // half-width cell. Container queries ask the only question that
        // matters here: how wide is this form?
        '@container min-w-0 rounded-xl bg-surface',
        inline ? 'border p-4 shadow-[var(--elev-sm)]' : 'p-4 shadow-[var(--elev-lg)] sm:p-5',
        className,
      )}
    >
      {/* Trip type, as a grid rather than a scrolling row.
      
          It scrolled horizontally because four chips wrap to two rows at
          375px and that pushed the CTA off the first screen. The cost was
          that two of the four trip types were off-canvas on a phone — the
          reader had to discover a sideways scroll to learn that Kilimanjaro
          and Zanzibar were options at all. A 2x2 grid shows all four in the
          same height two wrapped rows would have taken, and the fields below
          are what moved to make room. */}
      <ChipGroup legend={t('typeLegend')} hint={t('typeHint')} className="mb-3">
        <div className="grid w-full grid-cols-2 gap-2 @lg:grid-cols-4">
          {TRIP_TYPE_OPTIONS.map((type) => (
            <ToggleChip
              key={type.value}
              name="tripType"
              type="checkbox"
              value={type.value}
              label={t(type.labelKey)}
              checked={tripTypes.includes(type.value)}
              onChange={() => setTripTypes(toggle(tripTypes, type.value))}
              className="w-full justify-center px-2 text-center"
            />
          ))}
        </div>
      </ChipGroup>

      {/* Where and When share a row from sm up, and Who and Budget share the
          next one. Stacked, these four blocks ran to roughly 520px of form
          under the chips — taller than the viewport left beside the hero, so
          the CTA sat below the fold on a laptop. Paired, the same five
          questions fit two rows and the button comes back onto the first
          screen. On a phone they stack as before. */}
      <div className="grid gap-3 @md:grid-cols-2">
        <DestinationCombobox
          name="destination"
          label={t('whereLabel')}
          placeholder={t('wherePlaceholder')}
          options={destinations}
          multiple
          value={where}
          onChange={setWhere}
          removeLabel={t('remove')}
        />

        {/* When keeps its popover — a 12-month grid standing open is 200px of
            form, and a month is one tap once the panel is open. It now also
            opens onto two native date fields, so somebody who has booked
            flights can say so instead of inventing a month they will correct
            later. */}
        <Popover
          open={openPanel === 'when'}
          onOpenChange={(o) => setOpenPanel(o ? 'when' : null)}
          label={t('whenLabel')}
          summary={whenSummary}
          icon={<CalendarDays className="size-4 text-muted-foreground" aria-hidden />}
        >
          <MonthPicker
            label={t('whenLabel')}
            monthNames={monthNames}
            value={when}
            onChange={(v) => {
              setWhen(v);
              // Only a chosen month closes the panel. MonthPicker also calls
              // this with null — when a month is deselected, and when the
              // exact-dates link is followed — and closing on those shut the
              // panel in the same tick the date fields appeared in it.
              if (v) setOpenPanel(null);
            }}
            exactDates={exactDates}
            onExactDatesChange={(v) => {
              setExactDates(v);
              if (v) setWhen(null);
            }}
            exactLabel={t('exactDates')}
            monthLabel={t('pickMonth')}
          />
        </Popover>
      </div>

      <div className="mt-3 grid gap-3">
        <fieldset className="min-w-0">
          <legend className="mb-1.5 flex items-center gap-2 text-label font-semibold text-foreground">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            {t('whoLabel')}
          </legend>
          <div className="divide-y rounded-sm border-control bg-surface px-3">
            <Stepper
              label={t('adults')}
              value={adults}
              min={1}
              max={16}
              onChange={setAdults}
              decrementLabel={t('fewerAdults')}
              incrementLabel={t('moreAdults')}
              className="py-1.5"
            />
            <Stepper
              label={t('children')}
              value={children}
              min={0}
              max={10}
              onChange={setChildren}
              decrementLabel={t('fewerChildren')}
              incrementLabel={t('moreChildren')}
              className="py-1.5"
            />
          </div>
        </fieldset>

        {/* Budget, visible on a phone too. It was hidden below 640, which
            meant the single field operators most need to price a trip was
            desktop only. Three columns here rather than a scrolling row, for
            the same reason the trip types changed. */}
        <ChipGroup legend={t('budgetLegend')}>
          <div className="grid w-full grid-cols-1 gap-2 @xs:grid-cols-3">
            {budgets.map((b) => (
              <ToggleChip
                key={b.value}
                name="budget"
                value={b.value}
                label={b.label}
                checked={budget === b.value}
                onChange={() => setBudget(budget === b.value ? '' : b.value)}
                className="w-full justify-center px-2 text-center"
              />
            ))}
          </div>
        </ChipGroup>
      </div>

      <Button type="submit" size="lg" loading={submitting} className="mt-4 w-full">
        {t('submit')}
        {!submitting && <ArrowRight aria-hidden />}
      </Button>

    </form>
  );
}

/**
 * A small disclosure popover for the When and Who fields.
 *
 * Local to this file on purpose. It is a button and a positioned panel with
 * Esc-to-close — a general Popover primitive would need focus trapping,
 * collision detection and a portal, none of which two fields inside a form
 * card need, and all of which would have to be maintained.
 */
function Popover({
  open,
  onOpenChange,
  label,
  summary,
  icon,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  summary: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      <span className="mb-1.5 block text-label font-semibold text-foreground">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-12 w-full items-center gap-2 rounded-sm border-control bg-surface px-3 text-left text-base outline-none focus-visible:border-primary"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{summary}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[var(--z-dropdown)] mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-lg border bg-popover p-3 shadow-[var(--elev-lg)]">
          {children}
        </div>
      )}
    </div>
  );
}
