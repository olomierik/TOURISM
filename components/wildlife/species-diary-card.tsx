'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { SightingForm } from '@/components/wildlife/sighting-form';
import { useMySightings } from '@/components/wildlife/use-my-sightings';

/**
 * The diary panel on a species profile: how often this reader has seen the
 * animal, and the form to log another.
 *
 * In the browser rather than on the server for the usual reason — the answer
 * depends on the session, and a cookies() read would make every species page
 * dynamic. The profile itself is the part search engines want, and it no
 * longer pays for this panel.
 */
export function SpeciesDiaryCard({ species }: { species: { slug: string; name: string } }) {
  const t = useTranslations('wildlife');
  const { signedIn, countFor } = useMySightings();
  const seenHere = countFor(species.slug);

  return (
    <div className="card-surface p-5 sm:p-6">
      <h2 className="font-display text-heading-md font-semibold">{t('form.title')}</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {signedIn === true
          ? seenHere > 0
            ? t('profile.seenTimes', { count: seenHere })
            : t('profile.notSeen')
          : t('mySafari.signedOutBody')}
      </p>
      <div className="mt-5">
        {signedIn === true ? (
          <SightingForm species={species} />
        ) : (
          <Button asChild className="w-full" disabled={signedIn === undefined}>
            <Link href={{ pathname: '/login', query: { next: `/wildlife/${species.slug}` } }}>
              {t('form.signInToLog')}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
