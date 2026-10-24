import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { MessagesSquare, Star } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getEnquiryThreads } from '@/lib/queries/enquiry-thread';
import { Thread } from '@/components/messages/thread';
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

      <div className="mt-8 space-y-6">
        {enquiry.threads.map((th) => {
          const unread = th.messages.filter((m) => m.sender === 'operator' && !m.readAt).length;
          return (
            <section key={th.id} className="rounded-2xl border bg-card p-4 sm:p-5">
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
