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
