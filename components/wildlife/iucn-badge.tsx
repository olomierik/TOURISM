import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { Iucn } from '@/lib/wildlife/types';

/**
 * IUCN Red List status. The code is the convention guides and field books use;
 * the colour only reinforces it and the full name is always available, on the
 * badge itself or as its accessible label.
 */
const TONE: Record<Exclude<Iucn, null>, string> = {
  LC: 'border-success/40 text-success',
  NT: 'border-gold/60 text-foreground',
  DD: 'text-muted-foreground',
  VU: 'border-warning/60 text-warning',
  EN: 'border-danger/50 text-danger',
  CR: 'border-danger bg-danger text-danger-foreground',
};

export function IucnBadge({ code, compact = false }: { code: Iucn; compact?: boolean }) {
  const t = useTranslations('wildlife.iucn');
  const label = t(code ?? 'none');

  return (
    <span
      title={label}
      aria-label={compact ? label : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-caption font-semibold',
        code ? TONE[code] : 'text-muted-foreground',
      )}
    >
      {code ?? '–'}
      {!compact && <span className="font-medium">· {label}</span>}
    </span>
  );
}
