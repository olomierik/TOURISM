import { getTranslations } from 'next-intl/server';
import { Compass } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('common');

  return (
    <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-section text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary">
        <Compass className="size-8 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-8 font-display text-6xl font-semibold text-muted-foreground/40">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{t('notFound')}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">{t('notFoundHelp')}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">{t('backHome')}</Link>
      </Button>
    </div>
  );
}
