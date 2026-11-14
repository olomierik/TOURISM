# Brand

`logo-source.jpg` is the official Explore Tanzania logo exactly as it was
supplied on 14 November 2026. It is the source of every mark in the
repository. Nothing else in `public/` is drawn by hand any more.

```bash
node scripts/generate-brand-assets.mjs --dry   # report what would change
node scripts/generate-brand-assets.mjs         # write it
```

That one command produces all of this, and it is the only thing that should:

| | |
|---|---|
| `public/brand/emblem.svg` | the artwork traced to vector, the record copy |
| `public/logo.svg` | square tile, offered by the web manifest |
| `public/icon-192.png`, `icon-512.png` | app icons — `icon-512` is also the logo Google shows beside a search result, through the `Organization` schema in `components/layout/site-schema.tsx` |
| `public/icon-maskable-512.png` | Android's adaptive icon, inset for the mask |
| `public/apple-touch-icon.png` | iOS home screen |
| `app/favicon.ico` | 16, 32 and 48 |
| `public/logo-email.png` | the mark in transactional mail |
| `public/splash/*.png` | 40 iOS launch screens, mark replaced in place |
| `components/layout/logo-paths.ts` | the outlines the site header inlines |

## The colours

Measured off the artwork, not chosen:

- **Pine `#1e3228`** — the mountain, the acacia, and the type in the lockup.
- **Gold `#c79843`** — the sun, and nothing else.

They live in `app/globals.css` as `--brand-mark` and `--brand-gold`, outside
the semantic palette on purpose: `--primary` is terracotta and drives every
button on the site, and a logo wearing the call-to-action colour competes with
all of them.

`--brand-mark` reverses in dark mode, because pine measures 1.6:1 against the
dark ground. The snow cap and the gaps between the branches are holes in the
path rather than white shapes, so they show whatever is behind the mark and
keep their contrast on either theme without a second file.

## If the logo changes again

Replace `logo-source.jpg` and re-run the command. Two things to look at
afterwards, because neither can be checked by reading a diff:

1. **The thresholds.** `isGreen` and `isGold` in the script assume two flat
   colours on white. A logo with a gradient, a third colour or a dark ground
   needs them adjusted, and the script will happily trace nonsense without
   complaining.
2. **The crops.** `CROPS` holds three framings of one drawing — the full
   artwork, a square-ish icon, and a tight summit for 16–48px. They are
   fractions of the traced bounds, so they survive a re-trace of the same
   artwork, but a differently-proportioned logo needs them re-chosen by eye.
   The script's header explains what each is for and why there are three.

The launch screens are the one output that is edited rather than rendered: the
wordmark on them is set in Fraunces, which the renderer cannot load, so only
the mark is swapped and the type is left alone. That also means the splash
wordmark still reads "Tanzania" in terracotta while the logo's own wordmark is
pine — a deliberate leftover, not an oversight. Changing it means re-rendering
all forty with the font available.
