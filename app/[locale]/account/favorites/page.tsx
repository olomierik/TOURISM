import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Heart } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessCardsByIds } from '@/lib/queries/businesses';
import { BusinessCard } from '@/components/cards/business-card';
import { Button } from '@/components/ui/button';

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
    .select('business_id, created_at')
    .not('business_id', 'is', null)
    .order('created_at', { ascending: false });

  // Resolved through the directory's own card query, so a saved listing always
  // shows its current name, rating and cover — and one that has since been
  // suspended drops out rather than rendering a card that goes nowhere.
  const cards = await getBusinessCardsByIds(
    (saved ?? []).map((r) => r.business_id).filter((id): id is string => Boolean(id)),
    locale,
  );

  return (
    <div className="container-page max-w-5xl py-section">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">{t('pageTitle')}</h1>
        <p className="mt-3 text-muted-foreground">{t('pageSubtitle')}</p>
      </div>

      {cards.length === 0 ? (
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}
    </div>
  );
}
