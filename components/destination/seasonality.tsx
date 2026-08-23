import { getTranslations } from 'next-intl/server';
import { CloudRain, Droplets, Sun, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';
import { getSeasonality } from '@/lib/queries/taxonomy';

/**
 * Month-by-month conditions.
 *
 * "When should I go?" is the highest-volume planning question in this niche, and
 * the answer is genuinely non-obvious — the Great Migration moves continuously,
 * so the right month depends on what you want to see rather than on a single
 * "best time". Answering it properly earns long-tail search traffic and gives
 * the page a reason to exist beyond a list of operators.
 *
 * Rendered as a table, not a chart: it is tabular data, it must work without
 * JavaScript, and a screen reader can read a table.
 */
function Meter({
  value,
  max = 5,
  tone,
  label,
}: {
  value: number | null;
  max?: number;
  tone: 'wildlife' | 'weather' | 'crowd';
  label: string;
}) {
  if (value === null) return <span className="text-muted-foreground">—</span>;

  const toneClass = {
    // Crowds invert: a high value is a negative, so it reads warning-coloured
    // rather than the success green used for wildlife and weather.
    wildlife: 'bg-success',
    weather: 'bg-accent',
    crowd: 'bg-warning',
  }[tone];

  return (
    <span className="flex items-center gap-0.5" title={`${label}: ${value}/${max}`}>
      <span className="sr-only">{`${label}: ${value} / ${max}`}</span>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'h-4 w-1.5 rounded-full',
            i < value ? toneClass : 'bg-border',
          )}
        />
      ))}
    </span>
  );
}

export async function Seasonality({
  destinationId,
  destinationName,
  locale,
}: {
  destinationId: string;
  destinationName: string;
  locale: Locale;
}) {
  const months = await getSeasonality(destinationId, locale);
  if (months.length === 0) return null;

  const t = await getTranslations('destination');
  const tMonths = await getTranslations('months');

  return (
    <section className="container-page py-section">
      <h2 className="text-3xl font-semibold sm:text-4xl">
        {t('seasonality', { name: destinationName })}
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {t('seasonalitySubtitle')}
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="sr-only">
            {t('seasonality', { name: destinationName })}
          </caption>
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th scope="col" className="px-4 py-3 font-medium">
                {/* Column of month names needs no visible header */}
                <span className="sr-only">{t('bestTime')}</span>
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sun className="size-3.5" aria-hidden />
                  {t('wildlife')}
                </span>
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="flex items-center gap-1.5">
                  <CloudRain className="size-3.5" aria-hidden />
                  {t('weather')}
                </span>
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  {t('crowds')}
                </span>
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="flex items-center gap-1.5">
                  <Droplets className="size-3.5" aria-hidden />
                  {t('rainfall')}
                </span>
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('temp')}
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr
                key={m.month}
                className={cn(
                  'border-b last:border-0',
                  m.isPeak && 'bg-primary/[0.04]',
                )}
              >
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  <span className="flex flex-wrap items-center gap-2">
                    {tMonths(String(m.month) as '1')}
                    {m.isPeak && (
                      <Badge variant="featured" className="text-[0.65rem]">
                        {t('peak')}
                      </Badge>
                    )}
                  </span>
                  {m.highlight && (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {m.highlight}
                    </span>
                  )}
                </th>
                <td className="px-4 py-3">
                  <Meter value={m.wildlife} tone="wildlife" label={t('wildlife')} />
                </td>
                <td className="px-4 py-3">
                  <Meter value={m.weather} tone="weather" label={t('weather')} />
                </td>
                <td className="px-4 py-3">
                  <Meter value={m.crowd} tone="crowd" label={t('crowds')} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.rainfallMm === null ? '—' : `${m.rainfallMm} mm`}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.tempMinC === null || m.tempMaxC === null
                    ? '—'
                    : `${m.tempMinC}–${m.tempMaxC} °C`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
