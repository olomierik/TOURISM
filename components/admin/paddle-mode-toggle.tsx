'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CircleCheck, CircleX, FlaskConical, Radio } from 'lucide-react';

import { setPaddleMode } from '@/lib/admin/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CredentialCheck = {
  name: string;
  present: boolean;
  wrongEnvironment: boolean;
};

/**
 * The one control on the platform that decides whether money is real.
 *
 * Three things make it different from the generic `SettingToggle` next to it,
 * and each of them is the reason it is a component of its own:
 *
 *   **Switching on asks twice.** Everything else on the settings page can be
 *   put back by clicking again. This one can take a stranger's money in the
 *   seconds before somebody notices, so the first click arms it and the second
 *   commits. Switching *off* is immediate — the safe direction should never be
 *   slowed down, because that is the direction you want when something is
 *   wrong.
 *
 *   **It explains why it is disabled.** "Go live" with no live credentials is
 *   not a thing to fail silently at; the screen names the environment
 *   variables that are missing, which is the whole of what somebody needs in
 *   order to fix it.
 *
 *   **It distinguishes missing from wrong.** A variable that is set but holds a
 *   sandbox key is a different problem from one that is not set, and it is the
 *   problem that actually happened here on 9 November 2026. Reporting both as
 *   "missing" would send somebody looking in the wrong place.
 *
 * It never shows a credential, masked or otherwise. A name and a verdict are
 * enough to act on, and an admin page should not be a place where a payments
 * secret can be read off a screenshot.
 */
export function PaddleModeToggle({
  live,
  liveReady,
  checks,
}: {
  live: boolean;
  liveReady: boolean;
  checks: CredentialCheck[];
}) {
  const t = useTranslations('admin');
  const [pending, startTransition] = useTransition();
  const [arming, setArming] = useState(false);
  const [failed, setFailed] = useState(false);

  const problems = checks.filter((c) => !c.present || c.wrongEnvironment);

  function apply(next: boolean) {
    setFailed(false);
    startTransition(async () => {
      const result = await setPaddleMode(next);
      setArming(false);
      // `notReady` can still come back even with the button enabled, if a
      // credential went away between the render and the click.
      if (result?.error) setFailed(true);
    });
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-5',
        live ? 'border-warning/40 bg-warning/5' : 'bg-card',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {live ? (
              <Radio className="size-4 shrink-0 text-warning" aria-hidden />
            ) : (
              <FlaskConical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <p className="font-semibold">{t('paddleModeTitle')}</p>
          </div>

          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
            {live ? t('paddleModeLiveBody') : t('paddleModeSandboxBody')}
          </p>

          <p className="mt-2 text-sm font-medium" aria-live="polite">
            {live ? t('paddleModeLive') : t('paddleModeSandbox')}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2">
          {live ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => apply(false)}
            >
              {t('paddleModeToSandbox')}
            </Button>
          ) : arming ? (
            <>
              <Button size="sm" variant="primary" disabled={pending} onClick={() => apply(true)}>
                <AlertTriangle className="size-3.5" aria-hidden />
                {t('paddleModeConfirm')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setArming(false)}
              >
                {t('paddleModeCancel')}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="primary"
              disabled={pending || !liveReady}
              onClick={() => setArming(true)}
            >
              {t('paddleModeToLive')}
            </Button>
          )}
        </div>
      </div>

      {arming && !live && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          {t('paddleModeWarning')}
        </p>
      )}

      {failed && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t('paddleModeFailed')}
        </p>
      )}

      {/* Shown whenever live is not ready, whichever mode is in force. While
          live it means the credentials went away underneath a running
          checkout, which is worth seeing immediately rather than on the next
          failed payment. */}
      {!liveReady && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-medium">{t('paddleModeNotReady')}</p>
          <ul className="mt-2 space-y-1.5">
            {problems.map((c) => (
              <li key={c.name} className="flex items-start gap-2 text-sm">
                <CircleX className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
                <span className="min-w-0">
                  <code className="break-all font-mono text-xs">{c.name}</code>
                  <span className="ml-2 text-muted-foreground">
                    {c.wrongEnvironment ? t('paddleCredWrongEnv') : t('paddleCredMissing')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            {t('paddleModeNotReadyHint')}
          </p>
        </div>
      )}

      {liveReady && !live && (
        <p className="mt-4 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
          <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden />
          {t('paddleModeReady')}
        </p>
      )}
    </div>
  );
}
