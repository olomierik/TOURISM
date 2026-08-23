'use client';

import { useState } from 'react';

import { Label } from '@/components/ui/label';

export type CountryOption = { code: string; name: string };
export type RegionOption = { id: string; country_code: string; name: string };

const SELECT_CLASS =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

/**
 * Country and region for a destination, with the region list filtered by the
 * chosen country.
 *
 * Every region for every curated country is sent down at once and filtered in
 * the browser. That is eighty-seven short rows — smaller than one of the
 * photographs on the same page — and it makes changing the country instant
 * instead of a round trip. A fetch-per-change would be the wrong trade at this
 * size and would need a loading state for something that should feel like a
 * dropdown.
 *
 * Changing the country clears the region rather than leaving a stale one
 * selected: a Kenyan county under a Tanzanian destination is worse than an empty
 * field, because it looks deliberate.
 */
export function CountryRegionPicker({
  countries,
  regions,
  countryLabel,
  regionLabel,
  regionHint,
  defaultCountry,
  defaultRegionId,
}: {
  countries: CountryOption[];
  regions: RegionOption[];
  countryLabel: string;
  regionLabel: string;
  regionHint?: string;
  defaultCountry?: string | null;
  defaultRegionId?: string | null;
}) {
  const [country, setCountry] = useState(defaultCountry ?? countries[0]?.code ?? 'TZ');
  const [regionId, setRegionId] = useState(defaultRegionId ?? '');

  const available = regions.filter((r) => r.country_code === country);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="countryCode">{countryLabel}</Label>
        <select
          id="countryCode"
          name="countryCode"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setRegionId('');
          }}
          className={SELECT_CLASS}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="regionId">{regionLabel}</Label>
        <select
          id="regionId"
          name="regionId"
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">—</option>
          {available.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {regionHint && <p className="text-xs text-muted-foreground">{regionHint}</p>}
      </div>
    </div>
  );
}

/**
 * Country on its own, for a business listing.
 *
 * Uses the full country list rather than the curated four: an operator anywhere
 * on the continent may list a business, even where we do not yet publish
 * destinations of our own.
 */
export function CountrySelect({
  countries,
  label,
  hint,
  defaultCountry,
}: {
  countries: CountryOption[];
  label: string;
  hint?: string;
  defaultCountry?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="countryCode">{label}</Label>
      <select
        id="countryCode"
        name="countryCode"
        defaultValue={defaultCountry ?? 'TZ'}
        className={SELECT_CLASS}
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
