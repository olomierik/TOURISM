import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { ClipboardList } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { getAuditLog } from '@/lib/queries/admin';

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [entries, t, format] = await Promise.all([
    getAuditLog(),
    getTranslations('admin'),
    getFormatter(),
  ]);

  if (entries.length === 0) {
    return (
      <div className="flex min-h-[30svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
        <ClipboardList className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">{t('auditEmpty')}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4 text-sm">
          <code className="rounded bg-muted px-2 py-0.5 text-xs">{e.action}</code>
          <span className="text-muted-foreground">{e.entityType}</span>
          <span className="text-muted-foreground">
            {/* System actions have no actor: migrations and scheduled jobs. */}
            {t('auditActor')} {e.actorName ?? t('auditSystem')}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {format.relativeTime(new Date(e.createdAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}
