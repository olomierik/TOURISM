import { BadgeCheck, ExternalLink, MinusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { OperatorFacts } from '@/lib/queries/operator-facts';
import { cn } from '@/lib/utils';

/**
 * What the industry registers say about this operator, and when we looked.
 *
 * The thing that makes this worth putting on the page is the rows where
 * `listed` is false. Every directory shows the badges an operator holds; a row
 * that says "not on the TLTO register, read on 8 Nov 2026" is a statement about
 * our own diligence, and it is the only kind of statement a traveller can use
 * to tell a checked listing from an unchecked one. Hiding it would turn this
 * block back into a wall of marks.
 *
 * Three things it deliberately does not do:
 *
 *   It does not say "verified". That word is reserved for a licence number an
 *   admin has seen, and 074's header says why conflating the two is the one
 *   mistake that would cost us the trust this is meant to build.
 *
 *   It does not call TATO membership a licence. TATO requires its members to
 *   hold a valid TALA licence, which is why it leads — but the register says
 *   "member", so the page says "member".
 *
 *   It does not hide the date. A check from eighteen months ago is worth
 *   knowing about, and the only way a traveller can judge that is to be told.
 */
export function RegisterChecks({
  registers,
  locale,
  className,
}: {
  registers: OperatorFacts['registers'];
  locale: string;
  className?: string;
}) {
  const t = useTranslations('business.registers');
  if (registers.length === 0) return null;

  const fmt = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-sm text-muted-foreground">{t('intro')}</p>

      <ul className="divide-y rounded-xl border bg-card">
        {registers.map((r) => (
          <li key={r.register} className="flex items-start gap-3 px-4 py-3">
            {r.listed ? (
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            ) : (
              <MinusCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm', !r.listed && 'text-muted-foreground')}>
                {t(r.listed ? `listed.${r.register}` : `absent.${r.register}`)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('checkedOn', { date: fmt(r.checkedOn) })}
                {r.sourceUrl && (
                  <>
                    {' · '}
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 underline hover:text-foreground"
                    >
                      {t('sourceLink')}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Said once, below the list, rather than repeated on every row. */}
      <p className="text-xs text-muted-foreground">{t('caveat')}</p>
    </section>
  );
}
