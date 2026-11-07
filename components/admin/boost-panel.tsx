import { getFormatter, getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { boostBusiness } from '@/lib/admin/boosts';
import type { AdminBoostRow } from '@/lib/queries/admin';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { AdminForm, Field, SelectField } from '@/components/admin/admin-form';
import { BusinessPicker } from '@/components/admin/business-picker';
import { EndBoostButton } from '@/components/admin/end-boost-button';
import { Badge } from '@/components/ui/badge';

const DURATIONS = [7, 14, 30, 60, 90, 180, 365, 0] as const;
const SCOPES = ['homepage', 'directory', 'destination', 'category'] as const;

/**
 * "Feature this business": the form, and the boosts that already exist.
 *
 * With `businessId` it sits on one listing's admin page. Without it, it is
 * the /admin/featured form and asks which business first.
 */
export async function BoostPanel({
  locale,
  businessId,
  boosts,
  showBusiness = false,
}: {
  locale: Locale;
  businessId?: string;
  boosts: AdminBoostRow[];
  showBusiness?: boolean;
}) {
  const [t, format, destinations, categories] = await Promise.all([
    getTranslations('admin.boost'),
    getFormatter(),
    getDestinations(locale),
    getCategories(locale),
  ]);

  return (
    <div className="space-y-5">
      {boosts.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {boosts.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-sm">
              <Badge variant={b.state === 'live' ? 'verified' : 'secondary'}>
                {t(`state.${b.state}`)}
              </Badge>
              {showBusiness && (
                <Link
                  href={{ pathname: '/admin/businesses/[id]', params: { id: b.businessId } }}
                  className="font-medium hover:text-primary"
                >
                  {b.businessName}
                </Link>
              )}
              <span>
                {t(`scope.${b.scope}` as 'scope.homepage')}
                {b.targetName ? ` · ${b.targetName}` : ''}
              </span>
              <span className="text-muted-foreground">{t('positionShort', { position: b.position })}</span>
              <span className="text-muted-foreground">
                {b.endsAt
                  ? t('until', { date: format.dateTime(new Date(b.endsAt), 'long') })
                  : t('noEnd')}
              </span>
              {b.state !== 'ended' && (
                <span className="ml-auto">
                  <EndBoostButton id={b.id} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border p-4">
        <p className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-[var(--sun-400)]" aria-hidden />
          {t('formTitle')}
        </p>
        <AdminForm action={boostBusiness} submitLabel={t('submit')} savedLabel={t('saved')}>
          {businessId ? (
            <input type="hidden" name="businessId" value={businessId} />
          ) : (
            <BusinessPicker name="businessId" label={t('business')} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="scope"
              label={t('scopeLabel')}
              defaultValue="homepage"
              options={SCOPES.map((s) => ({ value: s, label: t(`scope.${s}`) }))}
            />
            <SelectField
              name="days"
              label={t('duration')}
              defaultValue="30"
              options={DURATIONS.map((d) => ({
                value: String(d),
                label: d === 0 ? t('noEnd') : t('days', { days: d }),
              }))}
            />
            <SelectField
              name="destinationId"
              label={t('destination')}
              placeholder={t('anyDestination')}
              options={destinations.map((d) => ({ value: d.id, label: d.name }))}
            />
            <SelectField
              name="categoryId"
              label={t('category')}
              placeholder={t('anyCategory')}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Field
              name="position"
              label={t('position')}
              hint={t('positionHint')}
              type="number"
              min={1}
              max={99}
              defaultValue={1}
            />
            <Field name="note" label={t('note')} hint={t('noteHint')} />
          </div>
          <p className="text-xs text-muted-foreground">{t('scopeHint')}</p>
        </AdminForm>
      </div>
    </div>
  );
}
