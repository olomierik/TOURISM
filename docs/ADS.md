# Advertising (Google AdSense)

Ads are built, placed and switched on. Nothing fills yet, because the site is
still in review. What stands between here and revenue is Google's answer, not
code.

## Where the account actually stands

Checked in the AdSense dashboard on 2026-10-27, publisher `pub-9645056123999913`:

| | |
|---|---|
| Payments profile | complete |
| Ad settings | confirmed |
| **Site approval** | **"Getting ready"** — re-review requested 2026-10-27 10:09 EAT. The previous state was "Needs attention — Low value content", reviewed 2026-09-15 |
| ads.txt | live and correct: `https://exploretanzania.online/ads.txt` returns 200, `text/plain`, and the `pub-9645056123999913` DIRECT line with Google's TAG id. The panel still reads "Not found" — that is a stale crawl on Google's side, not a missing file. `www` 301s to the bare host, which the spec permits |
| Auto ads | **OFF** for `exploretanzania.online`, and confirmed placing nothing (see below) |
| Auto optimize | **ON**. It runs format experiments on the units this codebase renders; it does not add placements of its own |
| Ad units | **Site-wide page foot** — slot `3493001294`, responsive Display, created 2026-10-27 |
| EEA/UK consent message | **Published** 2026-10-27 — "Explore Tanzania - EEA consent", en + de/fr/it, with a "Do not consent" button enabled for every EEA country |
| US state consent message | **Published** 2026-10-27 — "Explore Tanzania — US states opt-out", en-US, opt-out on |
| Policy center | no current issues |
| `NEXT_PUBLIC_ADS_ENABLED` in production | **true**, set in Netlify 2026-10-27, all deploy contexts |
| `NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT` in production | **3493001294**, set in Netlify 2026-10-27, all deploy contexts |

Both variables are live. `PageFootAd` is merged and production serves it:
measured on 2026-10-27, the home page renders one unit and
`/guides/safari-packing-list` two, each inside a `data-ad-surface` wrapper with
its "Advertisement" label, and each collapsed to zero height because nothing
fills on a site that has not passed review.

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
would change the answer. The short version: 1,471 listing pages share a single
sentence, and that is still true.

The guide shelf is no longer the gap. Ten of the fifteen German-market guides
were adapted into English on 2026-10-27, taking the English guide section from 6
articles and 4,301 words to **16 articles and 9,938 words**; the five left in
German only are the ones whose question depends on a German passport, a German
insurer or the German school calendar.

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

### Auto ads is off, and this file never bound it

Auto ads would have ignored everything above. `pathAllowsAds` governs only the
units this codebase renders; Auto ads places anchors, vignettes and mid-content
units wherever it likes, which is exactly the interference the placement rule
exists to prevent. Google's own preview showed it pinning an anchor ad over the
mobile home page.

It is now **OFF** for `exploretanzania.online`, under Ads → By site. Verified in
the browser on 2026-10-27, on `/` and on `/guides/safari-packing-list`:

| Probe | Count |
|---|---|
| `.google-auto-placed` | 0 |
| `[data-anchor-status]` | 0 |
| vignette containers | 0 |
| `position: fixed`/`sticky` Google boxes | 0 |
| `ins[data-ad-slot]` (ours) | 1 on `/`, 2 on a guide |

**One earlier reading here was wrong, and it is worth not repeating.** The
browser does end up with one more `<ins>` than the server sends, and that was
taken as proof of an Auto ads placement. It is not. The extra one is a direct
child of `<body>`, carries only `class`, `style`, `data-adsbygoogle-status` and
`data-ad-hi` — no `data-ad-client`, no `data-ad-slot`, no `data-ad-format` — and
it is still there with Auto ads off. It is the `adsbygoogle.js` library's own
bookkeeping node, `display: none` at zero height. A real Auto ads placement
announces itself with the `google-auto-placed` class, and there are none.

If Auto ads is ever switched back on, the ad-free list above has to be entered
by hand under Auto ads → Page exclusions. There is currently 1 exclusion
configured, which does nothing while the feature is off.

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

All four steps are done. What is left is Google's answer.

1. **Get approved.** Requested 2026-10-27 10:09 EAT; the site now reads
   "Getting ready". AdSense's own estimate is "a few days… in some cases 2-4
   weeks".

   The request went in *before* the ten English guides were published later the
   same morning. That is survivable — they are database rows rather than a
   deploy, so they were live inside the five-minute revalidate — but nobody has
   confirmed which version of the site the reviewer actually opens. The
   stub-listing `noindex` fix is not the change that will carry this either: it
   landed 2026-09-04, eleven days *before* the rejection.
   docs/ADSENSE-CONTENT-AUDIT.md item 4 is the one objection still unfixed.
2. ~~Create the consent message~~ — done, published 2026-10-27.
3. ~~Create an ad unit~~ — done: `3493001294`.
4. ~~**Set two environment variables**~~ — done 2026-10-27 in Netlify, all
   deploy contexts, and live on `main`:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT` | `3493001294` |
   | `NEXT_PUBLIC_ADS_ENABLED` | `true` |

   This was switched on before approval, which is the state the site is in now:
   the code loads, every unit asks for an ad, nothing fills, and every box
   collapses to zero height. Harmless and verified harmless — but it earns
   nothing yet, and it does put the publisher tag on 2,618 pages a reviewer has
   already judged once.

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
