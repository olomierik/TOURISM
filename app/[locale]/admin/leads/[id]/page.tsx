import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft, CheckCircle2, CircleAlert, CircleDashed, MailX } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getAdminLeadDetail, type DeliveryState } from '@/lib/queries/admin';
import { ForwardLeadForm, ResendLead } from '@/components/admin/forward-lead-form';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScroll,
} from '@/components/ui/table';

type Params = LocaleParams & { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.leadDetail' });
  return { title: t('title') };
}

const DELIVERY_ICON: Record<DeliveryState, typeof CheckCircle2> = {
  emailed: CheckCircle2,
  failed: CircleAlert,
  unreachable: MailX,
  unrecorded: CircleDashed,
};
const DELIVERY_TONE: Record<DeliveryState, string> = {
  emailed: 'text-success',
  failed: 'text-destructive',
  unreachable: 'text-destructive',
  unrecorded: 'text-muted-foreground',
};

/**
 * One enquiry: what the traveller asked for, every business it went to and
 * whether each was actually told, and the controls to send it somewhere else.
 */
export default async function AdminLeadDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [lead, t, format] = await Promise.all([
    getAdminLeadDetail(locale, id),
    getTranslations('admin.leadDetail'),
    getFormatter(),
  ]);
  if (!lead) notFound();

  const when = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' }) : null;

  const reached = lead.recipients.filter(
    (r) => r.delivery.state === 'emailed' || r.delivery.state === 'unrecorded',
  ).length;
  const notReached = lead.recipients.length - reached;

  const facts: Array<[string, string | null]> = [
    [t('where'), [lead.destinationName, lead.destinationOther].filter(Boolean).join(' / ') || null],
    [t('what'), lead.categoryName],
    [
      t('when'),
      lead.travelStart
        ? `${lead.travelStart}${lead.travelEnd ? ` → ${lead.travelEnd}` : ''}${lead.datesFlexible ? ` (${t('flexible')})` : ''}`
        : null,
    ],
    [t('party'), t('partyValue', { adults: lead.adults, children: lead.children })],
    [
      t('budget'),
      lead.budgetMin !== null || lead.budgetMax !== null
        ? `${lead.budgetCurrency} ${[lead.budgetMin, lead.budgetMax].filter((v) => v !== null).join(' – ')}`
        : null,
    ],
    [t('interests'), lead.interests.length ? lead.interests.join(', ') : null],
    [t('language'), lead.locale.toUpperCase()],
    [t('quality'), String(lead.qualityScore)],
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-2">
        <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden />
          {t('back')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-semibold">{lead.reference}</h1>
          <Badge variant="secondary">{lead.status}</Badge>
          {notReached > 0 && <Badge variant="demo">{t('notReachedBadge', { count: notReached })}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {t('received', { when: when(lead.createdAt) ?? '' })}
        </p>
      </div>

      {/* The traveller and the trip. */}
      <section className="grid gap-6 md:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {lead.message && (
            <blockquote className="whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 text-sm">
              {lead.message}
            </blockquote>
          )}
          {lead.sourceUrl && (
            <p className="break-all text-xs text-muted-foreground">
              {t('source')}: {lead.sourceUrl}
            </p>
          )}
        </div>
        <div className="space-y-1.5 rounded-xl border p-4 text-sm">
          <p className="font-medium">{lead.fullName}</p>
          <p><a className="hover:text-primary" href={`mailto:${lead.email}`}>{lead.email}</a></p>
          {lead.phone && <p>{lead.phone}</p>}
          {lead.whatsapp && <p>WhatsApp: {lead.whatsapp}</p>}
        </div>
      </section>

      {/* Who got it. */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t('recipientsTitle', { count: lead.recipients.length })}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('recipientsLead', { reached })}</p>
        </div>

        {lead.recipients.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t('noRecipients')}</p>
        ) : (
          <TableScroll>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('colBusiness')}</TableHeader>
                  <TableHeader>{t('colHow')}</TableHeader>
                  <TableHeader>{t('colDelivery')}</TableHeader>
                  <TableHeader>{t('colStatus')}</TableHeader>
                  <TableHeader className="pr-0" />
                </TableRow>
              </TableHead>
              <TableBody>
                {lead.recipients.map((r) => {
                  const Icon = DELIVERY_ICON[r.delivery.state];
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link
                          href={{ pathname: '/admin/businesses/[id]', params: { id: r.businessId } }}
                          className="font-medium hover:text-primary"
                        >
                          {r.name}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {[r.place, r.claimed ? t('claimed') : t('unclaimed'), r.phone].filter(Boolean).join(' · ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{t(`how.${r.how}`)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-start gap-1.5 text-sm ${DELIVERY_TONE[r.delivery.state]}`}>
                          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                          <span>
                            {t(`delivery.${r.delivery.state}`)}
                            {r.delivery.to && (
                              <span className="block text-xs text-muted-foreground">{r.delivery.to}</span>
                            )}
                            {r.delivery.at && (
                              <span className="block text-xs text-muted-foreground">{when(r.delivery.at)}</span>
                            )}
                            {r.delivery.error && (
                              <span className="block text-xs">{r.delivery.error}</span>
                            )}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.status}
                        {r.viewedAt && (
                          <span className="block text-xs text-muted-foreground">
                            {t('viewed', { when: when(r.viewedAt) ?? '' })}
                          </span>
                        )}
                        {r.quoted && (
                          <span className="block text-xs text-muted-foreground">{t('quoted', { amount: r.quoted })}</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-0">
                        <ResendLead leadId={lead.id} businessId={r.businessId} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </section>

      {/* Send it somewhere else. */}
      <section className="space-y-3 rounded-xl border p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold">{t('forwardTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('forwardLead')}</p>
        </div>
        <ForwardLeadForm leadId={lead.id} />
      </section>

      {lead.events.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('historyTitle')}</h2>
          <ol className="space-y-1.5 text-sm">
            {lead.events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2">
                <span className="tabular-nums text-muted-foreground">{when(e.createdAt)}</span>
                <span className="font-mono text-xs leading-5">{e.event}</span>
                {e.businessName && <span>{e.businessName}</span>}
                {typeof e.detail?.to === 'string' && <span className="text-muted-foreground">→ {e.detail.to}</span>}
                {typeof e.detail?.count === 'number' && (
                  <span className="text-muted-foreground">({e.detail.count})</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
