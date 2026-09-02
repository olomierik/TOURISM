import { getTranslations } from 'next-intl/server';
import { Clock, Lightbulb, Ticket } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { getAttractions } from '@/lib/queries/taxonomy';

/**
 * The actual things to do.
 *
 * The page titled "Things to do in Serengeti" listed tour operators, which is a
 * directory wearing a guide's title. Somebody searching that phrase wants to
 * know there is a Maasai market on Fridays and a coffee farm you can walk —
 * not which companies will sell them a trip.
 *
 * The tip on each entry is why the section is worth publishing. A name and a
 * category is a label on a map; "the crater descent is charged per vehicle, not
 * per person, and the six hours start at the gate" is the thing somebody would
 * otherwise learn by paying for it.
 *
 * Renders nothing where no attractions are written yet, rather than an empty
 * heading — 17 destinations have them and 29 do not.
 */
export async function ThingsToDo({
  destinationId,
  destinationName,
  locale,
}: {
  destinationId: string;
  destinationName: string;
  locale: Locale;
}) {
  const [items, t] = await Promise.all([
    getAttractions(destinationId, locale),
    getTranslations({ locale, namespace: 'thingsToDo' }),
  ]);

  if (items.length === 0) return null;

  /** Minutes as something a person would say: "2 hours", "half a day", "7 days". */
  function duration(minutes: number | null): string | null {
    if (!minutes) return null;
    if (minutes < 90) return t('minutes', { count: minutes });
    if (minutes < 360) return t('hours', { count: Math.round(minutes / 60) });
    if (minutes < 1440) return t('halfDay');
    return t('days', { count: Math.round(minutes / 1440) });
  }

  return (
    <section className="container-page py-section">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
        {t('title', { name: destinationName })}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('intro')}</p>

      {/* Two columns rather than one on a wide screen, and three where there
          is room. These were stacked in a two-column grid running to 758px —
          the tallest section on the page after the month table went. The tip
          and the summary are what make each card tall, and both are worth
          keeping: this is the section that answers "what would I actually do
          there", which is the question the page exists for. So the cards stay
          whole and the grid gets wider instead. */}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => {
          const time = duration(a.typicalMinutes);
          return (
            <li key={a.id} className="flex flex-col rounded-xl border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-display text-lg font-semibold">{a.name}</h3>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`kind.${a.kind}`)}
                </span>
              </div>

              {a.summary && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
              )}

              {a.tip && (
                <p className="mt-3 flex gap-2 rounded-lg bg-secondary/40 p-3 text-sm leading-relaxed">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{a.tip}</span>
                </p>
              )}

              {(time || a.isFree !== null) && (
                <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
                  {time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden />
                      {time}
                    </span>
                  )}
                  {/* Only when checked. NULL means unknown, and rendering that as
                      "free" is the one mistake here that costs somebody money. */}
                  {a.isFree !== null && (
                    <span className="flex items-center gap-1.5">
                      <Ticket className="size-3.5" aria-hidden />
                      {a.isFree ? t('free') : t('paid')}
                    </span>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
