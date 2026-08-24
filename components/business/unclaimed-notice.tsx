import { getTranslations } from 'next-intl/server';
import { BadgeCheck } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * Says out loud that a listing has no owner yet.
 *
 * Seeded listings are built from public licensing records without the operator's
 * involvement, and a visitor has every right to know that before reading contact
 * details as though the business wrote them. Saying so is also the only honest
 * way to run this: a directory that presents unverified compiled data as if it
 * were submitted is the thing operators are right to be angry about.
 *
 * It doubles as the acquisition surface. The person most likely to be looking at
 * an operator's page is that operator, and this is the moment to ask.
 */
export async function UnclaimedNotice({ slug }: { slug: string }) {
  const t = await getTranslations('claim');

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-[16rem] flex-1">
          <p className="font-semibold">{t('unclaimedTitle')}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t('unclaimedBody')}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href={{ pathname: '/business/[slug]/claim', params: { slug } }}>
            {t('claimCta')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
