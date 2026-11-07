import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
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

/** How many recipient names a row shows before "+n more". */
const NAMES_SHOWN = 3;

export default async function AdminLeadsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [leads, t, tDetail, format] = await Promise.all([
    getAdminLeads(locale),
    getTranslations('admin'),
    getTranslations('admin.leadDetail'),
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
          {leads.map((l) => {
            const missed = l.recipientCount - l.emailedCount;
            return (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={{ pathname: '/admin/leads/[id]', params: { id: l.id } }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {l.reference}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="block">{l.fullName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {l.destinationName ?? '—'}
                  </span>
                </TableCell>
                <TableNum>{l.qualityScore}</TableNum>
                <TableCell>
                  {l.recipientCount > 0 ? (
                    <div className="space-y-1">
                      {/* Names, not a count: which business got the enquiry
                          is the question this column answers. */}
                      <span className="block max-w-[22rem] text-sm">
                        {l.recipients
                          .slice(0, NAMES_SHOWN)
                          .map((r) => r.name)
                          .join(', ')}
                        {l.recipientCount > NAMES_SHOWN && (
                          <span className="text-muted-foreground">
                            {' '}
                            {t('leadMore', { count: l.recipientCount - NAMES_SHOWN })}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t('leadEmailed', { emailed: l.emailedCount, total: l.recipientCount })}
                      </span>
                      {missed > 0 && (
                        <Badge variant="demo">{tDetail('notReachedBadge', { count: missed })}</Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="demo">{t('leadNotDistributed')}</Badge>
                  )}
                </TableCell>
                <TableNum>{l.respondedCount}</TableNum>
                <TableCell className="pr-0 text-muted-foreground">
                  {format.relativeTime(new Date(l.createdAt))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScroll>
  );
}
