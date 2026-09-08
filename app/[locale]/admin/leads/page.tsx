import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { getAdminLeads } from '@/lib/queries/admin';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableScroll,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableNum,
} from '@/components/ui/table';

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
    <TableScroll>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>{t('leadRef')}</TableHeader>
            <TableHeader>{t('leadTraveler')}</TableHeader>
            <TableHeader>{t('leadQuality')}</TableHeader>
            <TableHeader>{t('leadDistributed')}</TableHeader>
            <TableHeader>{t('leadResponded')}</TableHeader>
            <TableHeader className="pr-0">{t('auditWhen')}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {leads.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-mono text-xs">{l.reference}</TableCell>
              <TableCell>
                <span className="block">{l.fullName}</span>
                <span className="block text-xs text-muted-foreground">
                  {l.destinationName ?? '—'}
                </span>
              </TableCell>
              <TableNum>{l.qualityScore}</TableNum>
              <TableCell>
                {l.recipientCount > 0 ? (
                  <span className="tabular-nums">{l.recipientCount}</span>
                ) : (
                  <Badge variant="demo">{t('leadNotDistributed')}</Badge>
                )}
              </TableCell>
              <TableNum>{l.respondedCount}</TableNum>
              <TableCell className="pr-0 text-muted-foreground">
                {format.relativeTime(new Date(l.createdAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroll>
  );
}
