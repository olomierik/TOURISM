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

**Do not request a re-review yet.** Nothing material had changed since
2026-09-15 — the noindex fix predates that rejection. A second failure on the
same ground is slower to recover from than a first.

Items 1 and 3 together change what a reviewer lands on. Item 3 is done and item
2 is done as far as the data allows. **Item 1 is the one still outstanding, and
it is the one that was always going to carry the argument**: fifteen finished
guides, about 8,000 words, that an English reviewer cannot see. Until those are
published in English, a re-review is still being asked to judge the same site
with a tidier footer.
