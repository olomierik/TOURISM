import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Heart } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessCardsByIds } from '@/lib/queries/businesses';
import { getPackageCardsByIds } from '@/lib/queries/packages';
import { BusinessCard } from '@/components/cards/business-card';
import { PackageCard } from '@/components/cards/package-card';
import type { Locale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { MAX_CHOSEN } from '@/lib/leads/quote-types';
import { PageMasthead } from '@/components/layout/page-masthead';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'favorites' });
  return { title: t('pageTitle'), robots: { index: false, follow: false } };
}

/**
 * What a traveler has saved.
 *
 * The save button has existed on business and package cards since the lead
 * engine went in, writing rows nothing ever read back — a control that appeared
 * to do something and then led nowhere. This is the other half of it.
 */
export default async function FavoritesPage({
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

  // The proxy already gates /account; this narrows the type and is defence in
  // depth rather than the primary check.
  if (!user) redirect('/login');

  const t = await getTranslations('favorites');

  // RLS restricts favorites to the caller's own rows, so no profile filter is
  // repeated here.
  const { data: saved } = await supabase
    .from('favorites')
    .select('business_id, package_id, created_at')
    .order('created_at', { ascending: false });

  // Resolved through the directory's own card query, so a saved listing always
  // shows its current name, rating and cover — and one that has since been
  // suspended drops out rather than rendering a card that goes nowhere.
  const [cards, trips] = await Promise.all([
    getBusinessCardsByIds(
      (saved ?? []).map((r) => r.business_id).filter((id): id is string => Boolean(id)),
      locale,
    ),
    // Trips saved from package cards, as Viator's wishlist keeps tours.
    getPackageCardsByIds(
      (saved ?? []).map((r) => r.package_id).filter((id): id is string => Boolean(id)),
      locale as Locale,
    ),
  ]);

  // §7.14: "When ≥ 2 are saved, a sticky bar offers 'Ask all {n} for a quote'".
  // The page subtitle has promised this since the Saved list shipped — "compare
  // them, then send one enquiry to all of them" — with no control anywhere that
  // did it. Capped at what the action will accept, so the bar never offers to
  // ask six and quietly ask fewer.
  const askable = cards.slice(0, MAX_CHOSEN);

  return (
    <>
      <PageMasthead
        containerClassName="max-w-5xl"
        title={t('pageTitle')}
        subtitle={t('pageSubtitle')}
      />
      <div className="container-page max-w-5xl py-10 sm:py-12">

      {cards.length === 0 && trips.length === 0 ? (
        <div className="flex min-h-[40svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
            <Heart className="size-7 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="mt-6 text-xl font-semibold">{t('empty')}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('emptyBody')}
          </p>
          <Button asChild className="mt-6">
            <Link href="/directory">{t('emptyCta')}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {trips.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">{t('sectionTrips')}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {trips.map((p) => (
                  <PackageCard key={p.id} pkg={p} locale={locale as Locale} />
                ))}
              </div>
            </section>
          )}
          {cards.length > 0 && (
            <section>
              {trips.length > 0 && (
                <h2 className="mb-4 text-xl font-semibold">{t('sectionOperators')}</h2>
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {askable.length >= 2 && (
        <>
          {/* Sticky, so it is still reachable after scrolling thirty cards.
              Lifted clear of MobileTabBar, which is fixed at the foot of the
              screen at h-16 plus the safe-area inset — and which hides at
              `md`, not `sm`, so the drop to a normal offset has to happen at
              the same breakpoint or the two overlap on a tablet. */}
          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-20 mt-10 md:bottom-6">
            <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface/95 p-3 pl-4 shadow-[var(--elev-md)] backdrop-blur">
              <p className="text-body-sm text-muted-foreground">
                {t('askAllHint', { count: askable.length })}
              </p>
              <Button asChild>
                <Link
                  href={{
                    pathname: '/request-quote',
                    query: { business: askable.map((b) => b.slug) },
                  }}
                >
                  {t('askAll', { count: askable.length })}
                </Link>
              </Button>
            </div>
          </div>
          {cards.length > MAX_CHOSEN && (
            <p className="mt-3 text-center text-caption text-muted-foreground">
              {t('askAllCapped', { count: MAX_CHOSEN })}
            </p>
          )}
        </>
      )}
      </div>
    </>
  );
}
