import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Inbox, Users } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'enquiries' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

const STATUS_LABEL = {
  new: 'statusNew',
  distributed: 'statusDistributed',
  in_progress: 'statusInProgress',
  closed: 'statusClosed',
  spam: 'statusSpam',
} as const;

export default async function EnquiriesPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // RLS restricts this to the caller's own enquiries — the filter below is for
  // clarity and index selection, not for security.
  const { data: leads } = await supabase
    .from('leads')
    .select(
      `id, reference, status, adults, children, travel_start, travel_end, created_at,
       destinations (destination_translations (locale, name)),
       lead_businesses (id)`,
    )
    .eq('traveler_id', user.id)
    .order('created_at', { ascending: false });

  const t = await getTranslations('enquiries');
  const tQuote = await getTranslations('quote');
  const format = await getFormatter();

  if (!leads?.length) {
    return (
      <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-section text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="mt-8 text-3xl font-semibold">{t('title')}</h1>
        <p className="mt-4 max-w-md text-muted-foreground">{t('noneHelp')}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/request-quote">{tQuote('title')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl py-section">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t('title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
      </header>

      <ul className="space-y-4">
        {leads.map((lead) => {
          const destinationName =
            lead.destinations?.destination_translations.find((x) => x.locale === locale)
              ?.name ?? null;

          return (
            <li key={lead.id} className="rounded-2xl border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-muted-foreground">
                    {lead.reference}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold">
                    {destinationName ?? tQuote('destinationAny')}
                  </h2>
                </div>
                <Badge
                  variant={lead.status === 'in_progress' ? 'verified' : 'secondary'}
                >
                  {t(STATUS_LABEL[lead.status])}
                </Badge>
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-3.5" aria-hidden />
                  <dt className="sr-only">{t('travelers')}</dt>
                  <dd>{lead.adults + lead.children}</dd>
                </div>

                {lead.travel_start && (
                  <div className="text-muted-foreground">
                    <dt className="sr-only">{tQuote('travelStart')}</dt>
                    <dd>
                      {format.dateTime(new Date(lead.travel_start), 'long')}
                      {lead.travel_end &&
                        ` – ${format.dateTime(new Date(lead.travel_end), 'long')}`}
                    </dd>
                  </div>
                )}

                <div className="text-muted-foreground">
                  <dt className="sr-only">{t('status')}</dt>
                  <dd>{t('operators', { count: lead.lead_businesses.length })}</dd>
                </div>

                <div className="ml-auto text-muted-foreground">
                  <dt className="sr-only">{t('sent')}</dt>
                  <dd>{format.dateTime(new Date(lead.created_at), 'short')}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
