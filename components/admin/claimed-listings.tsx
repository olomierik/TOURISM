'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, ImageOff } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BusinessActions } from '@/components/admin/business-actions';
import type { Enums } from '@/lib/supabase/database.types';

export type ClaimedListing = {
  id: string;
  slug: string;
  name: string;
  status: Enums<'business_status'>;
  tier: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  city: string | null;
  countryCode: string | null;
  claimedAt: string;
  hasCover: boolean;
  photoCount: number;
  ownerEmail: string | null;
  ownerName: string | null;
};

/**
 * Claimed listings, across every country, waiting on verification.
 *
 * The country filter is a filter and not four separate pages on purpose. The
 * question an admin has here is "who is waiting on me", and that question does
 * not stop at a border — Kenya has more claims than Tanzania does. All
 * countries is the default view; the per-country tabs exist for when somebody
 * is working through one market's licence register.
 *
 * Verification is the same action as on the businesses page, imported rather
 * than reimplemented: one definition of what the verify button does, and an
 * audit entry either way.
 */
export function ClaimedListings({
  listings,
  locale,
}: {
  listings: ClaimedListing[];
  locale: string;
}) {
  const t = useTranslations('admin.claimsPage');
  const [country, setCountry] = useState<string>('all');

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      const key = l.countryCode ?? '??';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [listings]);

  const shown = country === 'all' ? listings : listings.filter((l) => l.countryCode === country);
  const unverified = listings.filter((l) => !l.isVerified).length;

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{t('claimedTitle')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('claimedHint')}</p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {t('claimedCount', { total: listings.length, unverified })}
        </p>
      </div>

      {countries.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={country === 'all' ? 'secondary' : 'ghost'}
            onClick={() => setCountry('all')}
          >
            {t('allCountries')} <span className="tabular-nums">{listings.length}</span>
          </Button>
          {countries.map(([code, count]) => (
            <Button
              key={code}
              size="sm"
              variant={country === code ? 'secondary' : 'ghost'}
              onClick={() => setCountry(code)}
            >
              {code} <span className="tabular-nums">{count}</span>
            </Button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('claimedEmpty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((l) => (
            <li key={l.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={{ pathname: '/business/[slug]', params: { slug: l.slug } }}
                      className="font-medium hover:underline"
                    >
                      {l.name}
                    </Link>
                    {l.isVerified ? (
                      <Badge variant="licence" className="gap-1">
                        <BadgeCheck className="size-3.5" aria-hidden />
                        {t('verifiedLabel')}
                      </Badge>
                    ) : (
                      <Badge variant="listed">{t('unverifiedLabel')}</Badge>
                    )}
                    {/* An owner who arrives to an empty page does not come back,
                        so this sits next to the verification state rather than
                        somewhere an admin has to go looking for it. */}
                    {!l.hasCover && (
                      <Badge variant="listed" className="gap-1 text-warning-foreground">
                        <ImageOff className="size-3.5" aria-hidden />
                        {t('noPhoto')}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[l.city, l.countryCode].filter(Boolean).join(', ')}
                    {' · '}
                    {t('claimedOn', { date: date(l.claimedAt) })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {l.ownerName ?? l.ownerEmail ?? '—'}
                    {l.ownerName && l.ownerEmail ? ` · ${l.ownerEmail}` : ''}
                  </p>
                </div>

                {/* A listing the owner has not submitted yet has nothing for an
                    admin to decide, and `BusinessActions` correctly renders no
                    buttons for it. Saying so beats an empty space that reads
                    like a broken row. */}
                {l.status === 'draft' ? (
                  <p className="text-sm text-muted-foreground">{t('draftWithOwner')}</p>
                ) : (
                  <BusinessActions businessId={l.id} status={l.status} isVerified={l.isVerified} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
