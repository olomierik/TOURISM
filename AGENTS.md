<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

- Offline/installable support is Serwist: the worker is `app/sw.ts`, served by `app/serwist/[path]/route.ts`, registered only from `components/pwa/service-worker.tsx`. Keep signed-in areas, auth, `/api` and the database host NetworkOnly in `app/sw.ts` — a cached private page would leak to the next person on a shared phone.
- Site navigation lives in `components/layout/site-sidebar.tsx` (always-open rail on lg+, slide-in drawer below lg, portalled to <body>); `site-header.tsx` keeps only logo, wildlife, search, locale, theme, account and CTA. Add menu items in the sidebar, not the header — one list, one place.
