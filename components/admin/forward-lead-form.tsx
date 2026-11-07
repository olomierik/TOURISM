'use client';

import { useActionState, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Forward, Loader2, RotateCw } from 'lucide-react';

import { forwardLead, resendLead, type ForwardState } from '@/lib/admin/leads';
import { BusinessPicker } from '@/components/admin/business-picker';
import { CheckField, Field, TextField } from '@/components/admin/admin-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ForwardState = {};

function Results({ state }: { state: ForwardState }) {
  const t = useTranslations('admin.forward');
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" aria-hidden />
        <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
      </Alert>
    );
  }
  if (!state.success || !state.results) return null;
  return (
    <Alert>
      <Check className="size-4" aria-hidden />
      <AlertDescription>
        <ul className="space-y-0.5">
          {state.results.map((r) => (
            <li key={r.name}>
              <span className="font-medium">{r.name}</span>: {t(`outcome.${r.outcome}`)}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/** Send this enquiry to any business(es) the admin picks. */
export function ForwardLeadForm({ leadId }: { leadId: string }) {
  const t = useTranslations('admin.forward');
  const [state, action, pending] = useActionState(forwardLead, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      <Results state={state} />
      <BusinessPicker name="businessIds" label={t('businesses')} hint={t('businessesHint')} multiple />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="overrideEmail" type="email" label={t('overrideEmail')} hint={t('overrideEmailHint')} />
        <div className="space-y-3 pt-1 sm:pt-7">
          <CheckField name="saveEmail" label={t('saveEmail')} />
          <CheckField name="includeContact" label={t('includeContact')} hint={t('includeContactHint')} defaultChecked />
        </div>
      </div>
      <TextField name="note" label={t('note')} hint={t('noteHint')} rows={2} />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Forward className="size-4" aria-hidden />}
        {t('submit')}
      </Button>
    </form>
  );
}

/** Resend to one existing recipient, optionally at an address the admin knows. */
export function ResendLead({ leadId, businessId }: { leadId: string; businessId: string }) {
  const t = useTranslations('admin.forward');
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(resendLead, initial);
  // Several of these can be open on one page, beside the forward form, so
  // ids are generated rather than taken from the field name.
  const uid = useId();

  if (!open) {
    return (
      <div className="space-y-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RotateCw className="size-3.5" aria-hidden />
          )}
          {t('resend')}
        </Button>
        {(state.success || state.error) && <Results state={state} />}
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        action(fd);
        setOpen(false);
      }}
      className="w-full space-y-3 rounded-lg border bg-muted/40 p-3"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="businessId" value={businessId} />
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-email`}>{t('overrideEmail')}</Label>
        <Input id={`${uid}-email`} name="overrideEmail" type="email" />
        <p className="text-xs text-muted-foreground">{t('resendEmailHint')}</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="saveEmail" className="size-4 accent-primary" />
        {t('saveEmail')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="includeContact" defaultChecked className="size-4 accent-primary" />
        {t('includeContact')}
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RotateCw className="size-3.5" aria-hidden />
          )}
          {t('resendNow')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
