# Advertising (Google AdSense)

Ads are built, placed and switched off. What stands between here and revenue is
Google's review, not code.

## Where the account actually stands

Checked in the AdSense dashboard on 2026-10-27, publisher `pub-9645056123999913`:

| | |
|---|---|
| Payments profile | complete |
| Ad settings | confirmed |
| **Site approval** | **"Needs attention — Low value content"**, reviewed 2026-09-15 |
| ads.txt | live and correct at `/ads.txt`; AdSense still shows "Not found" because it last looked on 2026-09-15, before the file existed |
| Ad units | **Site-wide page foot** — slot `3493001294`, responsive Display, created 2026-10-27 |
| EEA/UK consent message | **Published** 2026-10-27 — "Explore Tanzania - EEA consent", en + de/fr/it, with a "Do not consent" button enabled for every EEA country |
| US state consent message | **Published** 2026-10-27 — "Explore Tanzania — US states opt-out", en-US, opt-out on |
| Policy center | no current issues |
| `NEXT_PUBLIC_ADS_ENABLED` in production | **true**, set in Netlify 2026-10-27, all deploy contexts |
| `NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT` in production | **3493001294**, set in Netlify 2026-10-27, all deploy contexts |

The two variables are set but not yet *live*: `PageFootAd` is on
`feat/ask-all-saved-operators`, and production still serves `main`. The ads
reach the site when that branch merges and Netlify rebuilds `main`.

They also do nothing on a deploy preview, by design. `adsEnabled` requires
`NEXT_PUBLIC_ALLOW_INDEXING=true`, which is scoped to the production context
only, so a preview serves `Disallow: /` and no ad code — verified on
`deploy-preview-77`, which has the variables and still ships neither the
`adsbygoogle` script nor an `<ins>`.

**"Low value content" is a rejection, not a warning.** Until the site passes a
re-review, the ad code can be switched on and no ad will ever fill. That is
survivable — units collapse when nothing arrives (see below) — but it earns
nothing.

What a re-review asks for is original writing that a visitor could not get from
Google Maps. docs/ADSENSE-CONTENT-AUDIT.md measures how much of that the site
actually has — about 70 written pages against 2,618 generated ones — and what
would change the answer. The short version: fifteen finished guides exist only
in German and cannot be seen by an English reviewer, and 1,471 listing pages
share a single sentence.

## Where ads appear

**Every page gets one**, at the end of the content column, immediately above
the footer — `PageFootAd`, rendered once in `app/[locale]/layout.tsx`.

The position is the whole argument. At the foot of the content it sits below
every heading, every form field and every call to action on the page, so there
is no reading order in which it comes between somebody and the thing they came
to press. That is the failure mode of the sidebar unit, the in-header
leaderboard, and every anchor and vignette format Auto ads injects if it is
left to choose.

Three pages carry a second unit, placed by the page itself where it knows a
break in the content is:

| Page | Placement |
|---|---|
| `/directory` | across the row, after the eighth result |
| `/destinations/[slug]` | below the packages |
| `/guides/[slug]` | between the introduction and the article |

## Where ads never appear

Enforced centrally by `pathAllowsAds` in `lib/ads.ts`, matched on the internal
pathname, so `/request-quote` also covers `/de/angebot-anfordern` and the other
three locales without listing them.

- **The funnel** — `/request-quote`, `/enquiry/*`, `/review/*`,
  `/business/*/claim`. Excluded on value, not taste: a qualified enquiry is
  worth $20–200 to an operator, an AdSense click is worth cents, and the ad
  most likely to be served to somebody half-way through describing a Tanzania
  trip is a competitor's.
- **Signed-in areas** — `/account/*`, `/dashboard/*`, `/admin/*`. Tools their
  owners are working in.
- **Auth** — `/login`, `/signup`, `/register`, `/welcome`. Three fields and a
  button.
- **`/privacy` and `/terms`** — the pages an AdSense reviewer opens to check
  the advertising disclosure, which is a poor place to be running advertising.

### Auto ads is already on, and this file does not bind it

Measured on the live home page, 2026-10-27: the server sends **one** `<ins>`,
the browser ends up with **two**. The second has no `data-ad-slot` and no
`data-ad-surface` wrapper, which makes it AdSense's rather than ours — Auto ads
placing a unit of its own choosing.

Nothing is visible today because it comes back `unfilled` like everything else.
On approval it stops being harmless: Auto ads places anchors, vignettes and
mid-content units, which is precisely the interference the placement rule above
exists to prevent, and `pathAllowsAds` cannot stop it — that list only governs
the units this codebase renders.

**The switch is in the dashboard, and it is not reachable yet.** Ads → By site
has the Auto ads and Page exclusions columns, but the table is empty until the
site passes review; Global settings offers only mobile ad-size optimisation.
So: the first thing to do after approval, before any traffic sees it, is turn
Auto ads off for `exploretanzania.online` — or, if it is kept, set the ad-free
list above under Auto ads → Page exclusions, because Auto ads ignores this
file.

## When no ad arrives

Each unit reserves its height so the page does not jump when an ad loads, and
gives that height back when one does not: `AdUnit` watches AdSense's own
`data-ad-status` and hides the box on `unfilled`, and after 5 seconds hides it
anyway unless an ad has actually filled.

That last part is what makes an unapproved site, or a visitor with an ad
blocker, look like a page with no ad rather than a page with a 300px hole in
it. AdSense inserts a placeholder `<div>` as soon as it has *processed* a unit,
whether or not an ad is coming, so "has it got children" cannot tell the two
apart — only `filled` can.

## Switching ads on

Steps 2 and 3 of this list are already done. What remains:

1. **Get approved.** Sites → `exploretanzania.online` → request review — but
   not yet, and not before docs/ADSENSE-CONTENT-AUDIT.md's first and third
   items are addressed. The stub-listing `noindex` fix landed on 2026-09-04,
   eleven days *before* the rejection, so it is not the change that will turn
   this around; a second failure on the same ground is slower to recover from
   than the first.
2. ~~Create the consent message~~ — done, published 2026-10-27.
3. ~~Create an ad unit~~ — done: `3493001294`.
4. **Set two environment variables** in production, then redeploy:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT` | `3493001294` |
   | `NEXT_PUBLIC_ADS_ENABLED` | `true` |

   Worth doing only once the site is approved. Switched on beforehand the code
   loads, every unit asks for an ad, nothing fills, and every box collapses —
   harmless, but it earns nothing and puts the publisher tag on 2,618 pages a
   reviewer has already judged.

   One unit covers every placement. AdSense reports earnings per page URL
   anyway, so splitting into five units up front buys reporting you already
   have at the cost of four more things to get wrong before a single ad
   appears. When a placement earns enough to be worth its own unit — the
   directory feed first, most likely — give it one with
   `NEXT_PUBLIC_ADSENSE_SLOT_DIRECTORY`, `…_DESTINATION` or `…_GUIDE`, and the
   others carry on using the default.

   This repo carries config for more than one host (`netlify/`,
   `railway.json`, and Vercel's URL variable in `lib/seo.ts`), so set these
   wherever this site actually deploys from.

Ads also need `NEXT_PUBLIC_ALLOW_INDEXING=true`: an unindexed site has no
audience, and serving ads to nobody only risks a policy flag. It is already
`true` in production and `false` locally, which is why ads stay off in
development.

To turn ads off again, remove `NEXT_PUBLIC_ADS_ENABLED` and redeploy.

## Already in place

- **Publisher ID** `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, set in production.
- **`/ads.txt`**, generated from it by `app/ads.txt/route.ts`.
- **Ownership tag** `<meta name="google-adsense-account">` on every page.
- **Privacy policy** with AdSense's required wording about advertising cookies.
- **An "Advertisement" label** on every unit, in all five locales (`ads.label`),
  because an ad for a safari company inside a page listing safari companies is
  otherwise indistinguishable from a listing.
