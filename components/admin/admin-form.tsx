'use client';

import { useActionState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Loader2, Save } from 'lucide-react';

import type { CrudState } from '@/lib/admin/crud';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { locales, localeMeta, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const initial: CrudState = {};

/**
 * Shell for every admin create/edit form.
 *
 * Holds the action state, renders the one error the server returned, and owns
 * the submit button. Each entity form supplies only its fields, so adding a
 * field to a form never means re-deciding how errors or pending states look.
 */
export function AdminForm({
  action,
  children,
  submitLabel,
  savedLabel,
}: {
  action: (prev: CrudState, formData: FormData) => Promise<CrudState>;
  children: React.ReactNode;
  submitLabel?: string;
  savedLabel?: string;
}) {
  const t = useTranslations('admin.form');
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
        </Alert>
      )}

      {state.success && (
        <Alert>
          <Check className="size-4" aria-hidden />
          <AlertDescription>{savedLabel ?? t('saved')}</AlertDescription>
        </Alert>
      )}

      {children}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('saving')}
          </>
        ) : (
          <>
            <Save className="size-4" aria-hidden />
            {submitLabel ?? t('save')}
          </>
        )}
      </Button>
    </form>
  );
}

/** Labelled text input. */
export function Field({
  name,
  label,
  hint,
  type = 'text',
  defaultValue,
  required,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        required={required}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Labelled multi-line input. */
export function TextField({
  name,
  label,
  hint,
  defaultValue,
  rows = 4,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Checkbox that submits nothing when unchecked, which the actions rely on. */
export function CheckField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 size-4 rounded border-input accent-primary"
      />
      <div>
        <Label htmlFor={name} className="font-normal">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Labelled select built from a list of options. */
export function SelectField({
  name,
  label,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Locale switcher for a translation form.
 *
 * A plain link rather than client state: switching locale must reload the form
 * with that locale's saved values, and holding four locales' worth of unsaved
 * edits in memory invites losing three of them to a single failed submit.
 *
 * Builds its own hrefs instead of taking a callback. It previously accepted an
 * `hrefFor` function, which crashed every page that used it: a function is not
 * serializable, so passing one from a Server Component to a Client Component
 * throws (React #441) and takes the whole route down to an error boundary. The
 * component knows the current path already, so the callback bought nothing.
 */
export function LocaleTabs({
  current,
  translated,
}: {
  current: Locale;
  /** Locales that already have a translation, shown with a marker. */
  translated: readonly string[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1 border-b pb-3">
      {locales.map((l) => (
        <a
          key={l}
          href={`${pathname}?tr=${l}`}
          aria-current={l === current ? 'page' : undefined}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            l === current
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary/60',
          )}
        >
          {localeMeta[l].native}
          {translated.includes(l) && <span className="ml-1.5 text-success">•</span>}
        </a>
      ))}
    </div>
  );
}
