import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, BedDouble, CalendarDays, MapPin, MessageCircle, Users } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { absoluteUrl } from '@/lib/seo';
import { formatMoney } from '@/lib/leads/quote-types';
import { getDepartureBySlug } from '@/lib/group-trips/departures';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { JoinForm } from '@/components/group-trips/join-form';

type Params = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = await getDepartureBySlug(slug);
  if (!d) return {};
  const t = await getTranslations({ locale, namespace: 'groupTrips.join' });
  return {
    title: t('metaTitle', { title: d.title }),
    description: d.summary ?? t('metaDescription', { title: d.title, guide: d.guide.name }),
    robots: d.status === 'open' ? undefined : { index: false, follow: true },
  };
}

/** One open group trip: the plan, the price per person, seats left, and joining. */
export default async function DeparturePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getDepartureBySlug(slug);
  if (!d || d.status === 'draft' || d.status === 'cancelled') notFound();
  const [t, tG, tNav, format] = await Promise.all([
    getTranslations('groupTrips.join'),
    getTranslations('tourGuides'),
    getTranslations('groupTrips'),
    getFormatter(),
  ]);
  const date = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: 'long' });
  const today = new Date().toISOString().slice(0, 10);
  const open = d.status === 'open' && d.startDate >= today;
  const url = absoluteUrl(getPathname({ href: { pathname: '/group-trips/[slug]', params: { slug } }, locale }));
  // Members (the guide, booked travellers) get a way into the trip's chat.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: member } = user ? await supabase.rpc('is_departure_member', { p_departure: d.id }) : { data: false };
  const share = `https://wa.me/?text=${encodeURIComponent(t('shareText', { title: d.title, url }))}`;

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs
        locale={locale}
        items={[{ label: 'Explore Tanzania', href: '/' }, { label: tNav('crumb'), href: '/group-trips' }, { label: d.title }]}
      />
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <header>
            <p className="flex items-center gap-1.5 text-body-sm font-semibold text-primary">
              <CalendarDays className="size-4" aria-hidden />
              {date(d.startDate)} – {date(d.endDate)} · {t('days', { count: d.days })}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">{d.title}</h1>
            {d.summary && <p className="mt-2 text-muted-foreground">{d.summary}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
              {d.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden />
                  {d.region}
                </span>
              )}
              {d.stay && (
                <span className="flex items-center gap-1">
                  <BedDouble className="size-4" aria-hidden />
                  {d.stay}
                </span>
              )}
              <Link href={{ pathname: '/business/[slug]', params: { slug: d.guide.slug } }} className="flex items-center gap-1 font-medium hover:text-primary">
                {d.guide.verified && <BadgeCheck className="size-4 text-success" aria-hidden />}
                {t('withGuide', { name: d.guide.name })}
              </Link>
            </div>
          </header>

          {/* Phones: the price and the way to join, before the plan. */}
          <a
            href="#join-form"
            className="press flex items-center justify-between gap-3 rounded-2xl border bg-primary-subtle p-3 lg:hidden"
          >
            <span>
              <span className="text-lg font-bold tabular-nums">{formatMoney(d.pricePerPerson, d.currency, locale)}</span>{' '}
              <span className="text-caption">{t('perPerson')}</span>
              <span className="block text-caption text-muted-foreground">
                {d.seatsLeft === 0 ? t('full') : t('seatsOf', { left: d.seatsLeft, total: d.seatsTotal })}
              </span>
            </span>
            {open && <span className="rounded-full bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground">{t('formTitle')}</span>}
          </a>

          {(d.arrivalPoint || d.departurePoint) && (
            <p className="rounded-xl bg-muted p-3 text-body-sm">
              {d.arrivalPoint && <span>{t('meet', { place: d.arrivalPoint })} </span>}
              {d.departurePoint && <span>{t('end', { place: d.departurePoint })}</span>}
            </p>
          )}

          {d.itinerary.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">{t('planTitle')}</h2>
              <ol className="mt-3 space-y-3">
                {d.itinerary.map((day) => (
                  <li key={day.day} className="rounded-xl border bg-card p-3">
                    <p className="font-semibold">
                      {t('dayN', { n: day.day })}
                      {(day.from || day.to) && ` · ${[day.from, day.to].filter(Boolean).join(' → ')}`}
                    </p>
                    {day.plan && <p className="mt-1 whitespace-pre-line text-body-sm text-muted-foreground">{day.plan}</p>}
                    {(day.overnight || day.meals) && (
                      <p className="mt-1 text-caption text-muted-foreground">
                        {[day.overnight ? t('overnight', { place: day.overnight }) : null, day.meals ? t('meals', { meals: day.meals }) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            {d.includes && (
              <div className="rounded-xl border bg-card p-3">
                <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t('includes')}</p>
                <p className="mt-1 whitespace-pre-line text-body-sm">{d.includes}</p>
              </div>
            )}
            {d.excludes && (
              <div className="rounded-xl border bg-card p-3">
                <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t('excludes')}</p>
                <p className="mt-1 whitespace-pre-line text-body-sm">{d.excludes}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <div className="rounded-2xl border bg-primary-subtle p-4">
            <p className="text-3xl font-bold tabular-nums">{formatMoney(d.pricePerPerson, d.currency, locale)}</p>
            <p className="text-body-sm">{t('perPersonAll', { days: d.days })}</p>
            <p className="mt-3 flex items-center gap-1.5 text-body-sm font-semibold">
              <Users className="size-4" aria-hidden />
              {d.seatsLeft === 0 ? t('full') : t('seatsOf', { left: d.seatsLeft, total: d.seatsTotal })}
            </p>
            {d.minGroup && <p className="mt-1 text-caption text-muted-foreground">{t('minGroup', { count: d.minGroup })}</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              {d.audiences.map((a) => (
                <span key={a} className="rounded-full bg-card px-2 py-0.5 text-caption">
                  {tG(`audience.${a as 'church'}`)}
                </span>
              ))}
            </div>
            <a
              href={share}
              target="_blank"
              rel="noopener noreferrer"
              className="press mt-3 flex items-center justify-center gap-1.5 rounded-full border border-[#25D366]/50 bg-[#25D366]/10 px-4 py-2 text-body-sm font-semibold"
            >
              <MessageCircle className="size-4" aria-hidden />
              {t('share')}
            </a>
            {member && (
              <Link
                href={{ pathname: '/group-trips/[slug]/chat', params: { slug } }}
                className="press mt-2 flex items-center justify-center rounded-full bg-primary px-4 py-2 text-body-sm font-semibold text-primary-foreground"
              >
                {t('openChat')}
              </Link>
            )}
          </div>
          <div id="join-form" className="scroll-mt-[calc(var(--header-h)+1rem)]">
            {open ? <JoinForm departureId={d.id} seatsLeft={d.seatsLeft} /> : <p className="rounded-2xl border p-4 text-body-sm">{t('closed')}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
