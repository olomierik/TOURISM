'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from 'lucide-react';

import {
  deleteBusinessAsAdmin,
  deleteDestination,
  deleteGuide,
  restoreDestination,
} from '@/lib/admin/crud';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The destructive controls, deliberately separated and deliberately awkward.
 *
 * Two levels are offered because they are genuinely different operations.
 * Retiring hides a record from the public site and is reversible. Deleting
 * removes the row, and the foreign keys cascade — deleting a destination detaches
 * every business attached to it, deleting a business takes its leads with it.
 *
 * The permanent option is behind a two-step reveal, and for destinations and
 * guides it also requires typing the record's name — a confirm dialog is
 * dismissed by reflex, and the thing being protected is data with no undo.
 *
 * Businesses opt out of the typed step (requireTypedName={false}): an admin
 * clearing spam or a duplicate listing does that often enough that the friction
 * costs more than it protects, and Retire sits directly above as the reversible
 * option.
 */
function DangerZone({
  name,
  retired,
  requireTypedName = true,
  onRetire,
  onRestore,
  onDelete,
}: {
  name: string;
  retired: boolean;
  /** When false, one confirm click is enough. */
  requireTypedName?: boolean;
  onRetire: () => Promise<unknown>;
  onRestore?: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const t = useTranslations('admin.danger');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showPermanent, setShowPermanent] = useState(false);

  async function run(key: string, fn: () => Promise<unknown>, back?: boolean) {
    setBusy(key);
    await fn();
    setBusy(null);
    startTransition(() => (back ? router.push('..') : router.refresh()));
  }

  return (
    <section className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-destructive" aria-hidden />
        <h2 className="text-lg font-semibold">{t('title')}</h2>
      </div>

      {retired ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t('retiredNotice')}</p>
          {onRestore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => run('restore', onRestore)}
            >
              {busy === 'restore' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="size-4" aria-hidden />
              )}
              {t('restore')}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-sm text-muted-foreground">{t('retireBody')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => run('retire', onRetire)}
          >
            {busy === 'retire' && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t('retire')}
          </Button>
        </div>
      )}

      <div className="border-t border-destructive/20 pt-4">
        {!showPermanent ? (
          <button
            type="button"
            onClick={() => setShowPermanent(true)}
            className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
          >
            {t('showPermanent')}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('permanentBody')}</p>
            {requireTypedName && (
              <div className="space-y-2">
                <Label htmlFor="confirm-name" className="text-sm">
                  {t('typeName', { name })}
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={name}
                  autoComplete="off"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={(requireTypedName && confirmText.trim() !== name) || busy !== null}
                onClick={() => run('delete', onDelete, true)}
              >
                {busy === 'delete' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                {t('deletePermanently')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPermanent(false)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function DestinationDangerZone({
  id,
  name,
  retired,
}: {
  id: string;
  name?: string;
  retired: boolean;
}) {
  return (
    <DangerZone
      name={name ?? 'DELETE'}
      retired={retired}
      onRetire={() => deleteDestination(id)}
      onRestore={() => restoreDestination(id)}
      onDelete={() => deleteDestination(id, { hard: true })}
    />
  );
}

export function GuideDangerZone({
  id,
  name,
  retired,
}: {
  id: string;
  name?: string;
  retired: boolean;
}) {
  return (
    <DangerZone
      name={name ?? 'DELETE'}
      retired={retired}
      onRetire={() => deleteGuide(id)}
      onDelete={() => deleteGuide(id, { hard: true })}
    />
  );
}

export function BusinessDangerZone({
  id,
  name,
  retired,
}: {
  id: string;
  name?: string;
  retired: boolean;
}) {
  return (
    <DangerZone
      name={name ?? 'DELETE'}
      retired={retired}
      // No typed confirmation for businesses: an admin needs to be able to clear
      // a listing without ceremony. The two-step reveal remains, and Retire is
      // still the reversible option sitting directly above it.
      requireTypedName={false}
      onRetire={() => deleteBusinessAsAdmin(id)}
      onDelete={() => deleteBusinessAsAdmin(id, { hard: true })}
    />
  );
}
