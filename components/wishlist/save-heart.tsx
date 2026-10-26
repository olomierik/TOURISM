'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

import { IconButton } from '@/components/ui/icon-button';

import { getSavedIds, toggleFavorite } from '@/lib/leads/favorites';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

/**
 * The heart on a card's photograph: save to the traveller's list, as on Viator.
 *
 * Every heart on a page shares one read of what the user has saved (the store
 * below), so twenty cards cost one query, and a signed-out visitor costs none:
 * without a Supabase session cookie there is nothing to read.
 *
 * Signed out, a tap remembers what was tapped and goes to sign-in. Back on the
 * page, the heart saves it, so the tap is not lost to the detour.
 */

type Saved = { business: Set<string>; package: Set<string> };

const PENDING_KEY = 'et:pending-save';

function readPending(): { kind: 'business' | 'package'; id: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as { kind: 'business' | 'package'; id: string }) : null;
  } catch {
    return null;
  }
}

let saved: Saved | null = null;
let loading: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const l of listeners) l();
}

function hasSession(): boolean {
  return typeof document !== 'undefined' && /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie);
}

/** Whether the cached read was made signed in. Navigation inside the app keeps
 *  this module alive across a sign-in or sign-out, so a read made before it is
 *  stale after it. */
let loadedSignedIn: boolean | null = null;

function load(): Promise<void> {
  const signedIn = hasSession();
  if (loading && loadedSignedIn === signedIn) return loading;
  loadedSignedIn = signedIn;
  const read = signedIn
    ? getSavedIds()
    : Promise.resolve({ businessIds: [] as string[], packageIds: [] as string[] });
  loading = read
    .then(async (r) => {
      saved = { business: new Set(r.businessIds), package: new Set(r.packageIds) };
      await finishPending();
    })
    .catch(() => {
      saved = { business: new Set(), package: new Set() };
    })
    .finally(emit);
  return loading;
}

function setSaved(kind: 'business' | 'package', id: string, on: boolean) {
  if (!saved) saved = { business: new Set(), package: new Set() };
  if (on) saved[kind].add(id);
  else saved[kind].delete(id);
  emit();
}

function isSavedNow(kind: 'business' | 'package', id: string): boolean {
  return Boolean(saved?.[kind].has(id));
}

/** Back from signing in: finish the save that sent the visitor there. */
async function finishPending() {
  if (!saved || !hasSession()) return;
  const p = readPending();
  if (!p) return;
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    return;
  }
  if (saved[p.kind].has(p.id)) return;
  const r = await toggleFavorite(p.kind === 'business' ? { businessId: p.id } : { packageId: p.id });
  if (r.saved) saved[p.kind].add(p.id);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function SaveHeart({
  businessId,
  packageId,
  className,
}: {
  businessId?: string;
  packageId?: string;
  className?: string;
}) {
  const t = useTranslations('favorites');
  const router = useRouter();
  const kind: 'business' | 'package' = businessId ? 'business' : 'package';
  const id = (businessId ?? packageId) as string;

  const v = useSyncExternalStore(subscribe, () => version, () => 0);
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const isSaved = optimistic ?? (v >= 0 && isSavedNow(kind, id));

  function goSignIn() {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ kind, id }));
    } catch {
      // Private mode: the save is lost to the sign-in, nothing else.
    }
    const back = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?next=${encodeURIComponent(back)}`);
  }

  function toggle() {
    // Signed out: straight to sign-in, without asking the server first.
    if (!hasSession()) {
      goSignIn();
      return;
    }
    const next = !isSaved;
    setOptimistic(next);
    startTransition(async () => {
      const result = await toggleFavorite(kind === 'business' ? { businessId: id } : { packageId: id });
      setOptimistic(null);
      if (result.requiresLogin) {
        // The session cookie outlived the session.
        goSignIn();
        return;
      }
      setSaved(kind, id, result.saved);
      if (result.saved) track('save_clicked', { businessId: businessId ?? null });
    });
  }

  // §6.2: 44x44 hit area, the `on-photo` variant (white 90%, ink glyph), and
  // aria-pressed with "Save {name}" / "Remove {name} from saved". It was a 36px
  // circle before — below the 44 a thumb needs, and pill-radius where §3.4
  // reserves the pill for chips and avatars.
  return (
    <IconButton
      type="button"
      variant="on-photo"
      label={isSaved ? t('remove') : t('add')}
      pressed={isSaved}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={cn('disabled:opacity-70', className)}
    >
      <Heart
        className={cn(
          'size-5 transition-colors duration-[var(--dur-fast)]',
          isSaved && 'fill-danger text-danger',
        )}
        aria-hidden
      />
    </IconButton>
  );
}
