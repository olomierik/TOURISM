import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getAdminGuides } from '@/lib/queries/admin';
import { GuideActions } from '@/components/admin/moderation-actions';
import { Badge } from '@/components/ui/badge';
import { locales } from '@/i18n/routing';

const STATUS_LABEL = {
  draft: 'guideDraft',
  published: 'guidePublished',
  archived: 'guideArchived',
} as const;

export default async function AdminGuidesPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [guides, t] = await Promise.all([getAdminGuides(locale), getTranslations('admin')]);

  return (
    <ul className="space-y-3">
      {guides.map((g) => (
        <li key={g.id} className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={g.status === 'published' ? 'verified' : 'secondary'}>
                  {t(STATUS_LABEL[g.status])}
                </Badge>
                {g.allowAds && <Badge variant="secondary">{t('guideAds')}</Badge>}
              </div>

              <h2 className="mt-2 font-display text-lg font-semibold">
                {g.status === 'published' && g.slug ? (
                  <Link
                    href={{ pathname: '/guides/[slug]', params: { slug: g.slug } }}
                    className="hover:text-primary"
                  >
                    {g.title}
                  </Link>
                ) : (
                  g.title
                )}
              </h2>

              {/* Which locales this guide actually exists in. A missing
                  translation means hreflang would point at a 404, so the gap is
                  surfaced here rather than discovered in Search Console. */}
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <span>{t('guideLocales')}:</span>
                {locales.map((l) => (
                  <span
                    key={l}
                    className={
                      g.translatedLocales.includes(l)
                        ? 'rounded bg-success/12 px-1.5 py-0.5 text-xs uppercase text-success'
                        : 'rounded bg-muted px-1.5 py-0.5 text-xs uppercase text-muted-foreground line-through'
                    }
                  >
                    {l}
                  </span>
                ))}
              </p>
            </div>

            <GuideActions guideId={g.id} status={g.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
