'use client';

import { useCallback, useState, useSyncExternalStore, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

import { toggleLike } from '@/lib/engagement/actions';
import { cn } from '@/lib/utils';

/**
 * Whether this browser has already liked a listing.
 *
 * Read through useSyncExternalStore rather than an effect, and that is not a
 * style choice. localStorage does not exist on the server, so the value has two
 * different answers during hydration; useSyncExternalStore is the API that
 * exists for exactly that, taking a separate server snapshot so React renders
 * the same markup on both sides and updates afterwards. Reading it in an effect
 * and calling setState is the pattern the compiler rejects, and it rejects it
 * because it renders once with the wrong answer.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab liking the same listing should be reflected here too.
  const onStorage = () => onChange();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function announce() {
  for (const l of listeners) l();
}

function readLiked(businessId: string): boolean {
  try {
    return localStorage.getItem(`et_liked_${businessId}`) === '1';
  } catch {
    // Storage throws outright in a private window with site data blocked, and
    // in some embedded previews. A heart that cannot remember is fine; a heart
    // that takes the page down with it is not.
    return false;
  }
}

function writeLiked(businessId: string, liked: boolean) {
  try {
    localStorage.setItem(`et_liked_${businessId}`, liked ? '1' : '0');
  } catch {
    /* as above — the count below is still correct for this page view */
  }
  announce();
}

/**
 * The identifier a like is deduplicated by.
 *
 * Not an identity, and nothing is authorised with it — the server reads the
 * session for anything that matters. Its only job is to stop one person adding
 * the same like twice, and somebody who clears it and likes again costs one
 * wrong integer, which is the correct price for not demanding an account.
 */
function visitorId(): string {
  const KEY = 'et_visitor';
  try {
    const held = localStorage.getItem(KEY);
    if (held) return held;
    const made = crypto.randomUUID();
    localStorage.setItem(KEY, made);
    return made;
  } catch {
    return crypto.randomUUID();
  }
}

export function LikeButton({
  businessId,
  initialCount,
  variant = 'default',
  className,
}: {
  businessId: string;
  initialCount: number;
  /** `compact` is the one that sits on a directory card. */
  variant?: 'default' | 'compact';
  className?: string;
}) {
  const t = useTranslations('engagement');
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const liked = useSyncExternalStore(
    subscribe,
    useCallback(() => readLiked(businessId), [businessId]),
    // The server has no localStorage, so it always renders the unfilled heart.
    () => false,
  );

  function press() {
    // Written before the request and corrected after. A heart that waits on a
    // round trip to another continent feels broken.
    const next = !liked;
    writeLiked(businessId, next);
    setCount((n) => Math.max(0, n + (next ? 1 : -1)));

    startTransition(async () => {
      const result = await toggleLike(businessId, visitorId());
      writeLiked(businessId, result.liked);
      setCount(result.count);
    });
  }

  const compact = variant === 'compact';

  return (
    <button
      type="button"
      onClick={(e) => {
        // Cards wrap the whole tile in a link. Without this the heart
        // navigates to the listing instead of liking it.
        e.preventDefault();
        e.stopPropagation();
        press();
      }}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? t('unlike') : t('like')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full transition-colors',
        compact
          ? 'bg-background/85 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur hover:bg-background'
          : 'border px-4 py-2 text-sm font-medium hover:bg-secondary',
        liked && !compact && 'border-destructive/30 bg-destructive/8',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-4 transition-all',
          liked ? 'fill-destructive text-destructive' : 'text-muted-foreground',
          pending && 'scale-90',
        )}
        aria-hidden
      />
      <span className={cn('tabular-nums', liked && 'text-destructive')}>{count}</span>
      {!compact && <span className="ml-0.5">{liked ? t('loved') : t('love')}</span>}
    </button>
  );
}
