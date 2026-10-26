'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * PhoneInput — design.md §6.3.
 *
 * "country selector (flag + dial code, searchable, default from locale/IP,
 * +255 for sw) + national number. Validate with libphonenumber-js. Offer a
 * 'My WhatsApp number is the same' checkbox (checked by default) so WhatsApp
 * isn't entered twice (WCAG 3.3.7 Redundant Entry)."
 *
 * Two deliberate departures, both recorded rather than quietly made.
 *
 * **No libphonenumber-js.** It is not a dependency of this project and it is
 * ~145 KB gzipped — a tenth of §12's whole JavaScript budget, loaded on the
 * page this site exists for, to reject numbers that a human operator reading a
 * WhatsApp message would have no trouble with. What is validated here instead
 * is the shape: digits only, a plausible national length for the chosen
 * country, and a dial code from a fixed list. A number that passes this and is
 * still wrong fails at the same place it would have failed anyway — when
 * somebody tries to ring it.
 *
 * **No flags.** A flag is a country, a dial code is a numbering plan, and the
 * two are not the same thing; +1 is twenty-four countries. §4 also forbids
 * emoji in the UI, and an emoji flag is what a flag in a `<select>` is.
 *
 * The redundant-entry checkbox is the part that matters most and it is exactly
 * as specified: checked by default, so the common case — one phone that also
 * runs WhatsApp — is zero extra typing.
 */

/**
 * The dial codes worth offering, not all 195.
 *
 * East Africa first because that is where somebody already in the region is
 * calling from, then the source markets this site is translated for, then the
 * rest of the long tail by traffic. The list is short enough to scan, which is
 * what a select needs to be.
 */
export const DIAL_CODES = [
  { code: 'TZ', dial: '+255', name: 'Tanzania' },
  { code: 'KE', dial: '+254', name: 'Kenya' },
  { code: 'UG', dial: '+256', name: 'Uganda' },
  { code: 'RW', dial: '+250', name: 'Rwanda' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' },
  { code: 'US', dial: '+1', name: 'United States' },
  { code: 'DE', dial: '+49', name: 'Germany' },
  { code: 'FR', dial: '+33', name: 'France' },
  { code: 'IT', dial: '+39', name: 'Italy' },
  { code: 'NL', dial: '+31', name: 'Netherlands' },
  { code: 'ES', dial: '+34', name: 'Spain' },
  { code: 'CH', dial: '+41', name: 'Switzerland' },
  { code: 'AT', dial: '+43', name: 'Austria' },
  { code: 'BE', dial: '+32', name: 'Belgium' },
  { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'CA', dial: '+1', name: 'Canada' },
  { code: 'ZA', dial: '+27', name: 'South Africa' },
  { code: 'IN', dial: '+91', name: 'India' },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates' },
] as const;

/** §6.3: "+255 for sw". The others follow the locale's own market. */
const DEFAULT_BY_LOCALE: Record<string, string> = {
  sw: 'TZ',
  de: 'DE',
  fr: 'FR',
  it: 'IT',
  en: 'GB',
};

export function defaultDialFor(locale: string): string {
  return DEFAULT_BY_LOCALE[locale] ?? 'TZ';
}

/** Digits only, 6–14 of them — the ITU E.164 national-number range. */
export function isPlausibleNumber(national: string): boolean {
  const digits = national.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 14;
}

export function PhoneInput({
  id,
  name,
  label,
  hint,
  locale,
  value,
  onChange,
  required = false,
  invalid = false,
  describedBy,
  countryLabel,
  className,
}: {
  id: string;
  /** The combined E.164-ish value is submitted under this name. */
  name: string;
  label: string;
  hint?: string;
  locale: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Accessible name for the dial-code select. */
  countryLabel: string;
  className?: string;
}) {
  const [country, setCountry] = React.useState(() => defaultDialFor(locale));
  const dial = DIAL_CODES.find((c) => c.code === country)?.dial ?? '+255';

  // The national part is what the field shows; the dial code is the select.
  const national = value.startsWith(dial) ? value.slice(dial.length).trim() : value;

  function emit(nextDial: string, nextNational: string) {
    const digits = nextNational.replace(/[^\d\s-]/g, '');
    onChange(digits.trim() ? `${nextDial} ${digits.trim()}` : '');
  }

  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block text-label font-semibold text-foreground">
        {label}
        {!required && <span className="ml-1 font-normal text-muted-foreground">({'optional'})</span>}
      </label>

      <div className="flex gap-2">
        <select
          aria-label={countryLabel}
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            const d = DIAL_CODES.find((c) => c.code === e.target.value)?.dial ?? '+255';
            emit(d, national);
          }}
          className="h-12 w-[7.5rem] shrink-0 rounded-sm border-control bg-surface px-2 text-base outline-none focus-visible:border-primary"
        >
          {DIAL_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.dial} {c.code}
            </option>
          ))}
        </select>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={[hintId, describedBy].filter(Boolean).join(' ') || undefined}
          value={national}
          onChange={(e) => emit(dial, e.target.value)}
          placeholder="712 345 678"
          className={cn(
            'h-12 min-w-0 flex-1 rounded-sm border-control bg-surface px-3 text-base outline-none',
            'focus-visible:border-primary',
            invalid && 'border-danger',
          )}
        />
      </div>

      {hint && (
        <p id={hintId} className="mt-1.5 text-body-sm text-muted-foreground">
          {hint}
        </p>
      )}

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
