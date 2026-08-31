'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';

export type Pin = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  isVerified: boolean;
  tagline: string | null;
};

/**
 * The map, loaded only when somebody is going to look at it.
 *
 * Leaflet and its stylesheet are around 45KB and entirely client-side, on a
 * site whose whole advantage is server-rendered pages. So nothing is fetched
 * until the container is close to the viewport — a reader who never scrolls
 * past the listings pays nothing, and the placeholder below is what search
 * engines and no-JS readers get, which is honest rather than an empty box.
 *
 * OpenStreetMap tiles because they need no API key. The architecture brief
 * names Mapbox or Google; both require a token, and this component is small
 * enough that swapping the tile URL and attribution is the whole migration.
 */
export function PinMap({
  pins,
  center,
  label,
}: {
  pins: Pin[];
  center: { lat: number; lng: number } | null;
  label: string;
}) {
  const t = useTranslations('map');
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);

  // 300px of margin: the load and first tile paint want a head start, so the
  // map is ready by the time it is actually on screen.
  useEffect(() => {
    const el = holder.current;
    if (!el || near) return;

    // No observer — an old browser, or a test environment. There is nothing to
    // wait for, so load on the next frame. Scheduled rather than set here
    // because a synchronous setState in an effect body cascades a render, which
    // the compiler rightly refuses.
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(frame);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near || !holder.current || pins.length === 0) return;

    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
        // The stylesheet goes in as a <link> rather than an import. A dynamic
        // CSS import is not something every bundler handles, and a static one
        // would put Leaflet's stylesheet in the page chunk for every reader,
        // including the ones who never scroll to the map.
        ensureLeafletCss();
        if (cancelled || !holder.current) return;

        map = L.map(holder.current, {
          // A map that swallows page scroll on a phone is a map people fight.
          // Ctrl/⌘ + wheel still zooms; two fingers still pan.
          scrollWheelZoom: false,
          attributionControl: true,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Leaflet's default marker images resolve against the page URL and 404
        // under a bundler. A divIcon avoids the asset entirely and lets the pin
        // carry the site's own colour.
        const icon = (verified: boolean) =>
          L.divIcon({
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);background:${
              verified ? '#15803d' : '#b45309'
            }"></span>`,
          });

        const group = L.featureGroup(
          pins.map((p) =>
            L.marker([p.lat, p.lng], { icon: icon(p.isVerified), title: p.name }).bindPopup(
              `<strong>${escapeHtml(p.name)}</strong>${
                p.tagline ? `<br>${escapeHtml(p.tagline)}` : ''
              }<br><a href="/business/${encodeURIComponent(p.slug)}">${escapeHtml(
                t('viewListing'),
              )}</a>`,
            ),
          ),
        ).addTo(map);

        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
        } else if (center) {
          map.setView([center.lat, center.lng], 9);
        }
      } catch {
        // A failed map is a missing section, not a broken page.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [near, pins, center, t]);

  if (pins.length === 0 || failed) return null;

  return (
    <div className="overflow-hidden rounded-xl border">
      <div
        ref={holder}
        role="region"
        aria-label={label}
        className="h-[22rem] w-full bg-secondary"
      >
        {!near && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {t('loading', { count: pins.length })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Adds Leaflet's stylesheet once per document, on first use. */
function ensureLeafletCss(): void {
  const id = 'leaflet-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  // Self-hosted from public/vendor. A CDN would hand every reader's IP to a
  // third party for a 15KB stylesheet, and add a failure the site does not control.
  link.href = '/vendor/leaflet.css';
  document.head.appendChild(link);
}

/**
 * Popup content is built as an HTML string, which is Leaflet's API, so business
 * names go through here first. A listing is named by whoever imported it.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
