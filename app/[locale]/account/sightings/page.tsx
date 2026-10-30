import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { BookOpen, MapPin, PawPrint, Trash2 } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { SPECIES, BIG_FIVE, getSpecies } from '@/lib/wildlife/species';
import { computeAchievements } from '@/lib/wildlife/achievements';
import { getMySightings } from '@/lib/wildlife/sightings';
import { deleteSighting } from '@/lib/wildlife/actions';
import { PageMasthead } from '@/components/layout/page-masthead';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AchievementGrid } from '@/components/wildlife/achievement-grid';
import { SightingForm } from '@/components/wildlife/sighting-form';
import { SightingsMap, type SightingPoint } from '@/components/wildlife/sightings-map';
import { ShareListButton } from '@/components/wildlife/share-list-button';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'wildlife.diary' });
  return { title: t('pageTitle'), robots: { index: false, follow: false } };
}

/** The traveller's safari diary: badges, a map of where, and every sighting. */
export default async function SightingsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { user, sightings } = await getMySightings();
  // The proxy already gates /account; this narrows the type.
  if (!user) redirect('/login');

  const [t, format] = await Promise.all([getTranslations('wildlife'), getFormatter()]);

  const known = sightings.filter((s) => getSpecies(s.species_slug));
  const slugs = [...new Set(known.map((s) => s.species_slug))];
  const achievements = computeAchievements(slugs, SPECIES);
  const bigFiveSeen = BIG_FIVE.filter((s) => slugs.includes(s.slug)).length;
  const earned = achievements.filter((a) => a.done).length;

  const dateOf = (d: string) =>
    format.dateTime(new Date(`${d}T12:00:00Z`), { day: 'numeric', month: 'short', year: 'numeric' });

  const points: SightingPoint[] = known
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({
      id: s.id,
      lat: s.lat as number,
      lng: s.lng as number,
      name: getSpecies(s.species_slug)!.name,
      date: dateOf(s.seen_on),
      place: s.place_name,
    }));

  const options = [...SPECIES]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({ slug: s.slug, name: s.name }));

  const stats = [
    { label: t('diary.statSightings'), value: known.length },
    { label: t('diary.statSpecies'), value: `${slugs.length}/${SPECIES.length}` },
    { label: t('diary.statBigFive'), value: `${bigFiveSeen}/${BIG_FIVE.length}` },
    { label: t('diary.statBadges'), value: `${earned}/${achievements.length}` },
  ];

  return (
    <>
      <PageMasthead
        title={t('diary.title')}
        subtitle={t('diary.lead')}
        aside={
          slugs.length > 0 ? (
            <ShareListButton
              text={t('diary.shareText', { count: slugs.length, bigFive: bigFiveSeen })}
              path={getPathname({ href: '/wildlife', locale })}
              label={t('diary.share')}
              copiedLabel={t('diary.copied')}
            />
          ) : undefined
        }
      />

      <div className="container-page space-y-12 py-10">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card-surface p-4">
              <dt className="text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </dt>
              <dd className="mt-1 font-display text-heading-xl font-semibold lining-nums tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="achievements">
          <h2 id="achievements" className="font-display text-heading-lg font-semibold">
            {t('diary.achievements')}
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">{t('diary.achievementsLead')}</p>
          <div className="mt-5">
            <AchievementGrid achievements={achievements} />
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="map">
              <h2 id="map" className="font-display text-heading-lg font-semibold">
                {t('diary.map')}
              </h2>
              <div className="mt-4">
                {points.length > 0 ? (
                  <SightingsMap points={points} label={t('diary.map')} />
                ) : (
                  <p className="flex items-center gap-2 rounded-lg border border-dashed bg-surface p-5 text-body-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    {t('diary.mapEmpty')}
                  </p>
                )}
              </div>
            </section>

            <section aria-labelledby="list">
              <h2 id="list" className="font-display text-heading-lg font-semibold">
                {t('diary.list')}
              </h2>
              {known.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  icon={BookOpen}
                  title={t('diary.empty')}
                  help={t('diary.emptyBody')}
                  action={
                    <Button asChild>
                      <Link href="/wildlife">{t('diary.browse')}</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="mt-4 space-y-3">
                  {known.map((row) => {
                    const sp = getSpecies(row.species_slug)!;
                    const thumb = row.photo_url ?? sp.image?.url.replace(/\/1280px-/, '/250px-');
                    return (
                      <li key={row.id} className="card-surface flex gap-4 p-3 sm:p-4">
                        <Link
                          href={{ pathname: '/wildlife/[slug]', params: { slug: sp.slug } }}
                          className="relative size-20 shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:size-24"
                        >
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={sp.name}
                              fill
                              sizes="96px"
                              quality={60}
                              unoptimized={!row.photo_url}
                              className="object-cover"
                            />
                          ) : (
                            <PawPrint className="m-auto size-8 text-muted-foreground" aria-hidden />
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={{ pathname: '/wildlife/[slug]', params: { slug: sp.slug } }}
                                className="font-display text-heading-sm font-semibold hover:underline"
                              >
                                {sp.name}
                              </Link>
                              <p className="text-body-sm text-muted-foreground">
                                {dateOf(row.seen_on)}
                                {' · '}
                                {row.place_name ?? t('diary.noPlace')}
                              </p>
                            </div>
                            <form action={deleteSighting}>
                              <input type="hidden" name="id" value={row.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                aria-label={t('diary.deleteLabel', { name: sp.name })}
                              >
                                <Trash2 className="size-4" aria-hidden />
                                <span className="hidden sm:inline">{t('diary.delete')}</span>
                              </Button>
                            </form>
                          </div>
                          {row.notes && (
                            <p className="mt-2 line-clamp-3 text-body-sm text-foreground">{row.notes}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card-surface p-5 sm:p-6">
              <h2 className="font-display text-heading-md font-semibold">{t('diary.logAnother')}</h2>
              <div className="mt-5">
                <SightingForm options={options} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
