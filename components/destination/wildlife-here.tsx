import { getTranslations } from 'next-intl/server';
import { PawPrint } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { SPECIES, toCard } from '@/lib/wildlife/species';
import { speciesAt } from '@/lib/wildlife/places';
import { Section } from '@/components/layout/section';
import { Rail } from '@/components/ui/rail';
import { SpeciesCard } from '@/components/wildlife/species-card';

/**
 * The animals recorded in this destination.
 *
 * The other half of the link the wildlife guide now makes. Each species profile
 * names the parks it is found in, so the directory already knows that the
 * Serengeti has 91 of them and Samburu 14 — it just had no way to answer the
 * question from this side. A traveller reading about Samburu could not find out
 * that it is where the Grévy's zebra, the reticulated giraffe and the vulturine
 * guineafowl are, and the 46 destination pages shared a layout with nothing on
 * it that was specific to the place.
 *
 * Derived from the profiles rather than stored, so it cannot contradict them:
 * the list here and the sentence on the species page are the same sentence.
 *
 * Rarest first. A page that opens with the elephant and the zebra tells a
 * reader what they already assumed; one that opens with what is unusual here
 * tells them why to come to this park rather than the next one.
 */
const RARITY_ORDER = { rare: 0, uncommon: 1, common: 2 } as const;

export async function WildlifeHere({
  destinationSlug,
  destinationName,
  locale,
}: {
  destinationSlug: string;
  destinationName: string;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: 'destination' });

  const here = speciesAt(SPECIES, destinationSlug);
  if (here.length === 0) return null;

  const sorted = [...here].sort(
    (a, b) =>
      Number(b.bigFive) - Number(a.bigFive) ||
      RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] ||
      a.name.localeCompare(b.name),
  );

  // A rail, not a grid: several destinations have ninety species and a wall of
  // them would bury everything below it.
  const shown = sorted.slice(0, 24);

  return (
    <Section
      id="wildlife"
      title={t('wildlifeHere', { name: destinationName })}
      subtitle={t('wildlifeHereIntro', { count: here.length })}
    >
      <Rail label={t('wildlifeHere', { name: destinationName })} itemClassName="w-[12rem]">
        {shown.map((s) => (
          <SpeciesCard key={s.slug} species={toCard(s)} />
        ))}
      </Rail>

      <p className="mt-5">
        <Link
          href="/wildlife"
          className="inline-flex items-center gap-2 text-body-sm font-semibold text-primary hover:underline"
        >
          <PawPrint className="size-4" aria-hidden />
          {t('wildlifeHereAll')}
        </Link>
      </p>
    </Section>
  );
}
