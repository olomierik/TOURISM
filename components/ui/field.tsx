import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/**
 * Field — design.md §6.3.
 *
 * Label, optional hint, control, error. The order is fixed because the wiring
 * depends on it, and the wiring is the reason this exists at all: before it,
 * every form built its own `aria-describedby` by hand, or did not.
 *
 * What it guarantees, so no call site has to remember:
 *
 * - the label is a real `<label for>`, never a placeholder standing in for one;
 * - `aria-describedby` names the hint and the error, in that order, and omits
 *   whichever is absent rather than pointing at an element that is not there;
 * - `aria-invalid` is set from the presence of an error, so the styling in
 *   Input/Select/Textarea and the announcement cannot disagree;
 * - the error carries an icon, because §10 does not allow colour to be the only
 *   thing distinguishing a state.
 *
 * On marking required vs optional: §6.3 says pick one convention per form and
 * **mark the minority**. Hence two props rather than one — a form where most
 * fields are required passes `optional`, and one where most are not passes
 * `required`. The word is spelled out rather than an asterisk, which is a
 * convention a lot of the world does not share.
 *
 * The control is a render prop rather than `children`, because it needs the
 * generated ids and the call site should not have to thread them manually.
 */
export function Field({
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Presence of a string sets `aria-invalid` and renders the message. */
  error?: string | null;
  /** Adds a visible "(required)". Use on the minority. */
  required?: boolean;
  /** Adds a visible "(optional)". Use on the minority. */
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
  }) => React.ReactNode;
}) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="font-normal text-muted-foreground">(required)</span>
        )}
        {optional && (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>

      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}

      {error && (
        <p
          id={errorId}
          // Not role="alert": §6.3 validates on blur and on submit, and a
          // submit already moves focus to an ErrorSummary. A live region on
          // every field would make one failed submit announce five times.
          className="flex items-start gap-1.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
