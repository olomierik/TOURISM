'use client';

import { useEffect, useRef } from 'react';

import { ensureLeafletCss } from '@/components/map/pin-map';

export type SightingPoint = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  date: string;
  place: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The traveller's own sightings on a map. Leaflet is loaded only in the
 * browser and only for this page; OpenStreetMap tiles, as on the rest of the
 * site, so no key is needed.
 */
export function SightingsMap({ points, label }: { points: SightingPoint[]; label: string }) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!holder.current || points.length === 0) return;
    let map: import('leaflet').Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      await ensureLeafletCss();
      if (cancelled || !holder.current) return;

      map = L.map(holder.current, { scrollWheelZoom: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        html: '<span class="pin-dot" style="background:var(--gold)"></span>',
      });

      const markers = points.map((p) =>
        L.marker([p.lat, p.lng], { icon, title: p.name }).bindPopup(
          `<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.date)}${
            p.place ? ` · ${escapeHtml(p.place)}` : ''
          }`,
        ),
      );
      const group = L.featureGroup(markers).addTo(map);
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], 10);
      else map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 12 });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return (
    <div
      ref={holder}
      role="region"
      aria-label={label}
      className="h-80 w-full overflow-hidden rounded-lg border bg-surface-sunken sm:h-[26rem]"
    />
  );
}
