'use client';

import { useActionState, useState } from 'react';
import { Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDeal, type DealState } from '@/lib/deals/actions';

type PackageOption = { id: string; name: string; price: number | null; currency: string };

/**
 * The form an operator writes a deal in.
 *
 * The one interesting thing here is what it does not have: a field for the
 * price the deal is discounting from. That number is the package's own
 * published price, shown read-only beside the input, and it is the reason this
 * feature does not rot into "was $1,200, now $890" on every listing. An
 * operator who wants a bigger-looking discount has to raise the price
 * travellers actually see.
 *
 * The rest of the rules are enforced by a trigger, not by this form, because
 * the table is reachable without it. What the form adds is telling somebody
 * why, in words, before they submit.
 */
export function DealForm({ packages }: { packages: PackageOption[] }) {
  const t = useTranslations('dashboard.dealsPage');
  const [state, action, pending] = useActionState<DealState, FormData>(createDeal, {});
  const [packageId, setPackageId] = useState('');

  const chosen = packages.find((p) => p.id === packageId);
  const money = (n: number, currency: string) =>
    new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  return (
    <form action={action} className="space-y-5 rounded-2xl border p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Tag className="size-5 text-primary" aria-hidden />
        {t('newTitle')}
      </h2>

      <div className="space-y-2">
        <Label htmlFor="packageId">{t('packageLabel')}</Label>
        <select
          id="packageId"
          name="packageId"
          value={packageId}
          onChange={(e) => setPackageId(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('noPackage')}</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id} disabled={p.price === null}>
              {p.name}
              {p.price === null ? ` — ${t('noPrice')}` : ` — ${money(p.price, p.currency)}`}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{t('packageHint')}</p>
      </div>

      {chosen && chosen.price !== null && (
        <div className="space-y-2">
          <Label htmlFor="dealPrice">{t('priceLabel')}</Label>
          <div className="flex items-center gap-3">
            {/* Read-only, and not a form field. The operator cannot type this. */}
            <span className="whitespace-nowrap text-sm text-muted-foreground line-through">
              {money(chosen.price, chosen.currency)}
            </span>
            <Input
              id="dealPrice"
              name="dealPrice"
              type="number"
              min={Math.ceil(chosen.price * 0.3)}
              max={Math.floor(chosen.price * 0.95)}
              step={10}
              required
              className="max-w-40"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('priceHint', {
              min: money(Math.ceil(chosen.price * 0.3), chosen.currency),
              max: money(Math.floor(chosen.price * 0.95), chosen.currency),
            })}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="endsAt">{t('endsLabel')}</Label>
        <Input id="endsAt" name="endsAt" type="date" required className="max-w-52" />
        <p className="text-xs text-muted-foreground">{t('endsHint')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">{t('headlineLabel')}</Label>
        <Input
          id="headline"
          name="headline"
          maxLength={90}
          minLength={8}
          required
          placeholder={t('headlinePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">{t('termsLabel')}</Label>
        <Textarea
          id="terms"
          name="terms"
          rows={3}
          minLength={30}
          required
          placeholder={t('termsPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">{t('termsHint')}</p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {t(`error.${state.error}`)}
        </p>
      )}
      {state.created && (
        <p className="rounded-lg bg-secondary/50 p-3 text-sm">{t('created')}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t('publishing') : t('publish')}
      </Button>
    </form>
  );
}
