# Explore Tanzania

A Tanzania-focused tourism discovery and **lead-generation marketplace**. Travelers find
destinations and operators, request a quote, and the enquiry is distributed to matching
businesses — who pay for placement and lead access.

Not a booking engine and not an ad-supported blog. The funnel is:

> **Discover → Compare → Request Quote → Distribute Lead → Monetize**

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS v4 + shadcn/ui idiom |
| i18n | `next-intl` — English, German, French, Italian |
| Database | Supabase Postgres 17 (Auth, Storage, RLS) |
| Payments | Flutterwave (cards + M-Pesa / Tigo Pesa / Airtel Money) |
| Hosting | Vercel |

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npm run dev
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:test` | Verify the Supabase connection and list tables |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Load (or refresh) the demo dataset |
| `npm run db:verify` | Assert schema, search, lead matching and RLS behaviour |
| `npm run db:verify:auth` | Assert signup, role assignment and escalation guards |
| `npm run db:types` | Regenerate TypeScript types from the live schema |

## Internationalization

Four locales ship from day one: `en` (default, served at the root), `de`, `fr`, `it` —
the largest European safari source markets after the UK/US.

**URL segments are localized**, because translated paths measurably outrank generic
English ones in non-English search:

| English | German | French | Italian |
|---|---|---|---|
| `/destinations` | `/de/reiseziele` | `/fr/destinations` | `/it/destinazioni` |
| `/directory` | `/de/verzeichnis` | `/fr/annuaire` | `/it/elenco` |
| `/guides` | `/de/reisefuehrer` | `/fr/guides` | `/it/guide` |
| `/request-quote` | `/de/angebot-anfordern` | `/fr/demande-de-devis` | `/it/richiedi-preventivo` |

Route definitions live in [`i18n/routing.ts`](i18n/routing.ts). Always import `Link`,
`useRouter` and `redirect` from [`i18n/navigation.ts`](i18n/navigation.ts) rather than
from `next/*`, or localized paths will not resolve.

Dynamic slugs (`/destinations/[slug]`) are **not** listed there — those come per-locale
from the database, so each locale can carry its own slug.

Hitting an English slug under a locale prefix redirects to the canonical localized URL
(`/de/destinations` → `/de/reiseziele`), consolidating stray links instead of 404ing.

## Project layout

```
app/[locale]/          Every public route; the locale layout owns <html>
components/ui/         Primitives (button, badge, dropdown)
components/layout/     Header, footer, logo, locale switcher, theme
components/home/       Homepage sections
i18n/                  Routing, navigation and request config
lib/seo.ts             Canonical URLs + hreflang cluster generation
messages/              Translation catalogues, one JSON per locale
scripts/               Database tooling (connection test, migrations)
proxy.ts               Locale routing (Next 16's renamed middleware)
```

## Database

41 tables on Postgres 17, **RLS enabled on every one of them**. Migrations are numbered
SQL files in `supabase/migrations/`, applied by `scripts/migrate.mjs` — each runs in its
own transaction and is checksummed, so editing a migration that has already been applied
is a hard error rather than a silent divergence.

**Translations are tables, not JSONB columns.** Each translatable entity has a
`*_translations` table keyed on `(entity_id, locale)`. That allows a per-locale
`tsvector` index, per-locale SEO fields, and per-locale slugs — none of which work
cleanly if translations live in a JSONB blob.

**Search is per-locale.** Every translation row is indexed with the Postgres dictionary
for its own language, so German compounds stem as German and French elisions as French.
`unaccent` means an unaccented query still matches accented content.

**Lead matching runs server-side.** `match_lead_to_businesses()` scores an enquiry,
selects eligible businesses, ranks them (plan priority → featured → responsiveness →
rating → random tiebreak), records the distribution and queues notifications. It is a
`security definer` function precisely so a business cannot influence its own rank.

**Privileged fields are guarded by triggers, not just policies.** RLS gates rows, not
columns, so a business owner is separately prevented from approving their own listing,
self-verifying, changing their own tier, or reassigning ownership.

### Verification

`npm run db:verify` runs 33 assertions covering per-locale stemming, accent folding,
the taxonomy slug-collision guard, lead scoring and distribution ranking, and every RLS
boundary — checked by switching into the real `anon` and `authenticated` roles with
`request.jwt.claims` set the way PostgREST would, inside transactions that always roll back.

## Auth

Three roles — `traveler`, `business_owner`, `admin` — with a profile row created
automatically by a database trigger whenever Supabase creates an auth user, so a
profile always exists regardless of how someone signed up.

**Admin is never self-assignable.** The signup form offers only traveler and business
owner, the server action rejects anything else, and the trigger clamps the value a
third time. `npm run db:verify:auth` asserts that signing up with `role: "admin"` in
the metadata produces a traveler.

**Route protection lives in `proxy.ts`.** Protected prefixes are resolved into every
locale up front, because the request arrives carrying the localized path (`/de/konto`),
not the internal one (`/account`) — matching internal hrefs would silently protect only
English. An unauthenticated visitor is redirected to the login page *in their own
language* with their destination preserved; a signed-in user with the wrong role gets a
404 rather than a 403, since confirming `/admin` exists tells a prober something useful.

Session checks use `getUser()`, not `getSession()`: the latter trusts the cookie, which
a client can forge. Public routes skip the auth round-trip entirely so the SEO-critical
pages stay fast.

### Three clients, three privilege levels

| Module | Key | Use |
|---|---|---|
| `lib/supabase/client.ts` | publishable | Browser; RLS applies |
| `lib/supabase/server.ts` | publishable | Server components; reads as the signed-in user, RLS applies |
| `lib/supabase/admin.ts` | secret | Bypasses RLS. Imports `server-only`, so using it from a client component is a build error |

## Demo data

`npm run db:seed` loads 8 destinations, 6 categories, 16 businesses, 16 packages, 6 travel
guides and the Serengeti migration calendar — every one translated into all four locales.

The seed is idempotent: it upserts on stable natural keys, so re-running converges instead
of duplicating and existing UUIDs survive. **Every seeded row carries `is_demo = true`** and
is named so it cannot be mistaken for a real Tanzanian operator.

## Design system

Tokens live in [`app/globals.css`](app/globals.css) as OKLCH custom properties with a
full dark-mode set.

The palette is drawn from the landscape rather than a generic SaaS ramp: savanna amber
for primary actions, Indian Ocean teal for trust signals, and **warm-tinted neutrals** —
cold blue-greys make travel photography look washed out, warm greys make it glow.

`--header-h` is the single source of truth for header height; any hero sitting behind
the sticky header pulls up by exactly that amount.

## Conventions

- **No dead links.** Routes that are not built yet render an honest in-progress state,
  never a 404 behind a nav item that looks functional.
- **Ads are confined to guide/blog routes.** Business profiles, packages, the directory
  and the quote funnel stay ad-free — a qualified safari lead is worth orders of
  magnitude more than an ad click.
- **Secrets never reach the browser.** Only `NEXT_PUBLIC_*` is client-visible; the
  Supabase service-role key is server-only.
- Demo listings are always visibly labelled as demo and never implied to be real
  verified companies.

## Build status

Phase 0 (foundation) is complete: design system, four-locale routing with localized
paths, app shell, and reciprocal `hreflang`. See the build plan for remaining phases —
schema and RLS, auth, public discovery, the lead engine, dashboards, SEO, monetization.
