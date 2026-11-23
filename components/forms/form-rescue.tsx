'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, X } from 'lucide-react';

import {
  FRESH_MS,
  SNAPSHOT_KEY,
  matchForm,
  reloadedForNewDeploy,
  restoreForm,
  snapshotForm,
  type FormSnapshot,
} from '@/lib/forms/stale-deploy';

/**
 * Keeps what a visitor typed when the site is updated under them.
 *
 * Mounted once in the locale layout. It notes each form's fields just before
 * the form submits; if that submit fails because the page came from the
 * previous deploy, app/[locale]/error.tsx reloads, and this puts the fields back
 * and says what happened. See lib/forms/stale-deploy.ts.
 */
export function FormRescue() {
  const t = useTranslations('common');
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    function remember(e: SubmitEvent) {
      const form = e.target;
      if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() === 'get') return;
      try {
        const snapshot = snapshotForm(form);
        if (Object.keys(snapshot.fields).length) {
          sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
        }
      } catch {
        // Storage blocked or full: the form still submits, it just cannot be rescued.
      }
    }
    // Capture phase, so this runs before React's own submit handling.
    document.addEventListener('submit', remember, true);

    if (reloadedForNewDeploy()) {
      let snapshot: FormSnapshot | null = null;
      try {
        snapshot = JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY) ?? 'null') as FormSnapshot | null;
        sessionStorage.removeItem(SNAPSHOT_KEY);
      } catch {
        snapshot = null;
      }
      const fresh = snapshot && snapshot.path === window.location.pathname && Date.now() - snapshot.at < FRESH_MS;
      const form = fresh ? matchForm(snapshot!) : null;
      if (form) restoreForm(form, snapshot!);
      // The quote wizard keeps its own draft and has no snapshot to restore,
      // but its visitor still needs to know to press Send again.
      if (form || fresh || document.forms.length) {
        // Deferred: setState in an effect body is flagged; this is a one-off.
        queueMicrotask(() => setNotice(true));
        form?.scrollIntoView({ block: 'center' });
      }
    }

    return () => document.removeEventListener('submit', remember, true);
  }, []);

  if (!notice) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(var(--tabbar-h,0px)+0.75rem)] z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border bg-surface p-4 text-body-sm shadow-[var(--elev-md,0_8px_24px_rgb(0_0_0/0.12))] lg:bottom-6"
    >
      <RefreshCw className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p className="flex-1">{t('siteUpdatedKept')}</p>
      <button
        type="button"
        onClick={() => setNotice(false)}
        className="-m-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label={t('dismiss')}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
