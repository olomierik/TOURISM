import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { LocationReviewedButton } from '@/components/admin/verification-form';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return { title: 'Verification', robots: { index: false, follow: false } };
}

/**
 * Two queues for SEO brief T14:
 *
 *   Address to check  the address names a country outside East Africa, or
 *                     the pin is outside it (migration 093 flags these by
 *                     trigger). The public map stays hidden until someone
 *                     confirms or corrects it.
 *   Verified          what was checked for each verified listing, so the
 *                     public "Verified" chip can be audited.
 *
 * Recording checks happens on each listing's admin page.
 */
export default async function AdminVerificationPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const [{ data: flagged }, { data: verified }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, slug, address, country_code, location_flag')
      .not('location_flag', 'is', null)
      .is('location_reviewed_at', null)
      .is('deleted_at', null)
      .order('name')
      .limit(200),
    supabase
      .from('businesses')
      .select('id, name, verified_at, license_checked_at, registration_checked_at, identity_checked_at')
      .eq('is_verified', true)
      .is('deleted_at', null)
      .order('verified_at', { ascending: false, nullsFirst: false })
      .limit(200),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-heading-xl">Verification</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Record licence, registration and identity checks on each listing&rsquo;s admin page. The public
          &ldquo;Verified&rdquo; chip lists exactly those checks.
        </p>
      </div>

      <section>
        <h2 className="font-display text-heading-md font-semibold">Address to check ({flagged?.length ?? 0})</h2>
        <p className="mt-1 text-body-sm text-muted-foreground">Their public map is hidden until checked.</p>
        {(flagged ?? []).length === 0 ? (
          <p className="mt-4 text-muted-foreground">Nothing to check.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-lg border bg-surface">
            {(flagged ?? []).map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={{ pathname: '/admin/businesses/[id]', params: { id: b.id } }} className="font-semibold hover:text-primary">
                    {b.name}
                  </Link>
                  <p className="text-body-sm text-muted-foreground">
                    {b.location_flag} · {b.address ?? 'no address'} · listed as {b.country_code}
                  </p>
                </div>
                <LocationReviewedButton businessId={b.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-heading-md font-semibold">Verified ({verified?.length ?? 0})</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[36rem] text-left text-body-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_th]:bg-surface-muted [&_th]:px-3 [&_th]:py-2">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Licence</th>
                <th>Registration</th>
                <th>Identity</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(verified ?? []).map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={{ pathname: '/admin/businesses/[id]', params: { id: b.id } }} className="hover:text-primary">
                      {b.name}
                    </Link>
                  </td>
                  <td>{b.license_checked_at?.slice(0, 10) ?? '—'}</td>
                  <td>{b.registration_checked_at?.slice(0, 10) ?? '—'}</td>
                  <td>{b.identity_checked_at?.slice(0, 10) ?? '—'}</td>
                  <td>{b.verified_at?.slice(0, 10) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
