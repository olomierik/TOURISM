'use client';

import { useActionState, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CreditCard, ExternalLink, Trash2 } from 'lucide-react';

import {
  savePaymentMethod,
  removePaymentMethod,
  type PaymentMethodState,
  type PaymentProvider,
} from '@/lib/payments/methods';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export type SavedMethod = {
  id: string;
  provider: PaymentProvider;
  checkout_url: string;
  label: string | null;
};

/**
 * Where an operator connects their own checkout.
 *
 * The list of providers and the hosts each one serves come from the database,
 * so this component never decides what is acceptable — it only explains the
 * decision. The rule lives in migration 053 as a trigger, because the operator
 * form is not the only thing that writes here.
 */
export function PaymentMethodsForm({
  providers,
  hostsByProvider,
  saved,
}: {
  providers: PaymentProvider[];
  hostsByProvider: Record<string, string[]>;
  saved: SavedMethod[];
}) {
  const t = useTranslations('dashboard.payments');
  const [state, action, pending] = useActionState<PaymentMethodState, FormData>(
    savePaymentMethod,
    {},
  );
  const [provider, setProvider] = useState<PaymentProvider>(providers[0]);
  const [removing, startRemove] = useTransition();

  const hosts = hostsByProvider[provider] ?? [];

  return (
    <div className="space-y-8">
      {saved.length > 0 && (
        <ul className="space-y-3">
          {saved.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" aria-hidden />
                  <span className="font-medium">{t(`providers.${m.provider}`)}</span>
                  {m.label && <Badge variant="secondary">{m.label}</Badge>}
                </div>
                <a
                  href={m.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 break-all text-xs text-muted-foreground hover:underline"
                >
                  {m.checkout_url}
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removing}
                onClick={() => startRemove(() => void removePaymentMethod(m.id))}
              >
                <Trash2 className="size-4" aria-hidden />
                {t('remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-5 rounded-xl border p-5">
        <div className="space-y-2">
          <Label htmlFor="provider">{t('provider')}</Label>
          <select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as PaymentProvider)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {t(`providers.${p}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkoutUrl">{t('checkoutUrl')}</Label>
          <Input
            id="checkoutUrl"
            name="checkoutUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            required
          />
          {/* The allowed hosts, shown rather than discovered by rejection. An
              operator pasting a link from their gateway's dashboard should be
              able to see before submitting whether it will be accepted. */}
          <p className="text-xs text-muted-foreground">
            {t('hostsHint')} <span className="font-mono">{hosts.join(', ')}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">{t('label')}</Label>
          <Input id="label" name="label" maxLength={40} placeholder={t('labelPlaceholder')} />
          <p className="text-xs text-muted-foreground">{t('labelHint')}</p>
        </div>

        {state.error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
          </Alert>
        )}
        {state.success && (
          <Alert variant="success">
            <AlertDescription>{t('saved')}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
      </form>
    </div>
  );
}
