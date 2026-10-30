import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, CalendarDays, Clock, Inbox, Users } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMoney } from '@/lib/leads/quote-types';
import { PageMasthead } from '@/components/layout/page-masthead';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'enquiries' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * The traveller's quote inbox.
 *
 * It used to be a list of requests: reference, destination, party size, and a
 * button to open the conversation. It never said whether anybody had replied,
 * or what they had said. A traveller who sent one request and wanted to know
 * if a price had arrived had to open each enquiry in turn to find out — which
 * is the same amount of work as checking their email, so they checked their
 * email and never came back here.
 *
 * `competitive-strategy.md` §3 names this as the strongest retention feature
 * available to us, and notes that SafariBookings, TourRadar and Much Better
 * Adventures all hand the traveller off to email at exactly this point. The
 * comparison view already existed one click deeper; what was missing was the
 * reason to take the click.
 *
 * So each row now answers the only question anybody opens this page to ask:
 * **has anyone quoted, and how much?** Lowest price, number of quotes, how
 * many operators are still thinking about it.
 *
 * Prices are shown in the currency they were quoted in and the lowest is
 * picked within a single currency only. Converting at a rate we chose would
 * put a number on screen that no operator ever quoted, which is the same
 * mistake as a fabricated distance or an invented rating.
 */
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
       destination_other,
       destinations (destination_translations (locale, name)),
       lead_businesses (id, responded_at, lead_quotes (total_amount, currency))`,
    )
    .eq('traveler_id', user.id)
    .order('created_at', { ascending: false });

  const t = await getTranslations('enquiries');
  const tQuote = await getTranslations('quote');
  const format = await getFormatter();

  if (!leads?.length) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Inbox}
          title={t('title')}
          help={t('noneHelp')}
          action={
            <Button asChild size="lg">
              <Link href="/request-quote">{tQuote('title')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <PageMasthead containerClassName="max-w-4xl" title={t('title')} subtitle={t('subtitle')} />
      <div className="container-page max-w-4xl py-10 sm:py-12">

      <ul className="space-y-4">
        {leads.map((lead) => {
          // A traveller who typed somewhere we do not have a row for still
          // told us where they want to go, and it is the card's heading. Only
          // fall through to "Not sure yet" when they genuinely left it blank.
          const destinationName =
            lead.destinations?.destination_translations.find((x) => x.locale === locale)?.name ??
            lead.destination_other ??
            null;

          const sent = lead.lead_businesses ?? [];
          const quotes = sent.flatMap((lb) => lb.lead_quotes ?? []);
          const awaiting = sent.length - sent.filter((lb) => lb.responded_at).length;
          const closed = lead.status === 'closed' || lead.status === 'spam';

          // Cheapest, within one currency. See the note above on why nothing
          // is converted.
          const byCurrency = new Map<string, number>();
          for (const q of quotes) {
            const amount = Number(q.total_amount);
            const best = byCurrency.get(q.currency);
            if (best === undefined || amount < best) byCurrency.set(q.currency, amount);
          }
          const [lowCurrency, lowAmount] = [...byCurrency.entries()][0] ?? [null, null];

          return (
            <li
              key={lead.id}
              className="rounded-2xl border bg-card p-5 sm:p-6 shadow-[var(--elev-xs)] transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--elev-md)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-caption text-muted-foreground">{lead.reference}</p>
                  <h2 className="mt-0.5 font-display text-heading-md">
                    {destinationName ?? tQuote('destinationAny')}
                  </h2>
                </div>

                {/* The headline fact, where the eye lands. A count of quotes is
                    the reason to open this; a status enum is not — but a closed
                    enquiry has to say so, and an operator who replied in prose
                    without a price has not sent "no reply". Hence the ladder
                    rather than a single quotes>0 test. */}
                {closed ? (
                  <Badge variant="listed">{t('statusClosed')}</Badge>
                ) : quotes.length > 0 ? (
                  <Badge variant="licence">{t('quotesIn', { count: quotes.length })}</Badge>
                ) : sent.length === 0 ? (
                  <Badge variant="listed">{t('statusNew')}</Badge>
                ) : awaiting > 0 ? (
                  <Badge variant="claimed">{t('awaiting', { count: awaiting })}</Badge>
                ) : (
                  <Badge variant="claimed">{t('statusInProgress')}</Badge>
                )}
              </div>

              {lowAmount !== null && lowCurrency && (
                <p className="mt-3 text-body-lg">
                  <span className="text-muted-foreground">{t('lowestQuote')} </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(lowAmount, lowCurrency, locale)}
                  </span>
                  {byCurrency.size > 1 && (
                    <span className="ml-2 text-body-sm text-muted-foreground">
                      {t('otherCurrencies', { count: byCurrency.size - 1 })}
                    </span>
                  )}
                </p>
              )}

              <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  <dt className="sr-only">{t('travelers')}</dt>
                  <dd className="tabular-nums">{lead.adults + lead.children}</dd>
                </div>

                {lead.travel_start && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden />
                    <dt className="sr-only">{tQuote('travelStart')}</dt>
                    <dd>
                      {format.dateTime(new Date(lead.travel_start), 'long')}
                      {lead.travel_end &&
                        ` – ${format.dateTime(new Date(lead.travel_end), 'long')}`}
                    </dd>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden />
                  <dt className="sr-only">{t('sent')}</dt>
                  <dd>{format.dateTime(new Date(lead.created_at), 'short')}</dd>
                </div>
              </dl>

              <Button asChild variant={quotes.length > 1 ? 'primary' : 'secondary'} className="mt-4">
                <Link
                  href={{ pathname: '/enquiry/[reference]', params: { reference: lead.reference } }}
                >
                  {/* Two or more quotes is the moment comparison is worth
                      anything, so the label says so rather than "open". */}
                  {quotes.length > 1 ? t('compareQuotes', { count: quotes.length }) : t('openConversations')}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
      </div>
    </>
  );
}
