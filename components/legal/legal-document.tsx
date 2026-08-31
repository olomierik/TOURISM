import { getTranslations } from 'next-intl/server';
import { Info } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import type { LegalDocument } from '@/lib/legal/content';

/**
 * Renders a legal document.
 *
 * The content is English-only by design (see lib/legal/content.ts), so a reader
 * on /de or /fr gets a line at the top saying so rather than silently being
 * handed a language they did not choose. That note is translated even though
 * the document is not — telling somebody in German that the page below is in
 * English is exactly the thing that has to be in German.
 */
export async function LegalDocumentView({
  doc,
  locale,
}: {
  doc: LegalDocument;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: 'legal' });

  return (
    <div className="container-page py-section">
      <article className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('updated', { date: doc.updated })}
        </p>

        {locale !== 'en' && (
          <p className="mt-6 flex gap-2 rounded-lg border border-dashed p-3 text-sm leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{t('englishOnly')}</span>
          </p>
        )}

        <p className="mt-6 leading-relaxed text-muted-foreground">{doc.intro}</p>

        <div className="mt-10 space-y-10">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-4">
                {section.body.map((block, i) =>
                  Array.isArray(block) ? (
                    <ul
                      key={i}
                      className="ml-5 list-disc space-y-1.5 leading-relaxed marker:text-muted-foreground"
                    >
                      {block.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="leading-relaxed">
                      {block}
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t pt-6 text-sm leading-relaxed text-muted-foreground">
          {t.rich('questions', {
            link: (chunks) => (
              <Link href="/contact" className="font-medium text-primary hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </article>
    </div>
  );
}
