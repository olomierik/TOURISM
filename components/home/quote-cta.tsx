import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * The conversion moment: a line and a button.
 *
 * It was a bordered panel with a wash, a two-line subtitle and a caption, and
 * it stood 329px — after already being cut from 535px. The panel was the
 * problem. A card exists to separate its contents from the page; there is
 * nothing here to separate, because the whole section is one sentence and one
 * button, and a box drawn around them only says "this is an advertisement".
 *
 * The subtitle went with it. "Tell us your dates, budget and interests. We
 * match you with operators who run exactly that trip" explains a form that
 * takes two minutes and explains itself. So did the caption saying so.
 *
 * A hairline above, a heading left, the button right. Repeated on eight pages,
 * so the saving is eight times over.
 */
export async function QuoteCta() {
  const t = await getTranslations('home.cta');

  return (
    <section className="border-t">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-7">
        <h2 className="text-xl font-semibold sm:text-2xl">{t('title')}</h2>
        <Button asChild size="lg">
          <Link href="/request-quote">
            {t('button')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
