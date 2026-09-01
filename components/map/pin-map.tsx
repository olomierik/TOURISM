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
  /**
   * How well the coordinate locates the business. 'city' is a centroid from
   * the town name and can sit twenty kilometres from the door, so it is drawn
   * as a soft halo rather than a pin and says so when opened. Drawing the two
   * identically would be the same invented precision as a fabricated distance,
   * except harder to argue with, because a map looks like evidence.
   */
  precision?: 'exact' | 'city' | null;
  /** Only used to name a group of centroid listings. */
  city?: string | null;
  /**
   * Built by the caller with getPathname, because the listing route is
   * translated — /business/x in English, /anbieter/x in German. Hardcoding the
   * English path works only because middleware redirects it, which is a round
   * trip per click and a link that is wrong in three of the four markets.
   */
  href: string;
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
  you = null,
  className,
}: {
  pins: Pin[];
  center: { lat: number; lng: number } | null;
  label: string;
  /**
   * Where the search was run from, for near-me. Usually the viewer's own
   * position — which is never sent anywhere — but the page also offers
   * destination chips, and a pin over Arusha that says "you are here" to
   * somebody in Berlin is worse than no pin. So the caller names it.
   */
  you?: { lat: number; lng: number; label: string } | null;
  className?: string;
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
    let resize: ResizeObserver | null = null;
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
        // carry the site's own colour: brand green for a verified listing and
        // gold for the rest, the same two the cards use, so the map does not
        // introduce a third vocabulary. Town-placed listings get neither,
        // because a group of them can hold both kinds and colouring it by the
        // first one would be a claim about the other nine.
        const icon = (p: Pin, count = 1) =>
          p.precision === 'city'
            ? (() => {
                // Bigger when it holds more, and captioned with the number, so
                // the reader can see that one circle is not one business.
                const size = count > 1 ? Math.min(46, 26 + Math.round(Math.log2(count) * 5)) : 26;
                return L.divIcon({
                  className: '',
                  iconSize: [size, size],
                  iconAnchor: [size / 2, size / 2],
                  // Soft, edgeless, and larger than a pin: it reads as an area
                  // rather than a point, which is exactly what is known.
                  html:
                    `<span style="display:flex;align-items:center;justify-content:center;` +
                    `width:${size}px;height:${size}px;border-radius:9999px;` +
                    `background:rgba(11,61,145,.18);border:1px dashed #0B3D91;` +
                    `font:600 11px/1 ui-sans-serif,system-ui,sans-serif;color:#0B3D91">` +
                    `${count > 1 ? count : ''}</span>`,
                });
              })()
            : L.divIcon({
                className: '',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
                html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);background:${
                  p.isVerified ? '#009E60' : '#B98900'
                }"></span>`,
              });

        // Centroid listings are stacked, not scattered: 270 of them share the
        // single point that is Nairobi. Drawn one marker each, they are 270
        // identical circles on top of each other — a map that looks like one
        // business and answers a click with whichever marker happened to land
        // on top. So they are grouped by the point they actually share, and
        // the marker says how many are there. Nothing is moved to make the
        // picture nicer; the picture is made to match the data.
        const exact = pins.filter((p) => p.precision !== 'city');
        const stacks = new Map<string, Pin[]>();
        for (const p of pins) {
          if (p.precision !== 'city') continue;
          const key = `${p.lat},${p.lng}`;
          const at = stacks.get(key);
          if (at) at.push(p);
          else stacks.set(key, [p]);
        }

        const markers = [
          ...exact.map((p) =>
            L.marker([p.lat, p.lng], { icon: icon(p), title: p.name }).bindPopup(
              `<strong>${escapeHtml(p.name)}</strong>${
                p.tagline ? `<br>${escapeHtml(p.tagline)}` : ''
              }<br><a href="${escapeHtml(p.href)}">${escapeHtml(t('viewListing'))}</a>`,
            ),
          ),
          ...[...stacks.values()].map((at) => {
            const head = at[0];
            const title = at[1]
              ? t('inTown', { count: at.length, city: head.city ?? '' })
              : head.name;
            // Capped: a popup listing 251 businesses is not a popup. The rest
            // are on the page below it, which is where a list belongs.
            const shown = at.slice(0, 8);
            // A group lists its members by name; a single listing already has
            // its name in the heading, so the link says what it does instead.
            const links = at[1]
              ? shown
                  .map((p) => `<a href="${escapeHtml(p.href)}">${escapeHtml(p.name)}</a>`)
                  .join('<br>')
              : `<a href="${escapeHtml(head.href)}">${escapeHtml(t('viewListing'))}</a>`;
            return L.marker([head.lat, head.lng], {
              icon: icon(head, at.length),
              title,
            }).bindPopup(
              `<strong>${escapeHtml(title)}</strong><br>` +
                `<em>${escapeHtml(t('approxPin'))}</em><br>${links}` +
                (at.length > shown.length
                  ? `<br>${escapeHtml(t('andMore', { count: at.length - shown.length }))}`
                  : ''),
            );
          }),
        ];

        const group = L.featureGroup(markers).addTo(map);

        // The viewer's own dot, in the primary blue so it cannot be mistaken
        // for a listing. It is drawn from a value that lives in this component
        // and is never sent anywhere.
        if (you) {
          // Added to the group rather than straight to the map, so the fitted
          // bounds below include the viewer. A map of nearby operators that
          // does not contain the person they are near is a map of somewhere else.
          group.addLayer(
            L.marker([you.lat, you.lng], {
              icon: L.divIcon({
                className: '',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#0B3D91;border:3px solid white;box-shadow:0 0 0 3px rgba(11,61,145,.25)"></span>`,
              }),
              title: you.label,
              // Above the listings: it is the reference point for all of them.
              zIndexOffset: 1000,
            }).bindPopup(escapeHtml(you.label)),
          );
        }

        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
        } else if (center) {
          map.setView([center.lat, center.lng], 9);
        }

        // Leaflet measures its container once, at construction, and then
        // believes that measurement forever. On a page that is still settling
        // — images arriving above the map, fonts swapping, a phone rotating —
        // it ends up loading tiles for a box smaller than the one it is drawn
        // in, and the remainder stays grey. Re-measuring on every resize of
        // the container is the fix; the observer is cleaned up with the map.
        const remeasure = () => map?.invalidateSize();
        requestAnimationFrame(remeasure);
        if (typeof ResizeObserver !== 'undefined' && holder.current) {
          resize = new ResizeObserver(remeasure);
          resize.observe(holder.current);
        }
      } catch {
        // A failed map is a missing section, not a broken page.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      resize?.disconnect();
      map?.remove();
    };
  }, [near, pins, center, you, t]);

  if (pins.length === 0 || failed) return null;

  // The legend lists only what is on this map. Explaining a dashed circle to
  // somebody looking at four solid dots is noise, and worse, it suggests a
  // distinction the picture in front of them does not contain.
  const legend = [
    pins.some((p) => p.precision !== 'city' && p.isVerified) && {
      key: 'verified',
      swatch: 'bg-[#009E60] border-2 border-white shadow-sm',
    },
    pins.some((p) => p.precision !== 'city' && !p.isVerified) && {
      key: 'listed',
      swatch: 'bg-[#B98900] border-2 border-white shadow-sm',
    },
    pins.some((p) => p.precision === 'city') && {
      key: 'approximate',
      swatch: 'bg-primary/20 border border-dashed border-primary',
    },
    you && { key: 'origin', swatch: 'bg-primary border-2 border-white shadow-sm' },
  ].filter((e): e is { key: LegendKey; swatch: string } => Boolean(e));

  return (
    <div className={className}>
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

      {/* Rendered whether or not the map itself has loaded: it is text, it
          costs nothing, and a reader who never scrolls far enough to trigger
          the map still gets told what the symbols would have meant. */}
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {legend.map((e) => (
          <li key={e.key} className="flex items-center gap-1.5">
            <span className={`size-3 shrink-0 rounded-full ${e.swatch}`} aria-hidden />
            {t(`legend.${e.key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The four things a symbol on this map can mean. */
type LegendKey = 'verified' | 'listed' | 'approximate' | 'origin';

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
