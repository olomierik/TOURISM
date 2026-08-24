'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Loader2, Plus, Trash2 } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import {
  createService,
  deleteService,
  updateService,
  type ServiceState,
} from '@/lib/dashboard/service-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

const initial: ServiceState = {};

export type ServiceRow = {
  id: string;
  price_from: number | string | null;
  currency: string | null;
  is_active: boolean;
  name: string | null;
  description: string | null;
};

/**
 * Add, edit and remove the services a listing offers.
 *
 * One screen rather than list plus create plus edit routes. A service is three
 * short fields, and making someone navigate to a separate page to add "Airport
 * transfer, from $40" would cost more attention than the thing is worth —
 * packages earn their own routes because they carry an itinerary; these do not.
 */
export function ServicesManager({
  services,
  locale,
  atLimit,
  limit,
}: {
  services: ServiceRow[];
  locale: string;
  atLimit: boolean;
  limit: number | null;
}) {
  const t = useTranslations('dashboard.servicesPage');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createState, createAction, creating] = useActionState(createService, initial);
  const [editState, editAction, editing] = useActionState(updateService, initial);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    await deleteService(id);
    setBusy(null);
    setConfirming(null);
    startTransition(() => router.refresh());
  }

  const state = createState.error ? createState : editState;

  return (
    <div className="space-y-8">
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>
            {state.error === 'limitReached' && state.limit != null ? (
              <>
                {t('errors.limitReachedWithCount', { count: state.limit })}{' '}
                <Link href="/dashboard/subscription" className="font-medium underline">
                  {t('seePlans')}
                </Link>
              </>
            ) : (
              t(`errors.${state.error}`)
            )}
          </AlertDescription>
        </Alert>
      )}

      {(createState.success || editState.success) && (
        <Alert>
          <Check className="size-4" aria-hidden />
          <AlertDescription>{t('saved')}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('yours')}</h2>

        {services.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <ul className="space-y-3">
            {services.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-4">
                <form action={editAction} className="space-y-3">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="locale" value={locale} />

                  <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px]">
                    <Input name="name" defaultValue={s.name ?? ''} required aria-label={t('name')} />
                    <Input
                      name="priceFrom"
                      type="number"
                      min="0"
                      step="any"
                      defaultValue={s.price_from ?? ''}
                      placeholder={t('priceFrom')}
                      aria-label={t('priceFrom')}
                    />
                    <select
                      name="currency"
                      defaultValue={s.currency ?? 'USD'}
                      aria-label={t('currency')}
                      className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      {['USD', 'EUR', 'GBP', 'TZS'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Textarea
                    name="description"
                    rows={2}
                    defaultValue={s.description ?? ''}
                    placeholder={t('description')}
                    aria-label={t('description')}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={s.is_active}
                        className="size-4 rounded border-input accent-primary"
                      />
                      {t('isActive')}
                    </label>

                    <span className="flex-1" />

                    <Button type="submit" size="sm" variant="outline" disabled={editing}>
                      {editing && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                      {t('save')}
                    </Button>

                    {confirming === s.id ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy === s.id}
                          onClick={() => void remove(s.id)}
                        >
                          {busy === s.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            t('confirmDelete')
                          )}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                          {t('cancel')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={t('delete')}
                        onClick={() => setConfirming(s.id)}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden />
                      </Button>
                    )}
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">{t('addTitle')}</h2>

        {atLimit ? (
          // The upgrade prompt replaces the form rather than sitting beside a
          // disabled one: a greyed-out form next to an upsell reads as a fault.
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{t('limitBody', { limit: limit ?? 0 })}</p>
            <Button asChild size="sm">
              <Link href="/dashboard/subscription">{t('seePlans')}</Link>
            </Button>
          </div>
        ) : (
          <form action={createAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px]">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">{t('name')}</Label>
                <Input id="new-name" name="name" required placeholder={t('namePlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-price">{t('priceFrom')}</Label>
                <Input id="new-price" name="priceFrom" type="number" min="0" step="any" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-currency">{t('currency')}</Label>
                <select
                  id="new-currency"
                  name="currency"
                  defaultValue="USD"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {['USD', 'EUR', 'GBP', 'TZS'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-description">{t('description')}</Label>
              <Textarea id="new-description" name="description" rows={2} />
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              {t('add')}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
