# design-migration.md — codebase map

Phase 0 deliverable for `design.md` (spec dated 25 Oct 2026, §0.2 and §15).
Written against `main` at `0b124c6` ("Savanna Modern: redesigned homepage and
cards"). Everything below was measured, not recalled.

Companion: [`competitor-teardown.md`](./competitor-teardown.md).

---

## 1. Where the things the spec names actually live

| Spec asks for | File | Notes |
|---|---|---|
| Global stylesheet holding `:root` tokens | `app/globals.css` | 18.3 KB, **152** custom properties, `@theme inline` opens at line 172 |
| Font loader | `app/[locale]/layout.tsx` | `Plus_Jakarta_Sans` from `next/font/google` (line 5, bound line 26) — spec §0.2 is correct |
| Shared UI folder | `components/ui/` | 14 files, 1,066 lines |
| Header | `components/layout/site-header.tsx` | 325 lines |
| Footer | `components/layout/site-footer.tsx` | 106 lines |
| Bottom nav | `components/layout/mobile-tab-bar.tsx` | 84 lines |
| Translation files | `messages/{en,de,fr,it,sw}.json` | **1,813 keys each, no drift** |

Also present and relevant, not named in §0.2:

- `components/cards/` — `business-card`, `destination-card`, `guide-card`,
  `package-card`, `card-image`, `card-skeleton`, `media-placeholder`
- `components/layout/` also holds `breadcrumbs`, `locale-switcher`, `logo`,
  `section`, `site-schema`, `theme-script`, `theme-toggle`, `user-menu`
- `i18n/routing.ts` — `locales = ['en','de','fr','it','sw']`, default `en`

## 2. Corrections to the spec's assumptions

Three places where `design.md` describes something that is not the case here.
Verified by inspection; none of them invalidate the spec, but Phase 1 should not
be planned around them.

**There is no shadcn/ui.** §0.2 says "shadcn-style CSS variables" — the *token
names* are shadcn-shaped (`--background`, `--card`, `--ring`), and that part is
right. But `components/ui/` is hand-written: `button`, `select`, `table`,
`tabs`, `label`, `badge`, `alert`, `input`, `textarea`, `skeleton`, `rail`,
`row-list`, `stat`. Only `dropdown-menu.tsx` wraps Radix. There is no
`components.json`, no shadcn CLI, and `npx shadcn add` would not fit the
existing API conventions. **Phase 2 "Core controls" means editing these files,
not installing a library.**

**Raw hex is already effectively clean.** §0.3 wants a CI grep that fails on raw
hex outside the token file, and §15 Phase 1 lists it as work. Current count in
`app/` + `components/`: **7 matches, 0 of them real violations** —

- `components/map/pin-map.tsx:167-168` — two hexes inside a *comment*
  recording the retired flag colours (`#009E60`, `#B98900`). The code itself
  reads `var(--primary)` / `var(--success)`.
- `components/auth/social-buttons.tsx` — 4 fills in Google's logo SVG
  (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`). Brand marks cannot be
  tokenised; the lint rule needs an allowlist for this file.

**The real cleanup is arbitrary sizes, not colours: 56 bracket literals**
(`[13px]`, `[1.5rem]`, `[10.5rem]` …) across `app/` and `components/`.

**Swahili is complete, not partial.** §2.2 G11 reports "about 17 English words
remain on `/sw`" and "category chips stay English". All five locale files carry
**1,813 keys each**, so nothing is structurally missing — any remaining English
is a *translation value*, not an absent key, and `global.d.ts` types `Messages`
from `en.json`, so a missing key is a build error. G11 is a copy-review task,
not an engineering one.

## 3. Token gap — what Phase 1 actually has to do

7 of the spec's 18 semantic tokens exist under the exact name. **11 are
missing**, but four of those already exist under a different name, so this is
partly aliasing rather than new work.

### Present, keep as-is
`--background` · `--foreground` · `--muted-foreground` · `--border` ·
`--primary` · `--primary-foreground` · `--ring`

### Missing, but an equivalent exists — alias and retune
| Spec token | Existing equivalent |
|---|---|
| `--surface` | `--card` |
| `--surface-muted` | `--muted` |
| `--danger` | `--destructive` |
| `--highlight` | `--warning` (close; spec wants Sun `#F4B400`, fills only) |

### Genuinely new — must be added
`--surface-sunken` · `--subtle-foreground` · `--border-strong` ·
`--primary-hover` · `--primary-subtle` · `--highlight-foreground` ·
`--whatsapp`

`--border-strong` matters most: the spec makes it the **input border**
specifically to satisfy WCAG 1.4.11 non-text contrast at 3.14:1. Today inputs
use `--border`, which is a decorative-weight line.

### Existing tokens the spec does not name (23)
`--accent`, `--accent-foreground`, `--accent-strong`, `--banner`,
`--banner-foreground`, `--card`, `--card-foreground`, `--destructive`,
`--destructive-foreground`, `--header-h`, `--input`, `--muted`, `--popover`,
`--popover-foreground`, `--sand`, `--sand-border`, `--secondary`,
`--secondary-foreground`, `--success`, `--success-foreground`, `--warning`,
`--warning-foreground`, `--warning-strong`

Each needs a decision in Phase 1: map to a spec token, keep as an extension, or
retire. `--accent` is the one the spec explicitly targets — §3 says "Remove
`--accent: #d13c1f` usage from CTAs", and G1 calls it one of the two competing
accents. It is currently `oklch(0.575 0.190 33)` (red-orange) against
`--primary: oklch(0.530 0.190 258)` (blue), which confirms G1 exactly.

Note the spec's §3 instruction — *"Keep the existing shadcn variable names
mapped to the new values so existing components keep working during migration"*
— means Phase 1 is a **value swap plus additions**, not a rename. Nothing in
`components/` should need editing to change colour, because Tailwind v4's
`@theme inline` retunes every existing utility in place.

## 3b. Correction: cover-image coverage is ~5%, not 55%

`cover_image_url` is set on 1,428 of 2,618 listings, which is where "55%" came
from. But **92% of those URLs are Google Places photo links**
(`lh3.googleusercontent.com`), and **39 of 40 sampled return 403** — those URLs
expire. Roughly 90% of cover images do not load.

Any plan that leans on existing photography should use ~5%, and §5.2 ingestion
(fetch and store, don't reference) moves ahead of the Phase 4 card work.

## 4. Open items carried into Phase 1

1. **§9.2 cannot be satisfied.** Home "Featured" requires licence-checked + ≥3
   photos + ≥3 reviews ≥4.0. Measured: 11 licence numbers, 3 claimed listings,
   **0 reviews** site-wide. No listing can qualify, so the section hides
   permanently (§7.1.7). §7.2's "Recommended" sort has the same problem — four
   near-constant columns. See `competitor-teardown.md` §6 for the proposed
   interim rule. **Needs Erick's decision; belongs in §17.**
2. **`/_design` does not exist.** Phase 0 scaffolds it (§0.7): dev and preview
   builds only, `noindex`.
3. **Lint rule needs an allowlist** for `components/auth/social-buttons.tsx`
   (Google brand SVG) before it can be set to fail the build.

## 5. Phase 0 status

| Item | State |
|---|---|
| Codebase map (§0.2) | **done** — this file |
| Competitor research | **done** — `competitor-teardown.md` |
| Screenshot baseline | pending |
| `/_design` route scaffold | pending |

---

# Phases 4–9: what was built, and what the data said

Written after the work, from measurements taken in the browser and against the
database rather than from the plan. Where a measurement contradicted the spec,
that is recorded here and the resolution is in the commit that made it.

## 6. Three corrections to this document's own numbers

**§3b said photo coverage is ~5%. That was right about covers and silent about
galleries, which are worse.** Both tables were sampled this time:

| Table | Rows | Hotlinked to Google | Sampled | Loaded |
|---|---|---|---|---|
| `businesses.cover_image_url` | ~1,440 set | 92% | 30 | **3** |
| `media` (business photos) | 4,644 | 96% (`lh3.googleusercontent.com`) | 30 | **1** |

So "1,268 listings have three or more photos" means 1,268 listings with three
or more dead links. §5.2's width filter cannot run either: `media.width` is
NULL on all 4,480 business rows.

Destination covers are the exception and the reason the new hero works: every
Tanzanian destination cover is in Supabase storage and all 12 sampled returned
200. The imagery problem is specific to business listings.

**§4.1 said 0 reviews. There is 1.** It does not change the conclusion — §9.2
needs three per listing — but the number in this file was wrong.

**The light-mode control border was 2.76:1, not the 3.14:1 Phase 1 claimed.**
Every oklch token in the palette had been hand-converted from its hex and most
had drifted. All 46 are now derived arithmetically from the hex in their own
comment. This is the clearest argument in the project for measuring in the
browser: the commit that introduced the failure asserted the correct figure.

## 7. Where the spec contradicts itself, and what was done

| Conflict | Resolution |
|---|---|
| §3.1 gives dark `--border-strong` #5C6B63 (2.94:1); §10 requires 3:1 for a control boundary | Accessibility wins — lightened to #6B7A72 (3.29–4.09:1 across the dark surfaces) |
| §9.2 "Featured placement is never paid" vs. `subscription_tier = featured`, a product operators pay for | The **badge** is gone (§6.4 gives Featured none, §8.2 says it is never sold). The paid tier still orders the grid. Removing a paid benefit is a business decision, not a design one — **still Erick's** |
| §5.3 wants a 4:5 hero photo on mobile; §7.1's mobile hero lists only H1, lead, Where and CTA | Kept the photo, per §5.3 |
| §6.4 says show response rate above five enquiries | The denominator is not readable publicly (`lead_businesses` is RLS-protected, no denormalised count on `businesses`), so the row is **removed**, not gated |

## 8. Still outstanding

1. **§9.2 remains unsatisfiable.** 11 licence numbers, 3 claims, 1 review.
   `lib/curation.ts` implements the gate honestly and Home "Featured" and most
   "Similar operators" rows therefore render nothing, which is §7.1.7's own
   instruction. Fixed by photo ingestion and licence checks, not by code.
2. **§5.2 photo ingestion** is the blocking product change. ~900 images to
   fetch and store. Until then MediaFallback is the common case, not the edge.
3. **No consent column on `leads`.** §7.7's checkbox is required and enforced
   at the point of collection, but the agreement is not recorded. Needs a
   migration before this is a defensible record.
4. **Maskable PWA icon.** `public/` has no raster icons; the manifest points at
   `logo.svg`. Needs artwork.
5. **Swahili needs a native review.** All five locales are at 1,971 keys with
   zero missing, and the new Swahili copy follows §8.1's vocabulary table, but
   §8.1 requires a native speaker before launch.
6. **PRIME AUDITORS** is still filed under "Safaris & Tour Operators" while
   describing itself as an accounting firm, and sorts first in the directory
   because it is claimed. §9.4 wants a one-off audit of travel categories.
7. **Dashboard and admin ship visually unverified.** Signing in is outside what
   was done here; only `db:verify:dashboard` (16/16) and `db:verify:admin`
   (17/17) cover those paths.

## 9. Measured against the §15 acceptance criteria

| Phase | Acceptance | Result |
|---|---|---|
| 4. Cards and media | No initials tiles or illustration placeholders anywhere | **met** — 0 of each in the rendered directory |
| 5. Home | Mobile ≤ 4,500px; one primary CTA per viewport | **met** — 4,327px mobile, 3,933px desktop |
| 6. Listings | Filters auto-apply and sync URL; no "0%" or empty map | **met** — and the category filter, which returned all 1,521 rows, now returns 345 |
| 7. Quote flow | State survives a reload | **met** — verified by editing, reloading and re-reading |
| 8. Content templates | Tables convert to cards < 768px | **met** — 46 cards on the July page |
| 9. Hardening | Contrast, dark mode, reflow | **met** at the points measured; a full Lighthouse run against a production build has not been done |

The §14 gates not covered here: Playwright end-to-end for the quote flow, a
pseudo-locale pass for +35% text length, and Lighthouse. No real enquiry was
submitted during this work — the `leads` table is unchanged — because sending
one emails real operators.
