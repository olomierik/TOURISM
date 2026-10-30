'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';

import { submitQuoteRequest, type QuoteState } from '@/lib/leads/actions';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChipGroup, ToggleChip } from '@/components/ui/chip';
import { Checkbox, ChoiceRow } from '@/components/ui/checkbox';
import { Stepper } from '@/components/ui/stepper';
import { MonthPicker, monthNamesFor, type MonthValue } from '@/components/ui/month-picker';
import { DestinationCombobox, type ComboboxOption } from '@/components/ui/destination-combobox';
import { PhoneInput, isPlausibleNumber } from '@/components/ui/phone-input';
import { Link } from '@/i18n/navigation';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

/**
 * Request a quote — design.md §7.7, "the most important flow".
 *
 * Three steps, not four, and each one asks a question a person can answer
 * rather than a set of fields a database wants filled:
 *
 *   1. Your trip      — what kind, and where
 *   2. When and who   — a month, not two dates; adults and children
 *   3. Your details   — name, email, one phone number, consent
 *
 * The four changes that matter most, all from §7.7:
 *
 * **State survives a reload.** "State persists in sessionStorage and the URL
 * `step` param; refreshing never loses data." The old form held everything in
 * React state on a page with no step in the URL, so a refresh, a back button or
 * a tab restore emptied five minutes of work and dropped the visitor on step 1
 * with nothing in it. This is the single most expensive failure a five-minute
 * form can have, and it is also the cheapest to fix.
 *
 * **A month, not a date range.** Somebody asking six operators for safari
 * quotes nine months out does not have dates; they have "July, maybe August".
 * A date picker makes them invent two days they will change later, and the
 * operators quote on the season anyway. Exact dates stay one tap away for the
 * people who do have them.
 *
 * **One phone number.** WCAG 3.3.7, Redundant Entry: the WhatsApp field was a
 * second phone box beside the first, so everyone whose WhatsApp is their phone
 * typed the same digits twice or left it blank and lost the reply channel the
 * operators actually use. Now it is one number and a checkbox, checked.
 *
 * **Consent is required and says what it means.** §7.7: "Share my request with
 * up to 6 matched operators. They'll contact me by email or WhatsApp." That is
 * what the form does, written where the person agreeing to it can read it,
 * instead of a grey paragraph under the submit button.
 *
 * Single-operator mode (arriving from a business page) is §7.7's other branch:
 * the request goes to that operator, and widening it to five similar ones is a
 * switch that is off by default. Somebody who clicked "Request a quote" on one
 * listing asked that listing.
 */

const STEPS = 3;
const STORAGE_KEY = 'et:quote-draft';


export type TripType = 'safari' | 'kilimanjaro' | 'zanzibar' | 'safari-beach';
export type Budget = 'under-250' | '250-450' | 'over-450' | 'unsure';

/**
 * Trip type onto the data the `leads` table already holds.
 *
 * There is no trip_type column and this does not add one: every trip type is
 * expressible as a category plus interests, which is what an operator reading
 * the enquiry sees anyway. "Safari + beach" as `wildlife, beach` is a more
 * useful brief than an enum they would have to learn.
 */
const TRIP_TYPE_MAP: Record<TripType, { category: string | null; interests: string[] }> = {
  safari: { category: 'safaris', interests: ['wildlife'] },
  kilimanjaro: { category: 'safaris', interests: ['trekking'] },
  zanzibar: { category: 'hotels', interests: ['beach'] },
  'safari-beach': { category: 'safaris', interests: ['wildlife', 'beach'] },
};

/** Canonical order — also the order the category below is resolved in. */
const TRIP_TYPES = ['safari', 'kilimanjaro', 'zanzibar', 'safari-beach'] as const;

/**
 * Several trip types folded into the one category and interest list the
 * server action already takes.
 *
 * Interests union, because they are additive by nature: safari + Zanzibar is
 * genuinely `wildlife, beach` and an operator reads that as the brief it is.
 * The category cannot union — `leads.category_id` is a single column — so it
 * resolves in the canonical order above rather than by click order, which
 * would make the same three chips produce different routing depending on
 * which was tapped first.
 */
function mapTripTypes(types: TripType[]): { category: string | null; interests: string[] } {
  const chosen = TRIP_TYPES.filter((t) => types.includes(t));
  const category = chosen.map((t) => TRIP_TYPE_MAP[t].category).find(Boolean) ?? null;
  return {
    category,
    interests: [...new Set(chosen.flatMap((t) => TRIP_TYPE_MAP[t].interests))],
  };
}

/** Toggle, but never down to nothing. */
function toggleTripType(current: TripType[], value: TripType): TripType[] {
  if (!current.includes(value)) return [...current, value];
  return current.length > 1 ? current.filter((t) => t !== value) : current;
}

const INTEREST_KEYS = [
  'wildlife', 'photography', 'beach', 'trekking', 'culture',
  'luxury', 'budget', 'family', 'honeymoon', 'birding',
] as const;

const BUDGET_RANGE: Record<Budget, { min: number | null; max: number | null }> = {
  'under-250': { min: null, max: 250 },
  '250-450': { min: 250, max: 450 },
  'over-450': { min: 450, max: null },
  unsure: { min: null, max: null },
};

type Draft = {
  tripTypes: TripType[];
  destinations: string[];
  notSure: boolean;
  interests: string[];
  month: MonthValue;
  exactStart: string;
  exactEnd: string;
  flexible: boolean;
  adults: number;
  children: number;
  childAges: number[];
  budget: Budget | '';
  currency: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappSame: boolean;
  whatsapp: string;
  message: string;
  consent: boolean;
  alsoSimilar: boolean;
};

function emptyDraft(): Draft {
  return {
    tripTypes: ['safari'],
    destinations: [],
    notSure: false,
    interests: [],
    month: null,
    exactStart: '',
    exactEnd: '',
    flexible: false,
    adults: 2,
    children: 0,
    childAges: [],
    budget: '',
    currency: 'USD',
    fullName: '',
    email: '',
    phone: '',
    whatsappSame: true,
    whatsapp: '',
    message: '',
    consent: false,
    alsoSimilar: false,
  };
}

export function QuoteWizard({
  destinations,
  defaults,
  operators,
  backHref,
}: {
  destinations: ComboboxOption[];
  defaults: Partial<Draft>;
  /**
   * §7.7 chosen-operator mode. One operator when arriving from a business
   * page; several when arriving from the Saved list, where §7.14's "Ask all
   * {n} for a quote" is the whole point of saving things in the first place.
   */
  operators?: Array<{ slug: string; name: string }>;
  /**
   * Where Close goes — a typed route, not a referrer string. §7.7 calls it
   * "a Close link to the referring page"; a raw Referer header is attacker
   * controlled and would make this an open redirect on the one form that
   * collects a name, an email and a phone number.
   */
  backHref?: React.ComponentProps<typeof Link>['href'];
}) {
  const t = useTranslations('quoteWizard');
  const tErr = useTranslations('quote.errors');
  const tInterests = useTranslations('interests');
  const locale = useLocale();
  const router = useRouter();

  // One list whether it came from a business page or the Saved list, so every
  // branch below reads the same shape and single-operator mode is just the
  // case where it holds one.
  const chosen = operators ?? [];
  const params = useSearchParams();

  const urlStep = Math.min(STEPS, Math.max(1, Number(params.get('step') ?? '1') || 1));
  const [step, setStep] = React.useState(urlStep);
  const [draft, setDraft] = React.useState<Draft>(() => ({ ...emptyDraft(), ...defaults }));
  const [showErrors, setShowErrors] = React.useState(false);
  /**
   * Bumped on every rejected submit, so the focus effect below fires again.
   *
   * A boolean would not: it goes true on the first failure and stays true, so
   * the second and third attempts move no focus at all — and those are exactly
   * the attempts where somebody has fixed one field and needs to be told what
   * is still wrong.
   */
  const [errorNonce, setErrorNonce] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showInterests, setShowInterests] = React.useState(
    (defaults.interests?.length ?? 0) > 0,
  );

  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const monthNames = React.useMemo(() => monthNamesFor(locale), [locale]);

  // ---- persistence -------------------------------------------------------
  // §7.7: "State persists in sessionStorage and the URL `step` param;
  // refreshing never loses data."
  //
  // The read is a store with a null server snapshot, and the merge happens
  // during render rather than in an effect. Both choices are about the same
  // frame: reading storage in a `useState` initialiser would render different
  // markup on the client than the server sent, and restoring in an effect
  // would paint an empty form first and fill it a frame later — which, on a
  // form somebody just reloaded, looks exactly like the data loss this is
  // meant to prevent.
  //
  // Which of the two wins is decided by whether the link changed, not by a
  // fixed precedence, because both orders are wrong half the time:
  //
  //   draft always wins  — somebody who clicks "Request a quote" on a Serengeti
  //                        page gets yesterday's half-filled Zanzibar form
  //   URL always wins    — a reload on step 2 resets everything the person
  //                        edited back to whatever the link said, which is the
  //                        exact data loss §7.7 is about
  //
  // So the draft records the prefill it was seeded from. Same seed means this
  // is the same visit to the same link — a reload, a back button, a restored
  // tab — and the draft is the more recent truth. A different seed means a new
  // intent, and the link wins.
  const seed = JSON.stringify(defaults);
  const [restored, setRestored] = React.useState(false);

  // Read on mount, in an effect, deliberately.
  //
  // Two tidier-looking approaches both fail here and it is worth saying why,
  // because the next person will try them. Reading storage in a `useState`
  // initialiser makes the client's first render disagree with the server HTML,
  // which is a hydration mismatch on a form full of controlled inputs. And
  // `useSyncExternalStore` returns the *server* snapshot during the hydration
  // render — null — and then never re-reads, because storage has nothing to
  // subscribe to and nothing ever notifies; the draft silently stayed empty
  // and the persist effect below overwrote it with the empty one. That was the
  // measured behaviour: edit adults to 3, reload, get 2 back.
  //
  // So: server and first client render agree (empty), the effect restores, and
  // `restored` gates the write below so the two cannot race.
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { __seed, ...parsed } = JSON.parse(raw) as Partial<Draft> & { __seed?: string };
        // Same seed: a reload of the same link, so the draft is the more
        // recent truth and nothing from the URL may overwrite an edit.
        // Different seed: a new intent, so the link wins.
        /* Reading storage on mount is what an effect is for; the note above
           says why the two tidier alternatives are wrong here. */
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft((d) => (__seed === seed ? { ...d, ...parsed } : { ...d, ...parsed, ...defaults }));
      }
    } catch {
      // Private mode, or a draft written by an older shape of this form.
    }
    setRestored(true);
    // Mount only: a later change to `defaults` means a navigation, which
    // remounts this anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // Gated on `restored`: without it this fires on mount, writes the empty
    // draft over the stored one, and the restore above then reads what it just
    // destroyed.
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, __seed: seed }));
    } catch {
      // Storage full or blocked; the form still works, it just forgets.
    }
  }, [draft, seed, restored]);

  const set = React.useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value })),
    [],
  );

  // ---- step movement -----------------------------------------------------
  const goto = React.useCallback(
    (next: number) => {
      setStep(next);
      setShowErrors(false);
      const q = new URLSearchParams(params.toString());
      q.set('step', String(next));
      router.replace(`?${q.toString()}`, { scroll: false });
    },
    [params, router],
  );

  // §7.7: "Move focus to the step heading on step change, and announce
  // 'Step 2 of 3, When and who'." Focus moves to the heading, which carries the
  // step number in its accessible name — so the announcement and the focus
  // target are the same element rather than a live region racing a focus move.
  React.useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // ---- validation --------------------------------------------------------
  const errors = React.useMemo(() => {
    const e: Partial<Record<keyof Draft, string>> = {};
    if (step === 1 && draft.destinations.length === 0 && !draft.notSure) {
      e.destinations = t('errWhere');
    }
    if (step === 3) {
      if (!draft.fullName.trim()) e.fullName = t('errName');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) e.email = t('errEmail');
      if (draft.phone && !isPlausibleNumber(draft.phone)) e.phone = t('errPhone');
      if (!draft.consent) e.consent = t('errConsent');
    }
    return e;
  }, [step, draft, t]);

  const hasErrors = Object.keys(errors).length > 0;

  // §6.3: "On submit with errors, show an ErrorSummary at the top of the step
  // (role=alert, links to each field) and move focus to it." The move has to
  // happen after the summary exists — calling focus() in the same tick as the
  // setState that renders it focuses nothing, which is what it did.
  React.useEffect(() => {
    if (errorNonce > 0) summaryRef.current?.focus();
  }, [errorNonce]);

  function reject() {
    setShowErrors(true);
    setErrorNonce((n) => n + 1);
  }

  function next() {
    if (hasErrors) {
      reject();
      return;
    }
    goto(Math.min(STEPS, step + 1));
  }

  // ---- submit ------------------------------------------------------------
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (hasErrors) {
      reject();
      return;
    }
    setPending(true);
    setServerError(null);

    const mapped = mapTripTypes(draft.tripTypes);
    const budget = BUDGET_RANGE[(draft.budget || 'unsure') as Budget];
    const fd = new FormData(e.currentTarget);

    // The server action's contract, unchanged. Everything this wizard adds is
    // expressed through fields that already exist, so the dashboards, the
    // emails and the matching RPC keep working untouched.
    fd.set('fullName', draft.fullName);
    fd.set('email', draft.email);
    fd.set('phone', draft.phone);
    fd.set('whatsapp', draft.whatsappSame ? draft.phone : draft.whatsapp);
    fd.set('message', draft.message);
    if (mapped.category) fd.set('category', mapped.category);
    // One destination fits the column; the rest are named in the free-text
    // field beside it, which is what an operator reads anyway.
    if (draft.destinations[0]) fd.set('destination', draft.destinations[0]);
    if (draft.destinations.length > 1) {
      fd.set(
        'destinationOther',
        draft.destinations
          .slice(1)
          .map((slug) => destinations.find((d) => d.value === slug)?.label ?? slug)
          .join(', '),
      );
    }
    if (draft.month) {
      // A month becomes its first and last day, so the existing date columns
      // keep meaning what they say.
      const start = new Date(Date.UTC(draft.month.year, draft.month.month - 1, 1));
      const end = new Date(Date.UTC(draft.month.year, draft.month.month, 0));
      fd.set('travelStart', start.toISOString().slice(0, 10));
      fd.set('travelEnd', end.toISOString().slice(0, 10));
    } else {
      if (draft.exactStart) fd.set('travelStart', draft.exactStart);
      if (draft.exactEnd) fd.set('travelEnd', draft.exactEnd);
    }
    if (draft.flexible || draft.month) fd.set('datesFlexible', 'on');
    fd.set('adults', String(draft.adults));
    fd.set('children', String(draft.children));
    if (budget.min !== null) fd.set('budgetMin', String(budget.min * 7));
    if (budget.max !== null) fd.set('budgetMax', String(budget.max * 7));
    fd.set('budgetCurrency', draft.currency);
    for (const i of [...new Set([...mapped.interests, ...draft.interests])]) {
      fd.append('interests', i);
    }
    if (chosen.length) {
      fd.set('chosen', chosen.map((o) => o.slug).join(','));
      // The answer to "also ask similar operators" decides who receives a
      // name, an email and a phone number, so it has to actually travel.
      if (draft.alsoSimilar) fd.set('alsoSimilar', 'on');
      // Kept as it was for a single operator, so `leads.source_url` goes on
      // recording the page a request started from.
      if (chosen.length === 1) fd.set('sourceUrl', chosen[0].slug);
    }

    const result: QuoteState = await submitQuoteRequest({}, fd);

    if (result.reference) {
      track('quote_submitted', { matched: result.matched ?? 0 });
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to clear; the confirmation still shows.
      }
      // §7.7: its own page. The reference travels in the URL so the
      // confirmation can name it without a second round trip.
      const q = new URLSearchParams({ ref: result.reference });
      if (result.matched) q.set('matched', String(result.matched));
      router.push(`/${locale}/request-quote/sent?${q.toString()}`);
      return;
    }

    setPending(false);
    setServerError(result.error ?? 'generic');
  }

  const stepTitle = [t('step1'), t('step2'), t('step3')][step - 1];

  return (
    <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[40rem]">
      {/* §7.7 top bar: Back, a progress indicator, and a Close link to where
          the visitor came from. */}
      <div className="mb-6 flex items-center gap-3">
        <IconButton
          type="button"
          variant="ghost"
          label={t('back')}
          disabled={step === 1}
          onClick={() => goto(step - 1)}
        >
          <ArrowLeft aria-hidden />
        </IconButton>

        <div className="min-w-0 flex-1">
          <div
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={STEPS}
            aria-label={t('stepOf', { step, total: STEPS })}
            className="flex gap-1"
          >
            {Array.from({ length: STEPS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-pill transition-colors duration-[var(--dur-base)]',
                  i < step ? 'bg-primary' : 'bg-surface-sunken',
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-body-sm text-muted-foreground">
            {t('stepOf', { step, total: STEPS })}
          </p>
        </div>

        <IconButton asChild variant="ghost" label={t('close')}>
          <Link href={backHref ?? '/'}>
            <X aria-hidden />
          </Link>
        </IconButton>
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-heading-xl outline-none"
        // The announcement §7.7 asks for, carried by the element that takes
        // focus rather than by a live region that would race it.
        aria-label={`${t('stepOf', { step, total: STEPS })}, ${stepTitle}`}
      >
        {stepTitle}
      </h1>

      {/* §6.3 ErrorSummary: role=alert, links to each field, takes focus. */}
      {showErrors && hasErrors && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-[var(--danger-50)] p-4 outline-none"
        >
          <p className="flex items-center gap-2 text-body font-semibold text-[var(--danger-600)]">
            <AlertTriangle className="size-4" aria-hidden />
            {t('errSummary')}
          </p>
          <ul className="mt-2 space-y-1">
            {Object.entries(errors).map(([field, msg]) => (
              <li key={field}>
                <a
                  href={`#q-${field}`}
                  className="text-body-sm text-[var(--danger-600)] underline underline-offset-4"
                >
                  {msg}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {serverError && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{tErr(serverError as 'generic')}</AlertDescription>
        </Alert>
      )}

      {/* ---------------------------------------------------------------- 1 */}
      {step === 1 && (
        <div className="mt-6 space-y-6">
          {chosen.length > 0 && (
            <div className="rounded-lg border bg-surface-muted p-4">
              {/* Named, not counted. "Your request goes to 4 operators" is the
                  kind of sentence that makes somebody wonder which four, and
                  this is the last screen before they are contacted on the
                  traveller's behalf. */}
              <p className="text-body font-semibold">
                {chosen.length === 1
                  ? t('singleOperator', { name: chosen[0].name })
                  : t('chosenOperators', {
                      count: chosen.length,
                      names: new Intl.ListFormat(locale, {
                        style: 'long',
                        type: 'conjunction',
                      }).format(chosen.map((o) => o.name)),
                    })}
              </p>
              <ChoiceRow
                id="q-alsoSimilar"
                label={t('alsoSimilar')}
                hint={t('alsoSimilarHint')}
                className="mt-1"
              >
                <Checkbox
                  id="q-alsoSimilar"
                  checked={draft.alsoSimilar}
                  onChange={(e) => set('alsoSimilar', e.target.checked)}
                />
              </ChoiceRow>
            </div>
          )}

          {/* Several, not one. A trip that is a safari and a beach week is
              the common Tanzanian itinerary, not an edge case, and making it
              a single choice forced the visitor to under-describe it. The
              last selection cannot be cleared, because an enquiry with no
              trip type at all tells an operator nothing. */}
          <ChipGroup legend={t('tripType')} hint={t('tripTypeHint')} scroll>
            {TRIP_TYPES.map((v) => (
              <ToggleChip
                key={v}
                name="tripTypeChip"
                type="checkbox"
                value={v}
                label={t(`type_${v}` as 'type_safari')}
                checked={draft.tripTypes.includes(v)}
                onChange={() => set('tripTypes', toggleTripType(draft.tripTypes, v))}
              />
            ))}
          </ChipGroup>

          <div id="q-destinations">
            <DestinationCombobox
              name="destinationChips"
              label={t('where')}
              placeholder={t('wherePlaceholder')}
              options={destinations}
              multiple
              value={draft.destinations}
              onChange={(v) => set('destinations', v)}
              removeLabel={t('remove')}
            />
            <ChoiceRow id="q-notSure" label={t('notSure')}>
              <Checkbox
                id="q-notSure"
                checked={draft.notSure}
                onChange={(e) => set('notSure', e.target.checked)}
              />
            </ChoiceRow>
          </div>

          {/* §7.7: interests are optional and collapsed. Ten chips open by
              default made the first step look like a questionnaire. */}
          {showInterests ? (
            <ChipGroup legend={t('interests')} hint={t('interestsHint')}>
              {INTEREST_KEYS.map((key) => (
                <ToggleChip
                  key={key}
                  type="checkbox"
                  name="interestChips"
                  value={key}
                  label={tInterests(key)}
                  checked={draft.interests.includes(key)}
                  onChange={(e) =>
                    set(
                      'interests',
                      e.target.checked
                        ? [...draft.interests, key].slice(0, 10)
                        : draft.interests.filter((i) => i !== key),
                    )
                  }
                />
              ))}
            </ChipGroup>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowInterests(true)}>
              <Plus className="size-4" aria-hidden />
              {t('addInterests')}
            </Button>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- 2 */}
      {step === 2 && (
        <div className="mt-6 space-y-6">
          <MonthPicker
            label={t('when')}
            monthNames={monthNames}
            value={draft.month}
            onChange={(v) => set('month', v)}
            exactDates={
              draft.exactStart || draft.exactEnd
                ? { start: draft.exactStart, end: draft.exactEnd }
                : null
            }
            onExactDatesChange={(v) => {
              set('exactStart', v?.start ?? '');
              set('exactEnd', v?.end ?? '');
            }}
            exactLabel={t('exactDates')}
            monthLabel={t('pickMonth')}
            flexibleLabel={t('flexible')}
            flexible={draft.flexible}
            onFlexibleChange={(v) => set('flexible', v)}
          />

          <div className="space-y-1 rounded-lg border p-4">
            <Stepper
              label={t('adults')}
              value={draft.adults}
              min={1}
              max={24}
              onChange={(v) => set('adults', v)}
              decrementLabel={t('fewerAdults')}
              incrementLabel={t('moreAdults')}
            />
            <Stepper
              label={t('children')}
              hint={t('childrenHint')}
              value={draft.children}
              min={0}
              max={12}
              onChange={(v) => {
                set('children', v);
                set('childAges', draft.childAges.slice(0, v));
              }}
              decrementLabel={t('fewerChildren')}
              incrementLabel={t('moreChildren')}
            />

            {/* §6.3: "When children > 0, reveal 'Ages of children' selects."
                Ages change the price on a safari more than almost anything
                else — park fees step at 5 and at 16 — so an operator quoting
                without them is guessing. */}
            {draft.children > 0 && (
              <fieldset className="mt-3 border-t pt-3">
                <legend className="mb-2 text-label font-semibold">{t('childAges')}</legend>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: draft.children }, (_, i) => (
                    <Select
                      key={i}
                      aria-label={t('childAge', { n: i + 1 })}
                      value={String(draft.childAges[i] ?? '')}
                      onChange={(e) => {
                        const ages = [...draft.childAges];
                        ages[i] = Number(e.target.value);
                        set('childAges', ages);
                      }}
                      className="w-24"
                    >
                      <option value="">{t('age')}</option>
                      {Array.from({ length: 18 }, (_, a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </Select>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          <div>
            <ChipGroup legend={t('budget')} hint={t('budgetHint')} scroll>
              {(['under-250', '250-450', 'over-450', 'unsure'] as Budget[]).map((v) => (
                <ToggleChip
                  key={v}
                  name="budgetChip"
                  value={v}
                  label={t(`budget_${v}` as 'budget_unsure')}
                  checked={draft.budget === v}
                  onChange={() => set('budget', v)}
                />
              ))}
            </ChipGroup>
            <div className="mt-3 max-w-40">
              <label htmlFor="q-currency" className="mb-1.5 block text-label font-semibold">
                {t('currency')}
              </label>
              <Select
                id="q-currency"
                value={draft.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {['USD', 'EUR', 'GBP', 'TZS'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- 3 */}
      {step === 3 && (
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="q-fullName" className="mb-1.5 block text-label font-semibold">
              {t('fullName')}
            </label>
            <Input
              id="q-fullName"
              autoComplete="name"
              value={draft.fullName}
              aria-invalid={showErrors && errors.fullName ? true : undefined}
              onChange={(e) => set('fullName', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="q-email" className="mb-1.5 block text-label font-semibold">
              {t('email')}
            </label>
            <Input
              id="q-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={draft.email}
              aria-invalid={showErrors && errors.email ? true : undefined}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          <div id="q-phone">
            <PhoneInput
              id="q-phone-input"
              name="phoneCombined"
              label={t('phone')}
              locale={locale}
              countryLabel={t('dialCode')}
              value={draft.phone}
              onChange={(v) => set('phone', v)}
              invalid={Boolean(showErrors && errors.phone)}
            />
            {/* WCAG 3.3.7. Checked by default, because one number that also
                runs WhatsApp is the common case in this market. */}
            <ChoiceRow id="q-whatsappSame" label={t('whatsappSame')}>
              <Checkbox
                id="q-whatsappSame"
                checked={draft.whatsappSame}
                onChange={(e) => set('whatsappSame', e.target.checked)}
              />
            </ChoiceRow>
            {!draft.whatsappSame && (
              <PhoneInput
                id="q-whatsapp-input"
                name="whatsappCombined"
                label={t('whatsapp')}
                locale={locale}
                countryLabel={t('dialCode')}
                value={draft.whatsapp}
                onChange={(v) => set('whatsapp', v)}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <label htmlFor="q-message" className="mb-1.5 block text-label font-semibold">
              {t('message')}
              <span className="ml-1 font-normal text-muted-foreground">{t('optional')}</span>
            </label>
            {/* §7.7's three prompt chips. They insert text rather than setting
                a flag, so the visitor can edit what was written on their
                behalf — which is the difference between a shortcut and the
                form putting words in their mouth. */}
            <div className="mb-2 flex flex-wrap gap-2">
              {(['first', 'honeymoon', 'kids'] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set(
                      'message',
                      draft.message
                        ? `${draft.message.trimEnd()} ${t(`prompt_${k}` as 'prompt_first')}`
                        : t(`prompt_${k}` as 'prompt_first'),
                    )
                  }
                >
                  {t(`promptLabel_${k}` as 'promptLabel_first')}
                </Button>
              ))}
            </div>
            <Textarea
              id="q-message"
              rows={4}
              value={draft.message}
              placeholder={t('messagePlaceholder')}
              onChange={(e) => set('message', e.target.value)}
            />
          </div>

          <div id="q-consent" className="rounded-lg border bg-surface-muted p-4">
            <ChoiceRow
              id="q-consent-box"
              label={t.rich('consent', {
                link: (chunks) => (
                  <Link href="/privacy" className="font-semibold text-primary underline underline-offset-4">
                    {chunks}
                  </Link>
                ),
              })}
            >
              <Checkbox
                id="q-consent-box"
                checked={draft.consent}
                aria-invalid={showErrors && errors.consent ? true : undefined}
                onChange={(e) => set('consent', e.target.checked)}
              />
            </ChoiceRow>
          </div>

          {/* The honeypot, §6.3: no label text, off-screen rather than hidden. */}
          <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <input name="et_hp_ref" type="text" tabIndex={-1} autoComplete="off" />
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        {step > 1 && (
          <Button type="button" variant="ghost" onClick={() => goto(step - 1)}>
            <ArrowLeft aria-hidden />
            {t('back')}
          </Button>
        )}
        {step < STEPS ? (
          <Button type="button" size="lg" className="ml-auto" onClick={next}>
            {t('next')}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button type="submit" size="lg" loading={pending} className="ml-auto">
            {t('submit')}
          </Button>
        )}
      </div>
    </form>
  );
}
