import { getTranslations } from 'next-intl/server';
import { ArrowRight, Clock } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * The conversion moment. Repeated at the foot of every commercial page template —
 * the quote request is how the platform earns, so it never has to be hunted for.
 */
export async function QuoteCta() {
  const t = await getTranslations('home.cta');

  return (
    <section className="container-page py-section">
      <div className="relative isolate overflow-hidden rounded-3xl border bg-card px-6 py-14 shadow-sm sm:px-12 md:py-20">
        {/* Warm wash so the band reads as a distinct surface without a hard border */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(60% 80% at 15% 0%, var(--primary) 0%, transparent 60%), radial-gradient(50% 70% at 100% 100%, var(--accent) 0%, transparent 60%)',
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">{t('title')}</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('subtitle')}
          </p>

          <div className="mt-9 flex flex-col items-center gap-4">
            <Button asChild size="xl">
              <Link href="/request-quote">
                {t('button')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {t('secondary')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
