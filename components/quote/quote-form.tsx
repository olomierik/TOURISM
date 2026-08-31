'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, ArrowRight, Send } from 'lucide-react';

import { submitQuoteRequest, type QuoteState } from '@/lib/leads/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { CategorySummary, DestinationSummary } from '@/lib/queries/taxonomy';
import { track } from '@/lib/analytics/track';

const initial: QuoteState = {};
const TOTAL_STEPS = 4;

const INTEREST_KEYS = [
  'wildlife',
  'photography',
  'beach',
  'trekking',
  'culture',
  'luxury',
  'budget',
  'family',
  'honeymoon',
  'birding',
] as const;

export function QuoteForm({
  destinations,
  categories,
  defaults,
  onSuccess,
}: {
  destinations: DestinationSummary[];
  categories: CategorySummary[];
  defaults: {
    destination?: string;
    category?: string;
    sourceUrl?: string;
    /**
     * Seeded by the homepage trip planner. The hero asks the three questions
     * everyone can answer standing up — where, when, how many — and hands them
     * here rather than asking again. A form that re-asks what someone just typed
     * is where people leave.
     */
    travelStart?: string;
    travelEnd?: string;
    adults?: string;
    children?: string;
    interests?: string[];
    /**
     * Seeded by the cost estimator, which knows the whole itinerary the form
     * cannot hold: the destination select takes one park, and a real trip is
     * three. Written into the message rather than parsed into fields, because
     * an operator reading "Serengeti 4, Ngorongoro 2, Zanzibar 4" gets a
     * qualified brief, and the visitor can edit prose in a way they cannot
     * edit a hidden field.
     */
    message?: string;
  };
  onSuccess: (state: QuoteState) => void;
}) {
  const t = useTranslations('quote');
  const tErr = useTranslations('quote.errors');
  const tInterests = useTranslations('interests');
  const [step, setStep] = useState(1);

  const [state, formAction, pending] = useActionState(
    async (prev: QuoteState, formData: FormData) => {
      const result = await submitQuoteRequest(prev, formData);
      if (result.reference) {
        // On the server's confirmation, not the button press: a submission that
        // failed validation is not a lead, and counting it would make the funnel
        // look healthier than it is.
        track('quote_submitted', { matched: result.matched ?? 0 });
        onSuccess(result);
      }
      return result;
    },
    initial,
  );

  const selectClass =
    'h-11 w-full rounded-lg border bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';

  // Steps are hidden rather than unmounted. Unmounting would drop the inputs
  // from FormData — the whole form submits once — and would also lose whatever
  // the visitor typed if they stepped back to check something.
  const stepClass = (n: number) => cn('space-y-5', step !== n && 'hidden');

  return (
    <form action={formAction} noValidate>
      {/* Honeypot: hidden from people, tempting to naive bots. Not display:none,
          which some bots skip; off-screen with aria-hidden works better.

          The label used to read "Company" and the field was named `company`,
          which is precisely what Chrome autofills as an organisation. Real
          enquiries tripped the trap and were discarded behind a success
          message. No label now, and a name nothing recognises. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <input id="et_hp_ref" name="et_hp_ref" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <input type="hidden" name="sourceUrl" value={defaults.sourceUrl ?? ''} />

      <div className="mb-8">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {t(`step${step}` as 'step1')}
          </span>
          <span className="text-muted-foreground">
            {t('stepOf', { step, total: TOTAL_STEPS })}
          </span>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{tErr(state.error)}</AlertDescription>
        </Alert>
      )}

      {/* Step 1 — where and what */}
      <div className={stepClass(1)}>
        <div className="space-y-2">
          <Label htmlFor="destination">{t('destination')}</Label>
          <select
            id="destination"
            name="destination"
            defaultValue={defaults.destination ?? ''}
            className={selectClass}
          >
            <option value="">{t('destinationAny')}</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">{t('category')}</Label>
          <select
            id="category"
            name="category"
            defaultValue={defaults.category ?? ''}
            className={selectClass}
          >
            <option value="">{t('categoryAny')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t('interests')}</legend>
          <div className="flex flex-wrap gap-2">
            {INTEREST_KEYS.map((key) => (
              <label
                key={key}
                className="cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={key}
                  defaultChecked={defaults.interests?.includes(key)}
                  className="sr-only"
                />
                {tInterests(key)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Step 2 — when and who */}
      <div className={stepClass(2)}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="travelStart">{t('travelStart')}</Label>
            <Input
              id="travelStart"
              name="travelStart"
              type="date"
              defaultValue={defaults.travelStart ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travelEnd">{t('travelEnd')}</Label>
            <Input
              id="travelEnd"
              name="travelEnd"
              type="date"
              defaultValue={defaults.travelEnd ?? ''}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <input
            id="datesFlexible"
            name="datesFlexible"
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <Label htmlFor="datesFlexible" className="font-normal">
            {t('datesFlexible')}
          </Label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adults">{t('adults')}</Label>
            <Input
              id="adults"
              name="adults"
              type="number"
              min={1}
              max={40}
              defaultValue={defaults.adults ?? 2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="children">{t('children')}</Label>
            <Input
              id="children"
              name="children"
              type="number"
              min={0}
              max={40}
              defaultValue={defaults.children ?? 0}
            />
          </div>
        </div>
      </div>

      {/* Step 3 — budget */}
      <div className={stepClass(3)}>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('budgetHint')}</p>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="budgetMin">{t('budgetMin')}</Label>
            <Input id="budgetMin" name="budgetMin" type="number" min={0} step={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetMax">{t('budgetMax')}</Label>
            <Input id="budgetMax" name="budgetMax" type="number" min={0} step={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetCurrency">{t('budgetCurrency')}</Label>
            <select
              id="budgetCurrency"
              name="budgetCurrency"
              defaultValue="USD"
              className={selectClass}
            >
              {['USD', 'EUR', 'GBP', 'TZS'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{t('budgetSkip')}</p>
      </div>

      {/* Step 4 — contact */}
      <div className={stepClass(4)}>
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('fullName')}</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t('whatsapp')}</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              aria-describedby="whatsapp-hint"
            />
            <p id="whatsapp-hint" className="text-xs text-muted-foreground">
              {t('whatsappHint')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">{t('message')}</Label>
          <Textarea
            id="message"
            name="message"
            rows={5}
            required
            defaultValue={defaults.message ?? ''}
            placeholder={t('messagePlaceholder')}
            aria-describedby="message-hint"
          />
          <p id="message-hint" className="text-xs text-muted-foreground">
            {t('messageHint')}
          </p>
        </div>

        <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
          {t('privacyNote')}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3">
        {step > 1 && (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="size-4" aria-hidden />
            {t('back')}
          </Button>
        )}

        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            size="lg"
            className="ml-auto"
            onClick={() => setStep((s) => s + 1)}
          >
            {t('next')}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button type="submit" size="lg" className="ml-auto" disabled={pending}>
            {pending ? (
              t('submitting')
            ) : (
              <>
                <Send className="size-4" aria-hidden />
                {t('submit')}
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
