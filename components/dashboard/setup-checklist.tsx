import { getTranslations } from 'next-intl/server';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

type ChecklistBusiness = {
  id: string;
  cover_image_url: string | null;
  latitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  description: string | null;
  shortDescription: string | null;
  categoryIds: string[];
  destinationIds: string[];
};

/**
 * "Get your listing ready": the steps between a new listing and one that wins
 * enquiries, as supplier onboarding on Viator walks a new operator through
 * theirs. Each step reads the listing itself, so it ticks as soon as the work
 * is saved, and the card goes away once everything is done.
 */
export async function SetupChecklist({ business }: { business: ChecklistBusiness }) {
  const t = await getTranslations('dashboard');
  const supabase = await createClient();
  const { count: packages } = await supabase
    .from('packages')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .is('deleted_at', null);

  type Step = {
    key: 'checkCover' | 'checkDescription' | 'checkLocation' | 'checkCategories' | 'checkContact' | 'checkPackage';
    done: boolean;
    href: '/dashboard/profile' | '/dashboard/packages/new';
  };
  const steps: Step[] = [
    { key: 'checkCover', done: Boolean(business.cover_image_url), href: '/dashboard/profile' as const },
    {
      key: 'checkDescription',
      done: Boolean(business.description || business.shortDescription),
      href: '/dashboard/profile' as const,
    },
    { key: 'checkLocation', done: business.latitude !== null, href: '/dashboard/profile' as const },
    {
      key: 'checkCategories',
      done: business.categoryIds.length > 0 && business.destinationIds.length > 0,
      href: '/dashboard/profile' as const,
    },
    { key: 'checkContact', done: Boolean(business.phone || business.whatsapp), href: '/dashboard/profile' as const },
    { key: 'checkPackage', done: (packages ?? 0) > 0, href: '/dashboard/packages/new' as const },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t('checklistTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('checklistHint')}</p>
        </div>
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {t('checklistProgress', { done, total: steps.length })}
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-success" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={cn(
                'flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                s.done ? 'border-transparent bg-success/8 text-muted-foreground' : 'hover:bg-secondary',
              )}
            >
              {s.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={cn('flex-1', s.done && 'line-through decoration-muted-foreground/50')}>
                {t(s.key)}
              </span>
              {!s.done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
              <span className="sr-only">{s.done ? t('checklistDone') : t('checklistTodo')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
