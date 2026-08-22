import { getTranslations } from 'next-intl/server';
import { ArrowRight, Hammer } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Honest placeholder for routes whose content arrives in a later phase.
 *
 * The spec forbids links that look functional but do nothing — so rather than
 * leaving the nav pointing at 404s, every route resolves to a real page that
 * says plainly what is happening and routes the visitor to the one action that
 * does work today. Replaced wholesale as each section is built.
 */
export async function SectionInProgress({ section }: { section: string }) {
  const t = await getTranslations('inProgress');

  return (
    <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-section text-center">
      <Badge variant="secondary" className="gap-1.5 px-3 py-1">
        <Hammer className="size-3" aria-hidden />
        {t('badge')}
      </Badge>

      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">{t('title')}</h1>

      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
        {t('body', { section })}
      </p>

      <Button asChild size="lg" className="mt-9">
        <Link href="/request-quote">
          {t('cta')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
