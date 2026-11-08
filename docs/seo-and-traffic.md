# Traffic, trust and the index — 8 Nov 2026

Measured against production and Search Console on 8 November 2026. Every number
below was read, not estimated; where a number contradicts something an earlier
document assumed, that is called out rather than quietly corrected.

This answers five questions that were asked together: how to turn impressions
into clicks, what to do about unclaimed listings that appear without a real
classification, the single best move for traffic, which keywords to chase, and
what to do with Search Console.

---

## 0. The measurement that changes the question

Two counters disagree, and the disagreement matters more than either number.

| 30 days to 8 Nov | value |
|---|---|
| page views (`page_views`) | **246** |
| distinct visitor-days | 105 |
| WhatsApp contact clicks (`contact_clicks`) | **839** |
| listings those clicks touched | 257 |
| clicks carrying a `lead_id` | **0** |
| enquiries in `leads`, all time | **5** |

**3.4 WhatsApp clicks per page view is not possible.** A traveller cannot press
a chat button three times more often than they load a page, and the route
already deduplicates one click per visitor per operator per day.

The cause is in the instrumentation, not the market. `/api/whatsapp/[id]` is a
plain `GET` redirect that writes a row before redirecting, and the only bot
filter is a user-agent blocklist —
`/bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|axios/i`.
Anything that sends an ordinary-looking agent string and follows links is
counted as a chat. `robots.txt` disallows `/api/`, so the well-behaved crawlers
stay out and only the impolite ones are in the data.

It is **not** mostly a single scraper. Splitting the 839 by how many operators
one identity touched in a day:

| bucket | visitor-days | clicks |
|---|---|---|
| 1 operator | 787 | **787** |
| 2–4 operators | 1 | 4 |
| 5+ operators | 3 | 48 |

787 clicks from 787 identities that each touched exactly one operator and
loaded no pages. That is distributed, rotating traffic, not one harvester —
and it is also not 787 travellers.

### What this costs

`monetisation-model.md` priced pay-per-lead partly on "240 WhatsApp chats
across 158 listings in 30 days", read as evidence of real demand leaking off
the platform. **That evidence does not hold.** The model's conclusion — price
leads, not bookings — survives, because it rests on the fact that this platform
cannot observe a booking, which is still true. But the demand figure used to
size the opportunity must not be quoted to an operator or an investor until the
counter is cleaned.

**Fix before anything else is decided on this number** (half a day):

1. Require a same-session page view before a chat counts — the redirect already
   knows the visitor hash; refuse to write a row for a hash with no `page_views`
   entry that day.
2. Record the user agent and the `Referer` on `contact_clicks` so the next
   argument about this is settled by a query.
3. Backfill nothing. Treat everything before the fix as unusable and say so in
   the operator dashboard, which currently shows operators a chat count that is
   mostly not chats.

Point 3 is a trust problem, not just a data problem. Operators are being shown
inflated contact numbers for their own listings.

---

## 1. Turning impressions into clicks

### The honest answer: there is no CTR problem to fix

| Search Console, full history (22 Aug – 5 Nov) | |
|---|---|
| impressions | 9,090 |
| clicks | 53 |
| CTR | 0.6% |
| **average position** | **56.7** |
| distinct queries | 871 |
| distinct pages earning impressions | 479 |

Average position 56.7 is the sixth page of results. Expected CTR there is
roughly 0.1–0.3%. **At 0.6% the snippets are already performing about twice as
well as the position deserves.** Rewriting titles and descriptions across the
site would be work spent on the one thing that is not broken.

Impressions are not a near-miss. An impression at position 56 means Google
rendered the result for someone who scrolled six pages deep or never saw it at
all. There is no click to recover there; there is only rank to gain.

So the question "how do we turn impressions into clicks" has one true answer
for this site: **move from page 6 to page 1 on a small number of queries.** The
rest of this document is about which ones and how.

### The one genuine CTR failure

| query | impressions | clicks |
|---|---|---|
| **explore tanzania** | **247** | **2** |
| dar es salaam | 279 | 0 |
| serengeti safaris | 195 | 0 |
| mount kenya accommodation | 191 | 0 |
| mount kenya hotels | 182 | 0 |
| shangaa africa | 34 | 3 |

`dar es salaam`, `serengeti safaris` and the Mount Kenya pair are head terms at
position ~56 — zero clicks is the expected outcome, not a defect.

**`explore tanzania` is different.** It is the site's own name, it drew 247
impressions, and it returned 2 clicks. A brand query you rank first for returns
30–60%. 0.8% means the site is not first for its own name. No established
operator owns the exact phrase — the near-matches are Explore Jambo Maasai,
Explore Ecosystem Tours and Explore 2 Africa — so this is winnable, and it is
the only place on the site where a ranking gain converts immediately, because
the searcher already typed your name.

What it needs is conventional and cheap:

- `Organization` structured data on the home page with `name`, `url`, `logo`,
  `sameAs` pointing at every social profile the brand holds.
- A home page `<title>` that leads with the brand rather than the proposition.
- Any citation of the exact string "Explore Tanzania" next to the domain —
  directory listings, the operators' own sites, social profiles.

### Where clicks already happen

| page | clicks | impressions |
|---|---|---|
| `/` | 19 | 322 |
| `/business/smooth-drive-car-hire-…-kilimani-junction` | 5 | 48 |
| `/business/shangaa-africa` | 3 | 35 |
| `/business/widerange-african-safaris-…` | 2 | 121 |
| `/business/mwiba-tourguide-training` | 2 | 38 |
| `/car-rental/ssese-islands` | 2 | 10 |
| `/safaris/dar-es-salaam` | 1 | 123 |
| `/de/reisefuehrer/safari-und-sansibar-verbinden` | 1 | 61 |
| `/de/reisefuehrer/packliste-safari` | 1 | 29 |

Two things to read here. The home page is 36% of all clicks, which is what a
site with no ranking pages looks like. And **the German guides convert far
better than the directory does** — `/de/reisefuehrer/safari-und-sansibar-verbinden`
took a click from 61 impressions where `/safaris/dar-es-salaam` took one from
123. Written content is the part of this site that works.

---

## 2. Unclaimed listings and classification

### The classification problem is not the one it looks like

Measured on 3,336 approved listings:

| | count |
|---|---|
| with **no category at all** | **2** |
| with no destination | **550** |
| that are stubs (imported map data, no original description) | **2,922** (87.6%) |
| claimed (`owner_id` set) | **26** |
| licence-verified | 26 |

**Only two listings in the whole directory lack a category.** The visible
symptom — businesses appearing on pages where they do not belong — is not
missing classification. It is three separate things:

**a. Wrong classification.** PRIME AUDITORS is filed under Safaris and is an
accounting firm. It is the **second most-viewed page on the site** (22 views in
30 days, behind only `/business/erick-safaris` at 43). The category was
imported from map data and never checked. `lib/curation.ts` already names this
case in a comment; nothing acts on it.

**b. Missing destination, not missing category.** 550 approved listings have no
destination. Until PR #100 that silently excluded them from destination-filtered
search and from lead routing. That is now fixed for boosted listings only —
an unscoped boost relaxes the destination filter and falls back to the
operator's country. **The other 524 are still invisible on every
destination-filtered page**, which is most of the commercial surface.

**c. Volume without substance.** The category split:

| category | listings | stubs | claimed |
|---|---|---|---|
| hotels | 1,376 | 1,374 (99.9%) | 6 |
| safaris | 1,254 | 850 (68%) | 17 |
| restaurants | 303 | 303 (100%) | 1 |
| car-rental | 259 | 250 | 3 |
| activities | 137 | 134 | 3 |
| tour-guides | 24 | 23 | 1 |

Restaurants is 303 listings and 303 stubs — a category with no original content
in it anywhere. Hotels is effectively the same.

### How to group them

The existing `is_stub` flag (migration 059) is the right mechanism and it is
already doing the hard half: stubs are `noindex` and out of the sitemap while
staying live in the directory and in near-me. Do not undo that. Add three
things on top of it:

**1. A confidence grade, not a second flag.** Derive a grade per listing from
what it actually carries, and use it to sort — never to hide:

| grade | rule | directory treatment |
|---|---|---|
| **Verified** | licence checked | top of every list, badge |
| **Claimed** | `owner_id` set | above unclaimed, badge |
| **Listed** | unclaimed, has ≥1 real photo and a category that survived review | normal |
| **Imported** | `is_stub`, unreviewed category | last, labelled "from public map data", `noindex` (already true) |

`sortRecommended` already scores verified/claimed/photos. Extend it rather than
building a parallel system.

**2. Category review where the traffic is, not everywhere.** Do not audit 3,336
rows. 266 listings received contact clicks and 479 pages earned a search
impression; the union is a few hundred. Review those categories by hand, in
descending order of views. PRIME AUDITORS is first on that list. Everything
else can wait for a claim.

**3. Backfill destination from coordinates.** The 550 listings with no
destination were imported with a latitude and longitude. Nearest-destination
within a radius, written as a low-confidence `business_destinations` row and
marked as inferred, recovers most of them. An operator who later states a
coverage list overrides it — exactly the rule PR #100 established for boosts,
applied to the whole table.

### Why claiming is still the ceiling

`competitive-strategy.md` made this point on 26 October with 4 claimed listings
against 2,618. It is now **26 against 3,336** — real movement, and still 0.8%.
Claiming is what makes a listing indexable, sitemapped, photographable,
reviewable and eligible for Featured. Five built systems wait on that one
action, and the outreach tooling is finished and sends nothing by itself.

SafariBookings published **32,541 approved operator reviews in 2025 alone**.
This site has **3 published reviews, 7 packages and 21 guides**. That gap is
not closable by building; it closes one claimed listing at a time, or not at
all.

---

## 3. The single best move for traffic

### First, stop the bleeding: 94 broken URLs Google already knows

Search Console on the domain property:

| status | pages |
|---|---|
| indexed | **902** |
| not indexed | **704** |

Of the 704:

| reason | source | pages |
|---|---|---|
| Discovered – currently not indexed | Google | **438** |
| Excluded by `noindex` | site | 105 |
| **Blocked due to other 4xx** | site | **48** |
| **Not found (404)** | site | **46** |
| Blocked by robots.txt | site | 42 |
| Crawled – currently not indexed | Google | 12 |
| Page with redirect | site | 9 |
| canonical-related | both | 4 |

Plus 4 pages "indexed, though blocked by robots.txt".

The 94 broken URLs are **all localised routes**, and they share one shape:

```
/de/reiseziele/serengeti              404   (German slug is not "serengeti")
/fr/destinations/arusha               404
/it/attivita/arusha                   404
/de/hotels/arusha                     404   (German category segment)
/de/safari/parco-nazionale-murchison-falls   404  (German prefix, Italian slug)
/de/reisefuehrer/tansania-safari-packliste   404
/safaris/mount-kenya-de               4xx   (locale suffix leaked into a slug)
```

The hreflang half of this was already found and fixed — `lib/seo.ts` carries the
post-mortem about `/de/reiseziele/zanzibar` being emitted for the page that
actually lives at `/de/reiseziele/sansibar`. **What was not done is the cleanup.**
Google still holds the old URLs and gets a 404 for each.

One of them is load-bearing: `/de/reisefuehrer/tansania-safari-packliste` is a
404, while `/de/reisefuehrer/packliste-safari` earns clicks. The German guide
slugs changed and the old ones were never redirected, so a page that had
accumulated ranking was thrown away rather than moved.

**Do this first, it is a day's work and it is pure recovery:**

- A catch-all 301 in middleware: for any `/{locale}/{segment}/{slug}` that
  would 404, look the slug up across every locale's translations and, on a
  single match, 301 to the correct localised URL. This fixes all 94 and
  prevents the next 94.
- Export the two Search Console lists and verify each resolves after deploy.
- Then press **Validate Fix** on both reports so Google recrawls on its own
  schedule rather than waiting for a rediscovery.

### Then: the 438

"Discovered – currently not indexed" means Google found the URL and **chose not
to spend a crawl on it.** At 438 pages against 902 indexed, that is Google
saying the site's average page is not worth fetching. It is the direct
consequence of 2,922 stub listings: even though stubs are `noindex`, they are
still linked, still crawled, and still shape the quality assessment of the
domain.

This does not get fixed with technical SEO. It gets fixed by the ratio of
substantial pages to thin ones changing.

### The recommendation

**Write twenty guides, and interlink them with the commercial pages.**

The evidence for this is in your own data rather than in best practice:

- The German guides already out-convert the directory per impression, on a
  handful of pages written as an experiment.
- `/guides/tanzania-safari-cost` and `/guides/how-to-choose-safari-operator`
  appear in the top-ten most-viewed pages with 21 guides total, against 3,336
  listings.
- 871 distinct queries are already landing somewhere on this site. The demand
  exists; there is nothing substantial for it to land on.
- Guides are the only page type here that can rank without a claim, a review,
  a photo or an operator doing anything.

Target the questions, not the head terms. `tanzania safari` at position 56 is
unwinnable this year against SafariBookings. `what does a 7-day Serengeti
safari cost in 2027`, `Serengeti or Ngorongoro — which first`, `is Zanzibar
worth adding to a safari`, `Tanzania safari packing list`, `when is the Great
Migration river crossing` are winnable, and each one ends on a page that can
link to a filtered list of operators who serve it.

Twenty guides is roughly a quarter of what it takes to matter, and it is enough
to prove the channel inside a quarter.

---

## 4. Keywords

These come from the site's own 871 queries, which is better evidence than any
volume estimate, because these are searches where Google **already** thinks this
site is a candidate.

### Group A — already earning impressions, currently unwinnable

`dar es salaam` (279), `serengeti safaris` (195), `mount kenya accommodation`
(191), `mount kenya hotels` (182). Head terms, position ~56, zero clicks.
**Do not target these directly.** They are the reward for winning group C, not
the route to it.

### Group B — brand, winnable now

`explore tanzania` (247 impressions, 2 clicks). Fix per §1. This is the
highest-return single keyword on the site.

### Group C — long-tail with intent, where the guides should aim

The queries that already convert here are specific and transactional:
`mafia island tour operators`, `car hire kilimani`, `luxury car rental kenya`.
Each took a click from a single impression — a 100% CTR on a query with
precise intent.

Build for that shape:

- `{destination} tour operators` — a page type you already have at
  `/{category}/{destination}` and which earns impressions (`/safaris/dar-es-salaam`,
  123) without content on it.
- `{activity} cost tanzania`, `best time for {destination}`,
  `{destination} vs {destination}`.
- `{city} car hire`, `{destination} lodges` — the car-rental and hotel
  inventory is 1,635 listings and earns nothing because the category pages are
  lists without prose.

### Group D — the Kenya signal, and a naming decision to make

`mount kenya accommodation`, `mount kenya hotels`, `luxury car rental kenya`,
`car hire kilimani` (Nairobi) are all in the top queries, and
`/car-rental/nairobi-national-park` earns impressions. **A meaningful share of
this site's search demand is Kenyan, under a brand called Explore Tanzania.**

That is a strategic question, not an SEO one, and it should be answered
deliberately: either stop indexing non-Tanzanian inventory and concentrate the
brand, or accept a multi-country directory and plan a brand that can carry it.
Doing neither means competing for Kenyan queries with a domain that tells
Google the page is about Tanzania.

---

## 5. Search Console

### Done on 8 Nov 2026

The account held three overlapping properties for this site. Two were removed;
one remains:

| property | type | kept |
|---|---|---|
| `exploretanzania.online` | **domain** | **kept** |
| `https://exploretanzania.online/` | URL-prefix | removed |
| `https://www.exploretanzania.online/` | URL-prefix | removed |

The domain property is the only one that was ever showing the truth: 902
indexed pages against the URL-prefix property's 8. It covers `http` and
`https`, `www` and apex, and every subdomain, and it is DNS-verified so it
survives a hosting change.

Both removed properties were added on **7 November 2026** and their history was
backfilled on creation, so nothing permanent was lost — re-adding and
re-verifying restores it. The full pre-removal baseline is recorded in
`search-console-baseline-2026-11-08.md` in the shared session notes regardless.

Six `primeauditors.xyz` properties and at least one `tolo-erp.com` property
also exist on this account. They belong to other sites and were left alone.

### Worth knowing

A Search Console property is a **reporting view on your own account**. Having
three of them never caused duplicate indexing and removing two does not fix
any. If `www` and apex are both reachable and serving the same pages, that is
fixed with a 301 and a canonical tag on the host, not here. Worth confirming,
since `www.exploretanzania.online` is the hostname Google has actually been
ranking.

### Next on the property

1. Submit all nine sitemap sections (`/sitemap/{section}.xml`). `robots.txt`
   lists them individually and correctly; confirm Search Console has each one.
2. Review the 42 URLs blocked by `robots.txt` and the 4 "indexed, though
   blocked" — `/api/` is correctly blocked, but something indexable is caught.
3. After the redirect work in §3, run **Validate Fix** on the 404 and 4xx
   reports.
4. Leave the 105 `noindex` pages alone. That is migration 059 working as
   designed.

---

## 6. Order of work

| # | action | effort | why it is here |
|---|---|---|---|
| 1 | Fix the WhatsApp click counter | half a day | every other number is being read against it, and operators are shown it |
| 2 | ~~301 the 94 broken localised URLs~~ | **done, see 7** | pure recovery of pages that already ranked |
| 3 | `Organization` schema + brand title | half a day | the only keyword where rank converts immediately |
| 4 | Backfill destinations from coordinates | 1–2 days | unblocks 524 listings on the main commercial surface |
| 5 | Category review for the ~300 listings with traffic | 2 days | PRIME AUDITORS is the second most-viewed page |
| 6 | Twenty guides | ongoing | the only channel with evidence behind it |
| 7 | Send the outreach | ongoing | 26 claims of 3,336; five systems wait on it |

Items 1–5 are about four working days and recover what already exists. Items 6
and 7 are the only two that grow anything, and neither is an engineering task.

---

---

## 7. What item 2 turned out to be — 8 Nov 2026, later the same day

Item 2 is done, and the diagnosis in §3 was half right. The redirect was built;
the cause was not what the URL shapes suggested.

### The fix

`lib/seo/slug-rescue.ts`. A slug that resolves in no language is looked up
across every language before the page 404s, and on a single match the reader is
sent to the slug their own language uses. Wired into the three routes whose
slugs are translated — destinations, guides, and both halves of
`/{category}/{destination}` — so a URL wrong in one segment or in both lands on
the pair that exists. Asserted by `scripts/verify-seo.mjs`, which crosses the
slugs the pages advertise in their own hreflang tags rather than a list written
by hand, and which also checks that a slug no language knows is **still** a 404.

The redirect is a 308 rather than the 301 §3 asked for: `permanentRedirect()`
issues 308, Google treats the two identically for passing the signal on, and
308 additionally keeps a POST a POST.

This covers far more than the 94. Across the three tables with translated slugs
there are **708 destination, 100 category and 92 guide** combinations of "ask
one language for another's slug", and all of them were live 404s.

### `/safaris/mount-kenya-de` was not a bug in the URL builder

§3 read the locale suffix as something that leaked out of a link. It had not.
`mount-kenya-de` was **the real stored German slug**. Twenty-eight destination
slugs carried the locale code:

| | en | de | fr | it |
|---|---|---|---|---|
| Arusha | `arusha` | `arusha-de` | `arusha-fr` | `arusha-it` |
| Dar es Salaam | `dar-es-salaam` | — | `dar-es-salaam-fr` | `dar-es-salaam-it` |
| Mount Kenya | `mount-kenya` | `mount-kenya-de` | — | — |

All twenty-eight are proper nouns with the same `name` in all four rows,
because Arusha is Arusha in German. The suffix existed only because the seed
wrote one slug per locale and needed them to differ — and they never needed to:
the unique index is on `(locale, slug)`.

It is not a cosmetic problem. Four of the site's highest-impression queries name
these exact places — `dar es salaam` (279 impressions, 0 clicks), `mount kenya
accommodation` (191), `mount kenya hotels` (182), and `mafia island tour
operators`, one of the three queries that converted at 100% — and their
non-English URLs read `/fr/destinations/dar-es-salaam-fr`. Meanwhile
`/fr/destinations/arusha`, the URL a reader would type, answered 404 and is one
of the 94 in Google's report.

`082_place_names_do_not_translate.sql` drops the suffix on all twenty-eight,
after a guard proving no rename collides inside a locale (none does) and a
second proving no slug ends in a locale code afterwards. Real translations —
`aberdare-nationalpark`, `parc-national-des-aberdare` — are untouched; the WHERE
clause matches only a slug that is exactly the English slug plus the locale
code, which no translation can be. The retired URLs keep their rank: the rescue
strips a trailing locale code as its last candidate, deliberately after the
exact cross-locale lookup, so the twenty-eight redirect forward instead of
becoming twenty-eight new 404s.

**Not applied.** 080, 081 and 082 are all written and all pending.

### Item 3, the half of it that code can carry

`sameAs` was absent from the `Organization` node, and it is in §1's list for the
brand query. It is now read from `NEXT_PUBLIC_SOCIAL_PROFILES` and omitted when
unset, which is the state today: **this brand has no social profile configured
anywhere in the codebase.** A guessed URL is a false claim about identity and
Google may discount the whole node for one, so there was nothing truthful to
write. The field appears the moment the accounts exist, with no code change.

The home page title already leads with the brand —
"Explore Tanzania — Compare Safari Operators, Lodges & Guides" — so that part of
§1 is already true. What is left of item 3 is not engineering: it is having a
profile to point at, and a citation of the exact phrase next to the domain.

### Why the competitors rank, stated plainly

§3 said "write twenty guides". Searching the two queries this site most wants
shows what it is competing with, and the number is the argument:

| query | what ranks |
|---|---|
| tanzania safari cost 2026 | **nine** separate `safarifind.com/blog/…` URLs, **five** `dumaexplorer.com/blog/…` |
| best time to visit Serengeti | **three** `followalice.com` URLs, plus Go2Africa, DiscoverAfrica, africanbudgetsafaris |

They are not ranking on one better page. They publish a page per *phrasing* of
one intent — "shared vs private", "budget vs luxury by operator", "daily rates
by park", "flights & lodges included", "real pricing by package type" — and let
the cluster cover the query space. Against that, this site has **16 published
English guides in total**, averaging 3,714 characters, and one of them is the
cost page.

So the gap is not technical. Production passes all 46 SEO assertions: hreflang
clusters reciprocate, canonicals are self-referential, JSON-LD parses on every
page type, `robots.txt` advertises nine sitemaps, 962 URLs resolve, and
`llms.txt` and `llms-full.txt` are served and current. The gap is that a
directory is being asked to outrank an article library on article queries.

One correction to how this looked from the outside: a plain web search for
`exploretanzania.online`, and for `site:exploretanzania.online`, returns nothing
from the domain. That is the search tool used, not Google — Search Console shows
902 pages indexed and 9,090 impressions. The site is indexed. It is at position
56.7.

### A second thing the data rules out

The obvious next page type is destination × month — "Serengeti in July" is the
shape that ranks, 46 destinations have seasonality, and 552 rows already exist.
**It would be 552 thin pages.** Every one of the 552 `note` fields is empty, in
all four locales; `highlight` averages 66 characters. One sentence and seven
numbers per page is the same template-duplication the AdSense publisher review
already rejected this site for, at four times the scale. The data has to be
written before the route is worth building.

### Also found while sweeping, not SEO

`payment_started` was typed in `lib/analytics/track.ts` and fired from
`components/business/pay-operator.tsx`, but was missing from `TRACK_EVENTS` in
`lib/analytics/sanitize.ts` — the allowlist `/api/events` validates against. So
every click on an operator's own checkout link was sent by the browser and
dropped by the endpoint, silently, with nothing in a log. That is the one number
that says whether the payment rail is used at all. Added, along with a
`SERVER_ONLY_EVENTS` list so `whatsapp_uncounted` — which the WhatsApp route
writes with the admin client, about a click it has just declined to count, and
which a browser must never be able to post — stops looking like the same kind of
omission. It was that false alarm sitting beside the real one that let the real
one stand.

## Sources

- [SafariBookings — Genuine Reviews from Real Travelers](https://www.safaribookings.com/genuine-reviews)
- [SafariBookings — Ranking System, Recommendation Labels & Filter Options](https://help.safaribookings.com/hc/en-150/articles/25465918704029)
- [Go2Africa — State of Safari 2025](https://www.go2africa.com/african-travel-blog/state-of-safari-2025)
