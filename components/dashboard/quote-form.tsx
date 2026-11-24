'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react';

import { sendQuote, type QuoteState } from '@/lib/leads/quotes';
import { MAX_ITINERARY_DAYS, QUOTE_CURRENCIES, type ItineraryDay, type LeadQuote } from '@/lib/leads/quote-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const initial: QuoteState = {};

type DayDraft = Omit<ItineraryDay, 'day'>;
const blankDay = (): DayDraft => ({ from: '', to: '', plan: '', overnight: '', meals: '' });

/**
 * The operator's structured quote for one enquiry. Every operator answers the
 * same fields, which is what lets the traveller compare them side by side.
 */
export function QuoteForm({ leadBusinessId, quote }: { leadBusinessId: string; quote: LeadQuote | null }) {
  const t = useTranslations('quoteForm');
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(sendQuote.bind(null, leadBusinessId), initial);
  // The day-by-day plan, edited here and sent as one JSON field. Starts from
  // the quote already sent, so an update after negotiating keeps the plan.
  const [days, setDays] = useState<DayDraft[]>(() =>
    quote?.itinerary.length
      ? quote.itinerary.map((d) => ({ from: d.from, to: d.to, plan: d.plan, overnight: d.overnight, meals: d.meals }))
      : [],
  );
  const setDay = (i: number, patch: Partial<DayDraft>) =>
    setDays((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <FileText className="size-3.5" aria-hidden />
          {quote ? t('update') : t('send')}
        </Button>
      </div>
    );
  }

  const id = (name: string) => `q-${leadBusinessId}-${name}`;

  return (
    <form action={formAction} className="space-y-3 rounded-xl border bg-background p-4">
      <p className="text-sm font-semibold">{quote ? t('update') : t('send')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor={id('amount')}>{t('amount')}</Label>
          <Input id={id('amount')} name="amount" type="number" min="1" step="1" required inputMode="numeric" defaultValue={quote?.totalAmount ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('currency')}>{t('currency')}</Label>
          <Select id={id('currency')} name="currency" defaultValue={quote?.currency ?? 'USD'}>
            {QUOTE_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('basis')}>{t('basis')}</Label>
          <Select id={id('basis')} name="basis" defaultValue={quote?.priceBasis ?? 'total'}>
            <option value="total">{t('basisTotal')}</option>
            <option value="per_person">{t('basisPerPerson')}</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('days')}>{t('days')}</Label>
          <Input id={id('days')} name="days" type="number" min="1" max="90" defaultValue={quote?.durationDays ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('valid')}>{t('validUntil')}</Label>
          <Input id={id('valid')} name="validUntil" type="date" defaultValue={quote?.validUntil ?? ''} />
        </div>
      </div>
      {/* Arrival and departure: what the traveller's document opens with. */}
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-semibold">{t('arrivalTitle')}</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={id('arrDate')}>{t('arrivalDate')}</Label>
            <Input id={id('arrDate')} name="arrivalDate" type="date" defaultValue={quote?.arrivalDate ?? ''} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={id('arrPoint')}>{t('arrivalPoint')}</Label>
            <Input id={id('arrPoint')} name="arrivalPoint" maxLength={200} placeholder={t('arrivalPointPlaceholder')} defaultValue={quote?.arrivalPoint ?? ''} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor={id('arrDetails')}>{t('arrivalDetails')}</Label>
            <Input id={id('arrDetails')} name="arrivalDetails" maxLength={500} placeholder={t('arrivalDetailsPlaceholder')} defaultValue={quote?.arrivalDetails ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id('depDate')}>{t('departureDate')}</Label>
            <Input id={id('depDate')} name="departureDate" type="date" defaultValue={quote?.departureDate ?? ''} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={id('depPoint')}>{t('departurePoint')}</Label>
            <Input id={id('depPoint')} name="departurePoint" maxLength={200} placeholder={t('arrivalPointPlaceholder')} defaultValue={quote?.departurePoint ?? ''} />
          </div>
        </div>
      </fieldset>

      {/* Day by day: route, what happens, where they sleep, meals. */}
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-semibold">{t('planTitle')}</legend>
        <input type="hidden" name="itinerary" value={JSON.stringify(days)} />
        {days.length === 0 && <p className="text-xs text-muted-foreground">{t('planEmpty')}</p>}
        {days.map((d, i) => (
          <div key={i} className="space-y-2 rounded-lg bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t('dayN', { n: i + 1 })}</p>
              <button
                type="button"
                onClick={() => setDays((all) => all.filter((_, j) => j !== i))}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
                {t('removeDay')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label={t('dayFrom')} placeholder={t('dayFrom')} maxLength={120} value={d.from ?? ''} onChange={(e) => setDay(i, { from: e.target.value })} />
              <Input aria-label={t('dayTo')} placeholder={t('dayTo')} maxLength={120} value={d.to ?? ''} onChange={(e) => setDay(i, { to: e.target.value })} />
            </div>
            <Textarea aria-label={t('dayPlan')} placeholder={t('dayPlan')} rows={2} maxLength={1500} value={d.plan ?? ''} onChange={(e) => setDay(i, { plan: e.target.value })} />
            <div className="grid grid-cols-[1fr_8rem] gap-2">
              <Input aria-label={t('dayOvernight')} placeholder={t('dayOvernight')} maxLength={200} value={d.overnight ?? ''} onChange={(e) => setDay(i, { overnight: e.target.value })} />
              <Input aria-label={t('dayMeals')} placeholder={t('dayMeals')} maxLength={60} value={d.meals ?? ''} onChange={(e) => setDay(i, { meals: e.target.value })} />
            </div>
          </div>
        ))}
        {days.length < MAX_ITINERARY_DAYS && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setDays((all) => [...all, { ...blankDay(), from: all.at(-1)?.to ?? '' }])
            }
          >
            <Plus className="size-3.5" aria-hidden />
            {t('addDay')}
          </Button>
        )}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor={id('includes')}>{t('includes')}</Label>
        <Textarea id={id('includes')} name="includes" rows={3} maxLength={2000} placeholder={t('includesPlaceholder')} defaultValue={quote?.includes ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('excludes')}>{t('excludes')}</Label>
        <Textarea id={id('excludes')} name="excludes" rows={2} maxLength={2000} placeholder={t('excludesPlaceholder')} defaultValue={quote?.excludes ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('notes')}>{t('notes')}</Label>
        <Textarea id={id('notes')} name="notes" rows={2} maxLength={2000} defaultValue={quote?.notes ?? ''} />
      </div>
      {state.error && <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {t('submit')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {state.success ? t('close') : t('cancel')}
        </Button>
        {state.success && !pending && <span className="text-sm text-success">{t('sent')}</span>}
      </div>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
    </form>
  );
}
