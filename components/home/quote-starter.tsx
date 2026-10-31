'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarDays, Users, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ToggleChip } from '@/components/ui/chip';
import { DestinationCombobox, type ComboboxOption } from '@/components/ui/destination-combobox';
import { monthNamesFor, type DateRange, type MonthValue } from '@/components/ui/month-picker';
import { WhenPicker } from '@/components/home/when-picker';
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
  const [openPanel, setOpenPanel] = React.useState<'when' | 'who' | 'budget' | null>(null);
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

  const whoSummary =
    children > 0
      ? `${t('adultsCount', { count: adults })} · ${t('childrenCount', { count: children })}`
      : t('adultsCount', { count: adults });
  const budgetSummary = budgets.find((b) => b.value === budget)?.label ?? t('budgetAny');

  // Compact-redesign (2026-10): a search-bar layout. Small trip-type pills on
  // top, then one bordered group of cells - label inside each cell, value under
  // it - and the button. Same fields, same values, same URL on submit; only the
  // arrangement changed. Who and Budget moved into small panels like When.
  const cell = 'min-w-0 px-3.5 py-2.5';
  const cellLabel = 'mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground';

  return (
    <form
      onSubmit={submit}
      aria-label={t('formLabel')}
      className={cn(
        // @container: the layout follows the form's own width, not the window.
        '@container min-w-0 rounded-2xl border bg-surface',
        inline ? 'p-3 shadow-[var(--elev-xs)]' : 'p-3 shadow-[var(--elev-md)] sm:p-4',
        className,
      )}
    >
      <fieldset className="min-w-0">
        <legend className="sr-only">{t('typeLegend')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {TRIP_TYPE_OPTIONS.map((type) => (
            <ToggleChip
              key={type.value}
              name="tripType"
              type="checkbox"
              value={type.value}
              label={t(type.labelKey)}
              checked={tripTypes.includes(type.value)}
              onChange={() => setTripTypes(toggle(tripTypes, type.value))}
              className="h-9 gap-1.5 px-3.5 text-[0.8125rem]"
            />
          ))}
        </div>
      </fieldset>

      <div className="mt-3 grid grid-cols-2 rounded-xl border-control bg-surface @xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <DestinationCombobox
          name="destination"
          label={t('whereLabel')}
          placeholder={t('wherePlaceholder')}
          options={destinations}
          multiple
          value={where}
          onChange={setWhere}
          removeLabel={t('remove')}
          className={cn(cell, 'col-span-2 border-b @xl:col-span-1 @xl:border-b-0 @xl:border-r')}
          labelClassName={cellLabel}
          fieldClassName="min-h-0 gap-1.5 rounded-none !border-0 bg-transparent p-0 !shadow-none [&>svg]:hidden [&>span]:max-w-full [&>span]:py-0.5 [&>span]:text-[0.8125rem] [&>span]:whitespace-nowrap [&_input]:text-[0.9375rem] max-sm:[&_input]:text-base"
        />

        <FieldCell
          open={openPanel === 'when'}
          onOpenChange={(o) => setOpenPanel(o ? 'when' : null)}
          label={t('whenLabel')}
          summary={whenSummary}
          icon={<CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          className={cn(cell, 'border-r')}
          labelClassName={cellLabel}
        >
          <WhenPicker
            locale={locale}
            monthNames={monthNames}
            value={when}
            exactDates={exactDates}
            onMonth={setWhen}
            onDates={(v) => {
              setExactDates(v);
              if (v) setWhen(null);
            }}
            onDone={() => setOpenPanel(null)}
            labels={{
              anyDayIn: (month) => t('anyDayIn', { month }),
              datesHint: t('datesHint'),
              done: t('done'),
              clear: t('clearDates'),
              allMonths: t('allMonths'),
              prev: t('prevMonth'),
              next: t('nextMonth'),
            }}
          />
        </FieldCell>

        <FieldCell
          open={openPanel === 'who'}
          onOpenChange={(o) => setOpenPanel(o ? 'who' : null)}
          label={t('whoLabel')}
          summary={whoSummary}
          icon={<Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          className={cn(cell, '@xl:border-r')}
          labelClassName={cellLabel}
          align="right"
        >
          <div className="divide-y">
            <Stepper
              label={t('adults')}
              value={adults}
              min={1}
              max={16}
              onChange={setAdults}
              decrementLabel={t('fewerAdults')}
              incrementLabel={t('moreAdults')}
              className="py-2"
            />
            <Stepper
              label={t('children')}
              value={children}
              min={0}
              max={10}
              onChange={setChildren}
              decrementLabel={t('fewerChildren')}
              incrementLabel={t('moreChildren')}
              className="py-2"
            />
          </div>
        </FieldCell>

        <FieldCell
          open={openPanel === 'budget'}
          onOpenChange={(o) => setOpenPanel(o ? 'budget' : null)}
          label={t('budgetShort')}
          summary={budgetSummary}
          icon={<Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          className={cn(cell, 'col-span-2 border-t @xl:col-span-1 @xl:border-t-0')}
          labelClassName={cellLabel}
          align="right"
        >
          <fieldset className="min-w-0">
            <legend className="mb-2 text-body-sm font-semibold text-foreground">{t('budgetLegend')}</legend>
            <div className="grid gap-1.5">
              {budgets.map((b) => (
                <ToggleChip
                  key={b.value}
                  name="budget"
                  value={b.value}
                  label={b.label}
                  checked={budget === b.value}
                  onChange={() => {
                    setBudget(budget === b.value ? '' : b.value);
                    setOpenPanel(null);
                  }}
                  className="h-9 w-full justify-center text-[0.8125rem]"
                />
              ))}
            </div>
          </fieldset>
        </FieldCell>
      </div>

      <Button type="submit" size="lg" loading={submitting} className="mt-3 h-12 w-full">
        {t('submit')}
        {!submitting && <ArrowRight aria-hidden />}
      </Button>
    </form>
  );
}

/**
 * One cell of the search bar that opens a small panel (When, Who, Budget).
 *
 * Local to this file on purpose: a button and a positioned panel with
 * Esc-to-close and click-away, nothing a general popover primitive would add.
 */
function FieldCell({
  open,
  onOpenChange,
  label,
  summary,
  icon,
  children,
  className,
  labelClassName,
  align = 'left',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  summary: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  align?: 'left' | 'right';
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  // The panel is drawn on top of the whole page (a portal), because the hero
  // around this form clips anything that sticks out of it - that is what cut
  // the month grid off. On phones it becomes a sheet from the bottom, above
  // the tab bar; on larger screens it sits under its cell.
  const [pos, setPos] = React.useState<{ top: number; left?: number; right?: number } | null>(null);
  const [sheet, setSheet] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setSheet(window.innerWidth < 640);
      setPos(
        align === 'right'
          ? { top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) }
          : { top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 328)) },
      );
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) onOpenChange(false);
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
    <div ref={ref} className={cn('relative', className)}>
      <span id={`${id}-l`} className={labelClassName}>
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-labelledby={`${id}-l ${id}-v`}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center gap-1.5 text-left text-[0.9375rem] text-foreground outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        {icon}
        <span id={`${id}-v`} title={summary} className="min-w-0 flex-1 truncate">
          {summary}
        </span>
      </button>
      {open && pos &&
        createPortal(
          sheet ? (
            <div className="fixed inset-0 z-[var(--z-modal)] flex items-end bg-foreground/30">
              <div
                ref={panelRef}
                role="dialog"
                aria-label={label}
                className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border-t bg-popover p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--elev-xl)]"
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
                <p className="mb-2 text-body-sm font-semibold">{label}</p>
                {children}
              </div>
            </div>
          ) : (
            <div
              ref={panelRef}
              role="dialog"
              aria-label={label}
              style={{ top: pos.top, left: pos.left, right: pos.right, maxHeight: `calc(100dvh - ${pos.top + 12}px)` }}
              className="fixed z-[var(--z-modal)] w-80 overflow-y-auto rounded-xl border bg-popover p-3 shadow-[var(--elev-lg)]"
            >
              {children}
            </div>
          ),
          document.body,
        )}
    </div>
  );
}
