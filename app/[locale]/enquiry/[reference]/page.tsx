import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { CalendarCheck, MessagesSquare, Star } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { DepositBox, type PaymentRow } from '@/components/messages/deposit-box';
import { formatMoney } from '@/lib/leads/quote-types';
import { getEnquiryThreads } from '@/lib/queries/enquiry-thread';
import { Thread } from '@/components/messages/thread';
import { QuoteComparison } from '@/components/messages/quote-comparison';
import { Button } from '@/components/ui/button';

type Params = Promise<{ locale: Locale; reference: string }>;
type Search = Promise<{ t?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, reference } = await params;
  const t = await getTranslations({ locale, namespace: 'enquiryThread' });
  return {
    title: t('metaTitle', { reference }),
    robots: { index: false, follow: false },
    // The link that opens this page carries the enquiry's key: never pass it on
    // to an operator's website through the Referer header.
    referrer: 'no-referrer',
  };
}

/**
 * A traveller's conversations about one enquiry: one thread per operator it
 * went to. Opened from "My enquiries", or from the link in the emails we send,
 * which also works for travellers who enquired without an account.
 */
export default async function EnquiryThreadPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, reference } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('enquiryThread');
  const format = await getFormatter();

  const enquiry = await getEnquiryThreads(reference, token);

  if (!enquiry) {
    return (
      <div className="container-page flex min-h-[50vh] max-w-xl flex-col items-center justify-center py-16 text-center">
        <MessagesSquare className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">{t('notFoundTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('notFoundBody')}</p>
        <Button asChild className="mt-6">
          <Link href="/login">{t('signIn')}</Link>
        </Button>
      </div>
    );
  }

  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const here = `${getPathname({ href: { pathname: '/enquiry/[reference]', params: { reference: enquiry.reference } }, locale })}${enquiry.token ? `?t=${enquiry.token}` : ''}`;
  const signInHref = `${getPathname({ href: '/login', locale })}?next=${encodeURIComponent(`${here}#quotes`)}`;
  const booked = enquiry.threads.find((th) => th.booking);

  // After BOOKED, for the signed-in traveller: where to pay a deposit, what
  // was reported, and the group trip chat if this was an open group trip.
  let deposit: { mobileMoney: string | null; currency: string; payments: PaymentRow[]; chatSlug: string | null } | null = null;
  if (booked && user) {
    const supabase = await createClient();
    const { data: row } = await supabase
      .from('bookings')
      .select('id, operator, quote, lead_id, booking_payments (id, amount, currency, method, reference, status, created_at), leads (group_departure_id, group_departures (slug))')
      .eq('reference', booked.booking!.reference)
      .maybeSingle();
    if (row) {
      const op = row.operator as { mobileMoney?: string | null };
      const q = row.quote as { currency?: string };
      const lead = (Array.isArray(row.leads) ? row.leads[0] : row.leads) as { group_departures?: { slug: string } | { slug: string }[] | null } | null;
      const dep = lead?.group_departures ? (Array.isArray(lead.group_departures) ? lead.group_departures[0] : lead.group_departures) : null;
      deposit = {
        mobileMoney: op.mobileMoney ?? null,
        currency: q.currency ?? 'USD',
        chatSlug: dep?.slug ?? null,
        payments: (row.booking_payments ?? []).map((p) => ({
          id: p.id,
          amount: formatMoney(Number(p.amount), p.currency, locale),
          method: p.method,
          reference: p.reference,
          status: p.status,
          date: format.dateTime(new Date(p.created_at), { dateStyle: 'medium' }),
        })),
      };
    }
  }

  return (
    <div className="container-page max-w-3xl py-section">
      <p className="text-sm font-medium text-muted-foreground">{enquiry.reference}</p>
      <h1 className="mt-1 text-3xl font-semibold">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">
        {t('subtitle', {
          date: format.dateTime(new Date(enquiry.createdAt), { dateStyle: 'medium' }),
          count: enquiry.threads.length,
        })}
      </p>

      {/* The reminder the owner asked for: agree a price, sign in, press
          BOOKED, and the trip document arrives by email. Shown until booked. */}
      {booked ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 p-4">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">
              {t('bookedBanner', { name: booked.business.name, reference: booked.booking!.reference })}
            </p>
            <a
              href={`/api/bookings/${booked.booking!.reference}/pdf`}
              target="_blank"
              rel="noopener"
              className="mt-1 inline-block font-semibold text-primary hover:underline"
            >
              {t('bookedPdf')}
            </a>
            {deposit?.chatSlug && (
              <Link
                href={{ pathname: '/group-trips/[slug]/chat', params: { slug: deposit.chatSlug } }}
                className="ms-4 inline-block font-semibold text-primary hover:underline"
              >
                {t('groupChat')}
              </Link>
            )}
            {deposit && (
              <DepositBox
                reference={booked.booking!.reference}
                mobileMoney={deposit.mobileMoney}
                currency={deposit.currency}
                payments={deposit.payments}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary-subtle p-4">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">{t('bookReminderTitle')}</p>
            <p className="mt-1">{t('bookReminderBody')}</p>
            {!user && (
              <a href={signInHref} className="mt-2 inline-block font-semibold text-primary hover:underline">
                {t('bookReminderSignIn')}
              </a>
            )}
          </div>
        </div>
      )}

      <QuoteComparison
        threads={enquiry.threads}
        locale={locale}
        reference={enquiry.reference}
        token={enquiry.token}
        signedIn={Boolean(user)}
        signInHref={signInHref}
      />

      <div className="mt-8 space-y-6">
        {enquiry.threads.map((th) => {
          const unread = th.messages.filter((m) => m.sender === 'operator' && !m.readAt).length;
          return (
            <section
              key={th.id}
              id={`thread-${th.id}`}
              className="scroll-mt-[calc(var(--header-h)+1rem)] rounded-2xl border bg-card p-4 sm:p-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  <Link
                    href={{ pathname: '/business/[slug]', params: { slug: th.business.slug } }}
                    className="hover:text-primary"
                  >
                    {th.business.name}
                  </Link>
                </h2>
                {th.reviewToken && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={{ pathname: '/review/[token]', params: { token: th.reviewToken } }}>
                      <Star className="size-3.5" aria-hidden />
                      {t('writeReview')}
                    </Link>
                  </Button>
                )}
                {unread > 0 && (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {t('unread', { count: unread })}
                  </span>
                )}
              </div>
              <Thread
                key={th.messages.length}
                leadBusinessId={th.id}
                viewer="traveler"
                otherName={th.business.name}
                initialMessages={th.messages}
                token={enquiry.token}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
