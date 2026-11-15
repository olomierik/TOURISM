'use client';

import { useActionState, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Check } from 'lucide-react';

import {
  saveLeadSettings,
  startCreditTopUp,
  type LeadSettingsState,
  type TopUpState,
} from '@/lib/leads/billing';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/format';

/**
 * One form per pack rather than a free amount field. The server action
 * accepts only these amounts anyway, and a typed amount is one more thing to
 * get wrong on a phone keyboard.
 */
export function TopUpButtons({ amounts, available }: { amounts: readonly number[]; available: boolean }) {
  const t = useTranslations('leadCredit');
  const locale = useLocale();
  const [state, action, pending] = useActionState<TopUpState, FormData>(startCreditTopUp, {});

  if (!available) {
    return <p className="text-sm text-muted-foreground">{t('topUpUnavailable')}</p>;
  }

  return (
    <div className="space-y-3">
      <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {amounts.map((a) => (
          <Button key={a} type="submit" name="amount" value={a} variant="outline" size="lg" disabled={pending}>
            {formatPrice(a, 'USD', locale)}
          </Button>
        ))}
      </form>
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`topUpError_${state.error}`)}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function LeadSettingsForm({
  bid,
  optOut,
  min,
  max,
  defaultPercent,
  feeMin,
  feeMax,
}: {
  bid: number | null;
  optOut: boolean;
  min: number;
  max: number;
  defaultPercent: number;
  feeMin: number;
  feeMax: number;
}) {
  const t = useTranslations('leadCredit');
  const locale = useLocale();
  const [state, action, pending] = useActionState<LeadSettingsState, FormData>(saveLeadSettings, {});
  const [value, setValue] = useState(bid === null ? '' : String(bid));

  // The same arithmetic as lib/leads/pricing.ts typicalEnquiry, live as the
  // operator types: two adults, seven days, US$350 a day.
  const typedPercent = value === '' ? defaultPercent : Number(value);
  const effective = Number.isFinite(typedPercent) ? Math.min(max, Math.max(min, typedPercent)) : defaultPercent;
  const typicalValue = 2 * 7 * 350;
  const typicalFee = Math.min(feeMax, Math.max(feeMin, Math.round(typicalValue * effective) / 100));

  return (
    <form action={action} className="space-y-6">
      {state.success && (
        <Alert variant="success">
          <Check className="size-4" aria-hidden />
          <AlertDescription>{t('settingsSaved')}</AlertDescription>
        </Alert>
      )}
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`settingsError_${state.error}`)}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="bid">{t('bidLabel')}</Label>
        <div className="flex max-w-xs items-center gap-2">
          <Input
            id="bid"
            name="bid"
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={0.5}
            placeholder={String(defaultPercent)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="bid-hint bid-example"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <p id="bid-hint" className="text-xs text-muted-foreground">
          {t('bidHint', { min, max, feeMin: formatPrice(feeMin, 'USD', locale), feeMax: formatPrice(feeMax, 'USD', locale) })}
        </p>
        <p id="bid-example" className="rounded-lg bg-muted/60 p-3 text-sm">
          {t('bidExample', {
            value: formatPrice(typicalValue, 'USD', locale),
            percent: effective,
            fee: formatPrice(typicalFee, 'USD', locale),
          })}
        </p>
      </div>

      <div className="space-y-2 border-t pt-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="markupOptOut"
            defaultChecked={optOut}
            className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
          />
          <span>
            <span className="text-sm font-medium">{t('markupOptOutLabel')}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{t('markupOptOutHint')}</span>
          </span>
        </label>
      </div>

      <Button type="submit" loading={pending}>
        {t('saveSettings')}
      </Button>
    </form>
  );
}
