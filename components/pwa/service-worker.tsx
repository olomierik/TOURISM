'use client';

import { useEffect } from 'react';
import { SerwistProvider } from '@serwist/turbopack/react';

const SW_URL = '/serwist/sw.js';

/**
 * Whether this page may run the offline worker. Never in development (a
 * cached old build would hide every edit), never inside an iframe (editor and
 * review previews), and never when the URL carries ?sw=off — the switch that
 * lets anyone stuck on an old copy clear it.
 */
function workerAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'production') return false;
  if (!('serviceWorker' in navigator)) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return false;
  return true;
}

/** Removes this site's worker where it is not allowed to run. */
function RemoveWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? '';
        if (url.includes(SW_URL)) void reg.unregister();
      }
    });
  }, []);
  return null;
}

export function ServiceWorker({ children }: { children: React.ReactNode }) {
  // Decided once per page load. On the server this is false, and the provider
  // renders only its children either way, so there is nothing to mismatch.
  const allowed = workerAllowed();
  return (
    <SerwistProvider swUrl={SW_URL} disable={!allowed} reloadOnOnline={false}>
      {!allowed && <RemoveWorker />}
      {children}
    </SerwistProvider>
  );
}
