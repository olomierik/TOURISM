'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Optional currency conversion beside a price (SEO brief T16).
 *
 * The price itself is always the operator's, in their currency. A traveller
 * can choose to also see roughly what it is in euros, pounds or shillings;
 * the choice is remembered in this browser and the figure is marked "≈"
 * because it is a daily rate, not a quote.
 */

export const DISPLAY_CURRENCIES = ['USD', 'EUR', 'GBP', 'TZS'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

const KEY = 'et:currency';
const EVENT = 'et:currency-change';

type Rates = { rates: Record<string, number> } | null;
let ratesCache: Rates | undefined;
let ratesPromise: Promise<Rates> | null = null;

function loadRates(): Promise<Rates> {
  if (ratesCache !== undefined) return Promise.resolve(ratesCache);
  ratesPromise ??= fetch('/api/fx')
    .then((r) => (r.ok ? (r.json() as Promise<Rates>) : null))
    .catch(() => null)
    .then((r) => (ratesCache = r));
  return ratesPromise;
}

function readChoice(): DisplayCurrency {
  try {
    const v = window.localStorage.getItem(KEY);
    return (DISPLAY_CURRENCIES as readonly string[]).includes(v ?? '') ? (v as DisplayCurrency) : 'USD';
  } catch {
    return 'USD';
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function useDisplayCurrency(): DisplayCurrency {
  return useSyncExternalStore(subscribe, readChoice, () => 'USD');
}

function setChoice(c: DisplayCurrency) {
  try {
    window.localStorage.setItem(KEY, c);
  } catch {
    // Not remembered; still applies to this page via the event.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribeRates = (cb: () => void) => {
  void loadRates().then(cb);
  return () => {};
};

export function ConvertedPrice({ amount, currency, locale }: { amount: number; currency: string; locale: string }) {
  const choice = useDisplayCurrency();
  const rates = useSyncExternalStore(
    subscribeRates,
    () => ratesCache ?? null,
    () => null,
  );
  useEffect(() => {
    if (choice !== 'USD') void loadRates();
  }, [choice]);

  if (choice === currency || !rates?.rates) return null;
  const from = rates.rates[currency];
  const to = rates.rates[choice];
  if (!from || !to) return null;
  const value = (amount / from) * to;
  const text = new Intl.NumberFormat(locale, { style: 'currency', currency: choice, maximumFractionDigits: 0 }).format(value);
  return <span className="ms-1 text-muted-foreground tabular-nums">(≈ {text})</span>;
}

export function CurrencyPicker({ label }: { label: string }) {
  const choice = useDisplayCurrency();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      {label}
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value as DisplayCurrency)}
        className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
      >
        {DISPLAY_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
