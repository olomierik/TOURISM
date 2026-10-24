import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';
import { ClaimForm } from '@/components/business/claim-form';
import { ClaimInvite } from '@/components/business/claim-invite';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getPathname, Link } from '@/i18n/navigation';
import { lookupInvite, type InviteLookup } from '@/lib/claims/invites';
import { maskEmail } from '@/lib/claims/mask';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

type Params = { locale: Locale; slug: string };

/**
 * Claiming a listing.
 *
 * Deliberately not in the sitemap and not indexable: it is a transactional page
 * reached from the listing it belongs to, and an indexed page inviting anyone to
 * claim any business is an invitation to exactly the wrong traffic.
 *
 * Dynamic rather than prerendered, because it reads the session to decide
 * whether to show the form or the sign-in prompt.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'claim' });

  const supabase = createPublicClient();
  const { data } = await supabase
    .from('businesses')
    .select('name')
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  return {
    title: t('title', { name: data?.name ?? '' }),
    robots: { index: false, follow: false },
  };
}

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const { locale, slug } = await params;
  const inviteParam = (await searchParams).invite;
  const token = typeof inviteParam === 'string' ? inviteParam : undefined;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, owner_id, city, email, website')
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  // An already-claimed listing has nothing to offer here. 404 rather than a
  // message: the page has no purpose once an owner exists.
  if (!business || business.owner_id) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const t = await getTranslations('claim');
  const tNav = await getTranslations('nav');
  const tInvite = await getTranslations('claimInvite');

  // A link from the outreach email. Valid, it replaces the form; spent or
  // expired, the page says so and the ordinary routes stay open.
  const invite: InviteLookup | null = token ? await lookupInvite(business.id, token) : null;
  const usedByMe = invite?.status === 'used' && Boolean(user) && invite.usedBy === user?.id;
  const next = `${getPathname({ href: { pathname: '/business/[slug]/claim', params: { slug: business.slug } }, locale })}?invite=${token}`;

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: 'Explore Tanzania', href: '/' },
          { label: tNav('directory'), href: '/directory' },
          {
            label: business.name,
            href: { pathname: '/business/[slug]', params: { slug: business.slug } },
          },
          { label: t('claimCta') },
        ]}
      />

      <div className="mx-auto mt-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          {t('title', { name: business.name })}
        </h1>
        {/* The intro asks for evidence; a working claim link replaces that. */}
        {invite?.status !== 'valid' && !usedByMe && (
          <p className="mt-4 leading-relaxed text-muted-foreground">{t('intro')}</p>
        )}

        <div className="mt-8 space-y-6">
          {invite?.status === 'valid' && token ? (
            <ClaimInvite
              businessId={business.id}
              businessName={business.name}
              token={token}
              sentTo={maskEmail(invite.email)}
              signedIn={Boolean(user)}
              next={next}
            />
          ) : usedByMe ? (
            // Also what the page re-renders to straight after the button: the
            // action spends the link, and the refreshed page sees it spent.
            <Alert>
              <Check className="size-4" aria-hidden />
              <AlertDescription>
                <strong className="block">{tInvite('doneTitle', { business: business.name })}</strong>
                {tInvite('doneBody')}
                <span className="mt-2 block">
                  <Link href="/account" className="font-medium underline underline-offset-4">
                    {tInvite('doneLink')}
                  </Link>
                </span>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {invite && (
                <Alert>
                  <AlertDescription>
                    {tInvite(
                      invite.status === 'expired'
                        ? 'expiredNotice'
                        : invite.status === 'used'
                          ? 'usedNotice'
                          : 'invalidNotice',
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <ClaimForm
                businessId={business.id}
                businessName={business.name}
                signedIn={Boolean(user)}
                hasPublishedContact={Boolean(business.email || business.website)}
                defaultName={profile?.full_name}
                defaultEmail={profile?.email ?? user?.email}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
