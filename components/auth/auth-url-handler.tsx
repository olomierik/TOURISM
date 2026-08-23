'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

/**
 * Completes a sign-in that landed somewhere other than /auth/callback.
 *
 * Supabase decides where a confirmation or OAuth link returns to, and it only
 * honours the URL the app asked for if that URL is in the project's redirect
 * allow-list. When it is not, Supabase silently substitutes the project's Site
 * URL — dropping the user on the homepage with their credentials in the URL
 * instead of on the route built to exchange them. No error is raised; the person
 * is confirmed but not signed in, standing on a page with a long fragment in the
 * address bar.
 *
 * This mounts site-wide and handles both shapes that can arrive:
 *
 *   #access_token=…&refresh_token=…   implicit flow — set the session directly
 *   ?code=…                           PKCE — exchange it for one
 *
 * Which one appears depends on how the link was generated, so both are handled
 * rather than guessing.
 *
 * /auth/callback is still the intended route and still does this properly on the
 * server. This is the safety net for a misconfigured allow-list, and it is worth
 * having permanently: the allow-list is remote configuration that can be changed
 * by someone who has no idea it is load-bearing.
 */
export function AuthUrlHandler() {
  const t = useTranslations('auth.completing');
  const router = useRouter();
  const [working, setWorking] = useState(false);

  // Strict Mode invokes effects twice in development. A one-time code may only
  // be exchanged once, so the second attempt would fail and surface an error for
  // a sign-in that actually succeeded.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const search = new URLSearchParams(window.location.search);

    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const code = search.get('code');

    // Nothing to do on an ordinary page view, which is almost every page view.
    if (!accessToken && !code) return;

    started.current = true;

    (async () => {
      // Set inside the async body rather than synchronously in the effect: a
      // synchronous setState here cascades an extra render, and deriving it
      // during render instead would read window and break hydration, since the
      // server has no URL fragment to look at.
      setWorking(true);

      const supabase = createClient();

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.error('[auth] could not set session from fragment', error.message);
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error('[auth] could not exchange code', error.message);
      }

      // Strip the credentials from the address bar before anything else. They
      // are in the browser history and the tab title until this runs, and a user
      // who copies the URL to share the page would be pasting a live session.
      const clean = new URL(window.location.href);
      clean.hash = '';
      clean.searchParams.delete('code');
      clean.searchParams.delete('error');
      clean.searchParams.delete('error_description');
      window.history.replaceState({}, '', clean.toString());

      // The header and every server component still believe nobody is signed in,
      // because they rendered before the cookie existed.
      router.refresh();
      setWorking(false);
    })();
  }, [router]);

  if (!working) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-[var(--header-h)] z-50 flex justify-center px-4"
    >
      <p className="flex items-center gap-2 rounded-b-xl border border-t-0 bg-card px-4 py-2.5 text-sm shadow-sm">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
        {t('signingIn')}
      </p>
    </div>
  );
}
