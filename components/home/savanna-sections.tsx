import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { BadgeCheck, CircleDollarSign, MessageCircle, Store } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { getSiteFacts } from '@/lib/queries/site-facts';
import type { DestinationSummary } from '@/lib/queries/taxonomy';
import type { Locale } from '@/i18n/routing';

/**
 * Homepage sections added by the Savanna Modern redesign (2026-10): the trust
 * strip under the hero, "how it works" on the sand band, and the quote banner.
 */

/** Four short facts, the first a live count, right under the hero. */
export async function TrustStrip({ locale }: { locale: Locale }) {
  const [facts, t] = await Promise.all([getSiteFacts(), getTranslations('home.trust')]);
  const n = new Intl.NumberFormat(locale);

  const items = [
    { Icon: Store, title: t('businesses', { count: n.format(facts.operators) }), body: t('businessesBody') },
    { Icon: CircleDollarSign, title: t('free'), body: t('freeBody') },
    { Icon: MessageCircle, title: t('whatsapp'), body: t('whatsappBody') },
    { Icon: BadgeCheck, title: t('verified'), body: t('verifiedBody') },
  ];

  return (
    <section aria-label={t('label')} className="border-b">
      {/* Two by two on a phone, titles only: four stacked rows with their
          second lines took 260px there, a third of the screen. */}
      <ul className="container-page grid grid-cols-2 gap-x-4 gap-y-4 py-5 sm:gap-x-8 sm:py-6 lg:grid-cols-4">
        {items.map(({ Icon, title, body }) => (
          <li key={title} className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-10">
              <Icon className="size-[1.125rem] sm:size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight sm:text-[15px]">{title}</span>
              <span className="mt-0.5 hidden text-sm text-muted-foreground sm:block">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One request, quotes from several operators: the three steps, on the sand band. */
export async function HowItWorks() {
  const t = await getTranslations('home.how');
  const steps = [
    { title: t('step1Title'), body: t('step1Body') },
    { title: t('step2Title'), body: t('step2Body') },
    { title: t('step3Title'), body: t('step3Body') },
  ];

  return (
    <section className="bg-sand">
      <div className="container-page py-16 sm:py-20">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent-strong">{t('eyebrow')}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{t('title')}</h2>
        <ol className="mt-9 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-3xl border border-sand-border bg-card p-7">
              <span
                className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-lg font-extrabold text-background"
                aria-hidden
              >
                {i + 1}
              </span>
              <h3 className="mt-5 text-xl font-extrabold tracking-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <Button asChild variant="accent" className="mt-8">
          <Link href="/request-quote">{t('cta')}</Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * The navy quote banner with a photograph: the homepage's last push before the
 * operator call and the newsletter. The photograph is Kilimanjaro's cover when
 * the destination list has one, else the banner is text alone.
 */
export async function QuoteBanner({ destinations }: { destinations: DestinationSummary[] }) {
  const t = await getTranslations('home.banner');
  const photo =
    destinations.find((d) => /kilimanjaro/i.test(d.key) || /kilimanjaro/i.test(d.slug))?.coverImageUrl ??
    destinations.find((d) => d.coverImageUrl)?.coverImageUrl ??
    null;

  return (
    <section className="container-page py-14 sm:py-16">
      <div className="flex flex-wrap overflow-hidden rounded-[2rem] bg-banner text-banner-foreground">
        <div className="flex-[1_1_26rem] p-8 sm:p-12 lg:p-14">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-banner-foreground/80">{t('body')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/request-quote">{t('primary')}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-banner-foreground/35 bg-transparent text-banner-foreground hover:bg-banner-foreground/10 hover:text-banner-foreground"
            >
              <Link href="/trip-cost">{t('secondary')}</Link>
            </Button>
          </div>
        </div>
        {photo && (
          <div className="relative min-h-64 flex-[1_1_22rem]">
            <Image src={photo} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" quality={65} className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
