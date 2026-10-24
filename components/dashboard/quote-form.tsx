'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Loader2 } from 'lucide-react';

import { sendQuote, type QuoteState } from '@/lib/leads/quotes';
import { QUOTE_CURRENCIES, type LeadQuote } from '@/lib/leads/quote-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initial: QuoteState = {};

/**
 * The operator's structured quote for one enquiry. Every operator answers the
 * same fields, which is what lets the traveller compare them side by side.
 */
export function QuoteForm({ leadBusinessId, quote }: { leadBusinessId: string; quote: LeadQuote | null }) {
  const t = useTranslations('quoteForm');
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(sendQuote.bind(null, leadBusinessId), initial);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <FileText className="size-3.5" aria-hidden />
          {quote ? t('update') : t('send')}
        </Button>
      </div>
    );
  }

  const id = (name: string) => `q-${leadBusinessId}-${name}`;

  return (
    <form action={formAction} className="space-y-3 rounded-xl border bg-background p-4">
      <p className="text-sm font-semibold">{quote ? t('update') : t('send')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor={id('amount')}>{t('amount')}</Label>
          <Input id={id('amount')} name="amount" type="number" min="1" step="1" required inputMode="numeric" defaultValue={quote?.totalAmount ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('currency')}>{t('currency')}</Label>
          <select
            id={id('currency')}
            name="currency"
            defaultValue={quote?.currency ?? 'USD'}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {QUOTE_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('basis')}>{t('basis')}</Label>
          <select
            id={id('basis')}
            name="basis"
            defaultValue={quote?.priceBasis ?? 'total'}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="total">{t('basisTotal')}</option>
            <option value="per_person">{t('basisPerPerson')}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('days')}>{t('days')}</Label>
          <Input id={id('days')} name="days" type="number" min="1" max="90" defaultValue={quote?.durationDays ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('valid')}>{t('validUntil')}</Label>
          <Input id={id('valid')} name="validUntil" type="date" defaultValue={quote?.validUntil ?? ''} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('includes')}>{t('includes')}</Label>
        <Textarea id={id('includes')} name="includes" rows={3} maxLength={2000} placeholder={t('includesPlaceholder')} defaultValue={quote?.includes ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('excludes')}>{t('excludes')}</Label>
        <Textarea id={id('excludes')} name="excludes" rows={2} maxLength={2000} placeholder={t('excludesPlaceholder')} defaultValue={quote?.excludes ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id('notes')}>{t('notes')}</Label>
        <Textarea id={id('notes')} name="notes" rows={2} maxLength={2000} defaultValue={quote?.notes ?? ''} />
      </div>
      {state.error && <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {t('submit')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {state.success ? t('close') : t('cancel')}
        </Button>
        {state.success && !pending && <span className="text-sm text-success">{t('sent')}</span>}
      </div>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
    </form>
  );
}
