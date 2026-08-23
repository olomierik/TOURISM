import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { getAdminLeads } from '@/lib/queries/admin';
import { Badge } from '@/components/ui/badge';

export default async function AdminLeadsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [leads, t, format] = await Promise.all([
    getAdminLeads(locale),
    getTranslations('admin'),
    getFormatter(),
  ]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] text-sm">
        <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="py-3 pr-4 font-medium">{t('leadRef')}</th>
            <th scope="col" className="py-3 pr-4 font-medium">{t('leadTraveler')}</th>
            <th scope="col" className="py-3 pr-4 font-medium">{t('leadQuality')}</th>
            <th scope="col" className="py-3 pr-4 font-medium">{t('leadDistributed')}</th>
            <th scope="col" className="py-3 pr-4 font-medium">{t('leadResponded')}</th>
            <th scope="col" className="py-3 font-medium">{t('auditWhen')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {leads.map((l) => (
            <tr key={l.id}>
              <td className="py-3 pr-4 font-mono text-xs">{l.reference}</td>
              <td className="py-3 pr-4">
                <span className="block">{l.fullName}</span>
                <span className="block text-xs text-muted-foreground">
                  {l.destinationName ?? '—'}
                </span>
              </td>
              <td className="py-3 pr-4 tabular-nums">{l.qualityScore}</td>
              <td className="py-3 pr-4">
                {l.recipientCount > 0 ? (
                  <span className="tabular-nums">{l.recipientCount}</span>
                ) : (
                  <Badge variant="demo">{t('leadNotDistributed')}</Badge>
                )}
              </td>
              <td className="py-3 pr-4 tabular-nums">{l.respondedCount}</td>
              <td className="py-3 text-muted-foreground">
                {format.relativeTime(new Date(l.createdAt))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
