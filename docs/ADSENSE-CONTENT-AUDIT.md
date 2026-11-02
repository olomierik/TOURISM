# Why AdSense says "Low value content"

Measured 2026-10-27 against the production database and the live site. Every
number below came from a query or a request, not an estimate; where something
is inference rather than measurement it says so.

## The verdict

AdSense rejected `exploretanzania.online` on 2026-09-15 with **"Low value
content"**. The obvious culprit was already fixed eleven days *before* that
review: migration 059 (2026-09-04) made stub listings `noindex`, and it is live
— `/en/business/305-karafuu` serves `noindex, follow` today, while
`/en/business/catalyst-travels-ltd` serves `index, follow`.

So the fix was in place and the review still failed. The reason is that
`noindex` solves the wrong half of the problem. It removes pages from Google
Search. It does not remove them from the site, and an AdSense reviewer does not
read the index — they open the site and click things. The directory still lists
all 2,618 approved businesses, 2,207 of which are stubs.

## What exists, measured

### Original writing (English)

| | Pages | Words |
|---|---|---|
| Guides | 6 | 4,379 (median 768 each) |
| Destination pages | 46 | ~12,800 (description + travel tips + best time) |
| Hidden gems | 17 | 578 (pitches, ~34 each) |
| About | 1 | 498 |
| Trip cost | 1 | 472 |

Roughly **19,000 words of genuine prose across about 70 pages**. None of it is
machine-translated: `is_machine_translated` is false on every guide and
destination row.

### Templated text

| | Pages |
|---|---|
| Listings with the Google-Maps sentence | **1,471** |
| Other stub listings | 737 |
| Indexable listings with licence-register text | 410 |

All 2,623 listing descriptions are technically unique, because the name and the
address differ. They are one sentence:

> "{Name} is a {category} listed on Google Maps at {address}, Tanzania. This
> entry was compiled from public map data and has not yet been claimed…"

Median 46 words. This is the shape Google's scaled-content policy names
directly, and 1,471 pages of it is the single largest thing on the site.

The 410 indexable listings are better — they carry licence-register text
("listed as a Category E member of the Kenya Association of Tour Operators",
"holds Uganda Tourism Board licence UTB/RTT/TT/2021/001057") which is sourced,
checkable and not available from Google Maps. It is still a template, but it is
a template built on a fact nobody else has published.

### The ratio a reviewer sees

About 70 written pages against 2,618 listing pages: **97% of the site is
generated text**. Navigating from the home page, the directory is the second
click, and from there every path leads to a stub.

## Four things that would move it

Ranked by what they return for the work they cost.

### 1. Publish the 15 guides that exist only in German

`guide_translations` holds **de: 21, en: 6, fr: 6, it: 6**. Twenty-one guides
are published; fifteen of them have no English version at all. They are real,
human-written articles of 417–825 words:

- Visum für Ostafrika: Was deutsche Reisende 2026 brauchen (554w)
- Was kostet eine Safari? Eine Kalkulation in Euro (670w)
- Safari mit Kindern: Altersgrenzen, Malaria und passende Parks (602w)
- Direkt vor Ort buchen oder über einen deutschen Veranstalter? (592w)
- …and eleven more

That is roughly **8,000 words of finished editorial** that an English reviewer
— and `exploretanzania.online`'s default locale is English — cannot see. It
would take the English guide count from 6 to 21 and roughly triple the site's
original English prose. The research and structure are done; this is
translation and localisation, not writing from nothing.

Some are Germany-specific (flights from Germany, Austria and Switzerland) and
want adapting rather than translating, but most are not.

**Done for ten of the fifteen.** `guide_translations` now holds **de: 21, en:
16**, and the English guide index lists sixteen articles where it listed six.
Measured the same way on both halves:

| | Guides | Words |
|---|---|---|
| English guides before | 6 | 4,301 |
| Adapted from the German set | 10 | 5,637 |
| **English guides now** | **16** | **9,938** |

These are adaptations, not translations. Where the German text rests on German
law or German departure airports, the English version names the jurisdiction a
claim belongs to instead of quietly generalising it — a reader in Ohio and a
reader in Manchester do not have the same consumer protection. Every figure is
the German author's, carried across with its hedge intact; no price, fee or
success rate was invented.

The five left in German only, and why:

| Guide | Words | Why |
|---|---|---|
| `safari-kosten-euro` | 670 | `tanzania-safari-cost` already answers this in English |
| `fluege-ostafrika-deutschland` | 516 | Routings from Frankfurt, Vienna and Zurich |
| `reiseversicherung-safari` | 546 | German insurance products; the cover a reader already holds differs completely by country |
| `safari-schulferien` | 616 | Built on the German school-holiday calendar |
| `deutschsprachige-safari-guides` | 563 | Asks whether a German-speaking guide is worth the surcharge; in English the question has no premise |

Two more were first set aside with that group as duplicates of existing English
guides — the packing list and combining a safari with Zanzibar. They were not
duplicates: the English set had neither article, and neither topic turns on the
reader's passport. That mistake is the difference between eight and ten.

One correction to the paragraph above: publishing these does **not** "roughly
triple the site's original English prose". It roughly doubles the *guide* prose
and takes the site from about 19,000 original English words to about 24,600. It
is the largest single move available here, not a change to the ratio.

### 2. Stop making the directory the site's shop window for stubs

`noindex` tells Google not to rank a page. It does not stop a reviewer reaching
it, and the directory lists all 2,618. Options, cheapest first:

- Default the directory to listings that have something to show, with stubs
  behind an explicit "include unclaimed listings" toggle. The filter already
  exists in spirit — "Verified only" is there.
- Or sort non-stub listings first, so the first screen is never all stubs.

**Done, and it only half works.** `searchBusinesses` now orders `is_stub`
ascending, third, after the two §7.2 keys it cannot contradict. On the
all-countries view that is the whole first page: 24 licence-register operators
where the order used to be arbitrary, because `photo_count` is 0 on every row
and the first two keys separate three listings out of 2,618.

The default view is Tanzania, and this is what the ordering runs into:

| Country | Approved, non-stub |
|---|---|
| Tanzania | **3** |
| Kenya | 399 |
| Uganda | 9 |
| Rwanda | 0 |

Three. `prime-auditors`, `erick-safaris`, `shangaa-africa` — and then stubs, all
the way down. Sorting cannot fix that and neither can a toggle: hiding stubs by
default would leave a Tanzania directory with three entries in it. The licence
registers that produced 399 written Kenyan listings have no Tanzanian
equivalent in the database yet, and that — not the sort order — is the gap.

### 3. Drop the sentence on stub pages

1,471 pages share one sentence, and it is a sentence that announces itself as
generated: "compiled from public map data and has not yet been claimed". A stub
page would be more honest, and far less like scaled content, showing the facts
it actually has — name, category, location, map, contact — with no prose at
all. A page that does not pretend to be an article is not thin; a page of
filler is.

**Done.** The sentence is no longer an article. `getBusinessBySlug` exposes
`isCompiled` — stub, unowned, unverified, which is exactly the 2,207 — and the
profile page skips the `<h2>About</h2>` block for them and prints the sentence
once at the foot of the column as a caption. It is kept rather than deleted
because it carries the map source's attribution. Verified locally:
`/en/business/305-karafuu` renders no About heading and one caption,
`/en/business/catalyst-travels-ltd` is unchanged.

### 4. The when-to-go month pages are twelve copies of 228 words

`/when-to-go/[month]` builds all twelve months from one 228-word block of i18n
strings plus per-month seasonality data. The data genuinely differs; the prose
does not. docs/ADS.md cites these pages as part of the site's case for review,
and as built they are closer to the problem than the remedy. Either give each
month its own paragraphs, or consolidate the twelve into one page with a table.

## What not to do

Items 1, 2 and 3 are done, item 2 as far as the data allows. Of the three, item
1 is the only one that put new original writing in front of an English-language
reviewer rather than rearranging what was already there.

A re-review was requested on 2026-10-27 at 10:09, which was **before** the ten
English guides were published later the same morning. That ordering is survivable
because the guides are database rows, not a deploy — they were live within the
five-minute revalidate, and AdSense's own wording is "a few days… in some cases
2-4 weeks". It is worth knowing, though, that nobody has confirmed which version
of the site the reviewer will actually open.

~~**Item 4 is what is left**~~ — done on 2026-11-02. Each month page now carries
its own paragraph, written from that month's measured rain, wildlife, crowding
and peak-count figures: 6,029 words across the five locales, none of it shared
between months.

What has not changed is the ratio. 2,207 listing pages still share one sentence,
and Tanzania still has three approved non-stub operators against Kenya's 399. A
reviewer can now be asked to judge a site with a real English guide section, but
they will still be judging it alongside 2,618 listing pages. If this attempt
fails too, that ratio is the reason — and the fix is Tanzanian licence-register
data, not more guides.


## What Search Console says — read 2026-11-02

The AdSense verdict above was inferred from the site. Search Console measures
what Google actually did with it, and the two agree.

**902 pages indexed, 704 not.** The 704 sort into three piles, and only one of
them is a problem:

| Reason | Pages | What it is |
|---|---|---|
| Discovered — currently not indexed | 438 | the problem |
| Excluded by `noindex` | 105 | migration 059, working |
| Blocked due to other 4xx | 48 | a bug fixed weeks ago |
| Not found (404) | 46 | the same |
| Blocked by robots.txt | 42 | `/login`, `/account`, correct |
| Crawled — currently not indexed | 12 | judged and declined |

The 48 and the 46 are historical. They are mixed-locale URLs — `/safaris/
mount-kenya-de` is a German slug on an English path, `/de/reiseziele/
cratere-du-ngorongoro` a French one under a German prefix — emitted by a build
that has since been corrected. Checked today: the pages now advertise
`/de/reiseleiter/tanga-de` and a 70-URL sample of live alternates returns 200
in all five locales. Nothing to fix; they will age out.

`sitemap/static.xml` read **"Couldn't fetch"** — the file holding the home page
and the directory. It serves 200 and valid XML on three consecutive requests,
so that was a stale read from a deploy window. Resubmitted the same day and
accepted.

### The 438

Almost every one is `/business/[slug]`, and every one records its last crawl as
**N/A**. Google took the URLs from the sitemap, sampled the pattern, and
declined to spend crawl budget on the rest. Nothing was rejected; it was never
fetched.

So the 902 indexed pages are destinations, guides, combinations and when-to-go.
The directory — the product — is absent from search entirely.

The cause was measurable and is now fixed. The 412 indexable listings shared
**thirteen** distinct meta descriptions, because the description fell back to a
tagline imported from a licensing register; 163 pages carried the identical
sentence "Category E member, Kenya Association of Tour Operators". Titles fell
back to the bare trading name. Composed from the facts on the row instead, the
same 412 listings now produce 412 distinct descriptions. The 214
category-by-destination pages had the same fault from a different direction —
they described themselves with the on-page results counter, "4 businesses —
Tour Guides, Ngorongoro Crater" — and now read as prose.

### Why the stubs stay noindex, for now

The arithmetic invites the opposite conclusion. Of 412 indexable listings, 20
carry a photograph; of 2,613 noindex stubs, **1,386** do, because the image
backfill reached the map-imported rows and not the licence-register ones. By
photograph alone the rule now points the wrong way.

It should not be flipped on that basis. The objection recorded at the top of
this document was never about pictures: 84% of submitted URLs were the same
template with the name and address swapped, and a photograph does not change
the template. The text on those 1,386 pages is still the importer's one
sentence. Letting them in would recreate the condition that failed the review,
and most would land in "Crawled — currently not indexed" regardless.

The order is: give the stubs text of their own, **then** let the ones that earn
it into the sitemap. 893 already hold a photograph, a phone number and a
website — enough distinct fact to write from, which is the same technique the
meta descriptions now use, applied to the body.

### The ratio got worse today, deliberately

The Tanzanian crawl added **637 listings**, taking the directory from 2,619 to
3,334. Every one is `is_stub` and `noindex`, correctly. But the ratio this
document keeps returning to — original writing against templated listing
pages — is now worse than when the review was requested, not better.

That is a real tension and it is worth stating plainly rather than discovering
it in a second rejection. More listings make the directory more useful and the
subscription pitch more credible; they also make the site look more like a
scraped database to anyone who opens it and clicks. Both things are true. The
resolution is not fewer listings, it is the paragraph above: listings that say
something, so that volume reads as coverage instead of padding.
