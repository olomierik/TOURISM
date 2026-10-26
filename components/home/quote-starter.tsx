'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarDays, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ChipGroup, ToggleChip } from '@/components/ui/chip';
import { DestinationCombobox, type ComboboxOption } from '@/components/ui/destination-combobox';
import { MonthPicker, monthNamesFor, type MonthValue } from '@/components/ui/month-picker';
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

  const [tripType, setTripType] = React.useState<TripType>('safari');
  const [where, setWhere] = React.useState<string[]>([]);
  const [when, setWhen] = React.useState<MonthValue>(null);
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
    const params = new URLSearchParams({ step: '2', tripType });
    for (const d of where) params.append('destination', d);
    if (when) {
      params.set('month', String(when.month));
      params.set('year', String(when.year));
    }
    params.set('adults', String(adults));
    if (children > 0) params.set('children', String(children));
    if (budget) params.set('budget', budget);
    router.push(`/${locale}/request-quote?${params.toString()}`);
  }

  const tripTypes: { value: TripType; label: string }[] = [
    { value: 'safari', label: t('typeSafari') },
    { value: 'kilimanjaro', label: t('typeKilimanjaro') },
    { value: 'zanzibar', label: t('typeZanzibar') },
    { value: 'safari-beach', label: t('typeSafariBeach') },
  ];

  const budgets: { value: Budget; label: string }[] = [
    { value: 'under-250', label: t('budgetUnder') },
    { value: '250-450', label: t('budgetMid') },
    { value: 'over-450', label: t('budgetOver') },
  ];

  const whenSummary = when ? `${monthNames[when.month - 1]} ${when.year}` : t('whenAny');

  return (
    <form
      onSubmit={submit}
      aria-label={t('formLabel')}
      className={cn(
        // §3.4: the hero quote form is the one place that takes radius-xl and
        // --elev-lg, so it reads as the page's instrument rather than a panel.
        'min-w-0 rounded-xl bg-surface',
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
      <ChipGroup legend={t('typeLegend')} className="mb-4">
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          {tripTypes.map((type) => (
            <ToggleChip
              key={type.value}
              name="tripType"
              value={type.value}
              label={type.label}
              checked={tripType === type.value}
              onChange={() => setTripType(type.value)}
              className="w-full justify-center px-2 text-center"
            />
          ))}
        </div>
      </ChipGroup>

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
          form, and a month is one tap once the panel is open. Who does not:
          adults and children are two numbers somebody wants to see without
          opening anything, and they decide the quote more than the month
          does. Park fees step at 5 and 16, so an operator quoting a family
          without knowing there are children is guessing. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              setOpenPanel(null);
            }}
          />
        </Popover>

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
      </div>

      {/* Budget, visible on a phone too. It was hidden below 640, which meant
          the single field operators most need to price a trip was desktop
          only. Two columns at 375px rather than a scrolling row, for the same
          reason the trip types changed. */}
      <ChipGroup legend={t('budgetLegend')} className="mt-4">
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
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
