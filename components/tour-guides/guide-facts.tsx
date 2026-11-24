import { getTranslations } from 'next-intl/server';
import { BadgeCheck, Users } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { TourGuideProfile } from '@/lib/tour-guides/queries';

/** On a tour guide's listing: what a group organiser needs before asking. */
export async function GuideFacts({ guide }: { guide: TourGuideProfile }) {
  const t = await getTranslations('tourGuides');
  const rows: Array<[string, string]> = [
    [t('facts.kind'), t(`kind.${guide.guideKind}`)],
    [t('facts.languages'), guide.languages.map((l) => t(`language.${l}`)).join(', ')],
    [t('facts.areas'), [guide.city, ...guide.areas].filter(Boolean).join(', ')],
    [t('facts.groups'), guide.audiences.map((a) => t(`audience.${a}`)).join(', ')],
    [t('facts.specialties'), guide.specialties.map((s) => t(`specialty.${s}`)).join(', ')],
    [t('facts.dayRate'), guide.dayRate ? `${guide.dayRateCurrency} ${guide.dayRate.toLocaleString('en-US')}` : ''],
    [t('facts.maxGroup'), guide.maxGroup ? String(guide.maxGroup) : ''],
  ];
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Users className="size-5 text-primary" aria-hidden />
          {t('facts.title')}
        </h2>
        {guide.verificationStatus === 'verified' && (
          <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-caption font-medium text-success">
            <BadgeCheck className="size-3.5" aria-hidden />
            {t('facts.verified')}
          </span>
        )}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="text-body-sm">{v}</dd>
            </div>
          ))}
      </dl>
      <Link href="/group-trips" className="mt-4 inline-block text-body-sm font-semibold text-primary hover:underline">
        {t('facts.planGroup')}
      </Link>
    </section>
  );
}
