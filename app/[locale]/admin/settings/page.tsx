import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { getPlatformSettings } from '@/lib/queries/admin';
import { SettingToggle } from '@/components/admin/moderation-actions';
import { PaddleModeToggle } from '@/components/admin/paddle-mode-toggle';
import { paddleMode, paddleModeReadiness } from '@/lib/payments/paddle';

/**
 * `paddle_live` is driven by its own control above and left out of the generic
 * list, so there is exactly one way to change it. Rendered twice it would also
 * appear as a plain On/Off button with none of the guards — and that button,
 * not the guarded one, is the one somebody would click.
 */
const SPECIAL_CASED = new Set(['paddle_live']);

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, t, mode] = await Promise.all([
    getPlatformSettings(),
    getTranslations('admin'),
    paddleMode(),
  ]);

  const liveReadiness = paddleModeReadiness('live');

  return (
    <div className="space-y-3">
      <h2 className="sr-only">{t('settingsTitle')}</h2>

      <PaddleModeToggle
        live={mode === 'live'}
        liveReady={liveReadiness.ready}
        checks={liveReadiness.checks}
      />

      {settings
        .filter((s) => !SPECIAL_CASED.has(s.key))
        .map((s) => {
          const isBoolean = typeof s.value === 'boolean';
          return (
            <div
              key={s.key}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm">{s.key}</p>
                {s.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                )}
              </div>

              {isBoolean ? (
                <SettingToggle settingKey={s.key} initial={s.value as boolean} />
              ) : (
                /* Non-boolean settings are read-only here. A free-text editor over
                   raw JSON invites breaking lead distribution with a typo; those
                   are changed deliberately, via a migration. */
                <code className="rounded bg-muted px-2.5 py-1 text-sm tabular-nums">
                  {JSON.stringify(s.value)}
                </code>
              )}
            </div>
          );
        })}
    </div>
  );
}
