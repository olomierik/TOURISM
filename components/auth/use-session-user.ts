'use client';

import { useEffect, useState } from 'react';

import { usePathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Who is signed in, resolved in the browser.
 *
 * This exists so that pages do not have to ask. Reading the session on the
 * server means calling `cookies()`, and `cookies()` is a Request-time API:
 * touching it anywhere in a page's tree opts that entire route into dynamic
 * rendering. There is no way to scope it to one component — Cache Components,
 * the feature that would allow that, is not enabled here.
 *
 * That is not a hypothetical cost. The listing page resolved one boolean this
 * way, for three client components that only wanted to know whether to show a
 * sign-in prompt, and in exchange every one of the three thousand listing
 * pages became uncacheable: `Cache-Control: no-store`, no prerender, a fresh
 * round of Postgres queries on every single view including every crawl. Pages
 * that should have been served from the CDN in milliseconds were measured at
 * 7.5 seconds apiece, and the nightly build spent its time rendering pages
 * whose output was then discarded as dynamic.
 *
 * So the rule is: a public page never reads the session. Anything that depends
 * on who is looking asks for it here, after hydration, and the page itself
 * stays static.
 *
 * ---
 *
 * Three states, and callers must honour all three:
 *
 *   undefined  not resolved yet
 *   null       signed out
 *   {...}      signed in
 *
 * Collapsing `undefined` into "signed out" is what makes an app feel broken:
 * a signed-in reader watches a sign-in prompt render and then replace itself.
 * Render nothing, or a placeholder, until it is known.
 */
export type SessionUser = { id: string; email: string };

export function useSessionUser(): SessionUser | null | undefined {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  // The route, because signing in does not remount these components.
  //
  // Sign-in is a server action ending in redirect(), which the App Router
  // performs as a client-side navigation. A component that survives that
  // navigation keeps the `null` it resolved before the user had a session, and
  // onAuthStateChange does not help: the sign-in happened on the server and
  // this client never saw it.
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // getSession reads the cookie the server just set: local, no round trip,
    // which matters because this re-runs on every navigation. getUser would
    // re-validate the token against the auth server each time — correct, and a
    // network call between every page.
    //
    // Reading it here is safe because nothing is authorised on the strength of
    // it. It decides which of two pieces of UI to draw, and every action
    // behind that UI checks the session again on the server, where it counts.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      setUser(u?.id && u.email ? { id: u.id, email: u.email } : null);
    });

    // Keeps this honest when the session changes in another tab, or when a
    // token refresh fails and the reader is effectively signed out.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const u = session?.user;
      setUser(u?.id && u.email ? { id: u.id, email: u.email } : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  return user;
}

/**
 * The common case: a component that only needs to know whether to show its
 * form or a sign-in prompt. `undefined` while unresolved, as above.
 */
export function useSignedIn(): boolean | undefined {
  const user = useSessionUser();
  return user === undefined ? undefined : user !== null;
}
