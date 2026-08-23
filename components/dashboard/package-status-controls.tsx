'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, EyeOff, Loader2, Trash2 } from 'lucide-react';

import { deletePackage, setPackageStatus } from '@/lib/dashboard/package-actions';
import { Button } from '@/components/ui/button';

/**
 * Publish, unpublish and delete controls for one package.
 *
 * Deletion confirms inline rather than through a dialog, and is a soft delete:
 * a published package may already be linked from an enquiry a traveler is still
 * reading, and the row carries the price that was quoted to them.
 */
export function PackageStatusControls({
  id,
  status,
  title,
}: {
  id: string;
  status: string;
  title: string;
}) {
  const t = useTranslations('dashboard.packageForm');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, back = false) {
    setBusy(true);
    await fn();
    setBusy(false);
    setConfirming(false);
    startTransition(() => (back ? router.push('/dashboard/packages') : router.refresh()));
  }

  const working = busy || pending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'published' ? (
        <Button
          type="button"
          size="sm"
          disabled={working}
          onClick={() => run(() => setPackageStatus(id, 'published'))}
        >
          {working ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
          {t('publish')}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={working}
          onClick={() => run(() => setPackageStatus(id, 'draft'))}
        >
          <EyeOff className="size-3.5" aria-hidden />
          {t('unpublish')}
        </Button>
      )}

      {confirming ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={working}
            onClick={() => run(() => deletePackage(id), true)}
          >
            {t('confirmDelete', { title })}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {t('cancel')}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t('delete')}
          disabled={working}
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden />
        </Button>
      )}
    </div>
  );
}
