import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ExternalLink, FileText, UserCheck } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { adminListGuides } from '@/lib/tour-guides/queries';
import { Badge } from '@/components/ui/badge';
import { GuideDecision } from '@/components/admin/guide-decision';

/**
 * Local tour guides and their verification documents.
 *
 * The owner's rule (24 Nov 2026): an ID, a photo, and a letter from the Ward
 * Executive Officer or a passport. Documents sit in a private bucket; the
 * links below are signed for ten minutes, made fresh on each load. Waiting
 * guides first.
 */
export default async function AdminTourGuidesPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [guides, t] = await Promise.all([adminListGuides(), getTranslations('tourGuides')]);
  const waiting = guides.filter((g) => g.verificationStatus === 'submitted').length;

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <UserCheck className="size-6 text-primary" aria-hidden />
        Tour guides
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {waiting} waiting for verification · {guides.length} in all. Check that the ID and the photo are the same
        person, and that the WEO letter or passport names them. Verifying publishes the listing and emails the guide.
      </p>

      <div className="mt-6 space-y-4">
        {guides.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No tour guides yet.</p>
        )}
        {guides.map((g) => (
          <article key={g.businessId} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  <Link href={{ pathname: '/business/[slug]', params: { slug: g.slug } }} className="hover:text-primary">
                    {g.name}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(`kind.${g.guideKind}`)}
                  {g.licenceNumber ? ` · ${g.licenceNumber}` : ''} · {g.city ?? '—'} · {g.phone ?? '—'}
                  {g.email ? ` · ${g.email}` : ''}
                </p>
              </div>
              <Badge variant={g.verificationStatus === 'verified' ? 'verified' : 'outline'}>{t(`status.${g.verificationStatus}`)}</Badge>
            </div>
            <p className="mt-2 text-sm">
              {[g.languages.map((l) => t(`language.${l}`)).join(', '), g.areas.join(', '), g.audiences.map((a) => t(`audience.${a}`)).join(', ')]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.documents.length === 0 && <span className="text-sm text-muted-foreground">No documents uploaded yet.</span>}
              {g.documents.map((d) =>
                d.url ? (
                  <a
                    key={d.kind}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex w-36 flex-col overflow-hidden rounded-xl border text-sm hover:border-primary"
                  >
                    {d.isPdf ? (
                      <span className="flex h-24 items-center justify-center bg-muted">
                        <FileText className="size-8 text-muted-foreground" aria-hidden />
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private URL
                      <img src={d.url} alt="" className="h-24 w-full object-cover" />
                    )}
                    <span className="flex items-center justify-between gap-1 px-2 py-1.5">
                      {t(`verify.doc.${d.kind}`)}
                      <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                    </span>
                  </a>
                ) : null,
              )}
            </div>
            {g.verificationNote && <p className="mt-2 text-xs text-muted-foreground">Last note: {g.verificationNote}</p>}
            <div className="mt-3 max-w-xl">
              <GuideDecision businessId={g.businessId} status={g.verificationStatus} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
