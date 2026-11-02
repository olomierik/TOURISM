# Making this site earn: AdSense and operator subscriptions

Measured 2026-11-01 against the production database, the live site and the
AdSense dashboard. Every number here came from a query or a request. Where
something is a projection rather than a measurement it says so.

## The one number that decides both

**270 unique visitors in the last thirty days.** 443 events, 50 of those
visitors reaching a listing page, 3 quote requests submitted.

Both income lines are priced off that number, and neither works at it yet:

- **AdSense.** Call it 1,400 page views a month, generously. Travel content at
  a $2–8 RPM — and most of this audience is not in a high-CPM country — puts
  the site somewhere between $3 and $11 a month. AdSense pays out at $100.
  That is a payout roughly once a year, if approval lands tomorrow.
- **Subscriptions.** Premium is $50 a year, Featured $75. An operator pays
  that when the site demonstrably sends them business. Across 2,619 approved
  listings, the site produced **3 enquiries last month**.

So the work is not "add more ad units" or "switch the plans on". It is traffic
and operator presence. What follows is ranked by what it returns for what it
costs, and the first item is already underway.

## What the site is today

| | |
|---|---|
| Approved listings | 2,619 — TZ 1,521, KE 637, UG 245, RW 216 |
| Of those, indexable (non-stub) | **412** |
| Stubs, `noindex` | 2,207 |
| Listings whose cover is on a host that does not expire | **1,407** (139 before the backfill) |
| Claimed (an operator owns the row) | **17** |
| Verified | 3 |
| English guides | 16 (9,938 words) |
| Destinations | 46 |
| Registered people | 19 |
| Published reviews | 2 |
| Enquiries, all time | 3 |

Built and working, which is worth saying plainly: multi-locale content in five
languages, a lead-routing pipeline, a claims flow with email either way, an
operator dashboard with real per-listing analytics, a billing stack with
plans, bank transfer, trials and reminders, outreach tooling that has already
reached 273 operators, PWA, consent messages, ads.txt, structured data.

Almost none of it is the bottleneck. One thing is.

## 1. The photographs — the whole claim problem in one line

The Maps import stored Google's own signed image URLs, and those expire.
Measured today against URLs this repo crawled six days ago on 2026-10-25,
**eleven of twelve return 403**. Sampling live covers, sixteen of eighteen are
dead. Counting the rows: 1,189 listings never had a cover and 1,291 more point
at a host that signs and expires, so **2,480 of 2,619 approved listings have
no usable photograph**.

That is the setback described from the operator's side: they open a page with
their own name on it, see nothing, and close it. 17 claims out of 2,619 is a
0.6% claim rate, and a page with no picture is the reason.

`scripts/backfill-images.mjs` fixes it by downloading the bytes rather than
linking to them — two images per listing into the public `business-media`
bucket, the first promoted to the cover. The resulting URL is ours and does
not expire. Matching is defended twice over, because searching Maps by name
returns the *best* match and not the right one: "Angenwa Lodge Mwanza" comes
back as Annox Hotel, 2.3 km away. Place ids where the seed files still hold
one; otherwise a 400-metre and name-agreement check that rejects the rest.

**Run on 2026-11-02: 1,407 of 2,619 listings now carry a cover on storage
we own, up from 139.** Zero failures across all four countries. What did not
resolve was mostly unmatchable rather than broken — 925 listings found no
place within 400 metres answering to their name, which is the matching rule
refusing to guess, and 154 places Google holds no photograph for at all.

The remainder is now a crawl-budget question, not a code question: a listing
with no place id needs a fresh search to find one, and that is the same
metered crawl as item 7.

## 2. 2,207 pages Google is told to ignore

Only 412 listings are indexable. The other 2,207 are stubs carrying one
generated sentence, correctly `noindex` since migration 059 because a page
with a name and a pin on it is not worth ranking.

But that is 84% of the site sitting out of search — and search is the only
realistic source of the traffic both income lines need. A stub with two real
photographs, opening hours, a phone number, a rating and a map is no longer
thin. The rule to aim for: a listing becomes indexable when it has an image
and at least two verifiable facts beyond name and address.

Item 1 is what makes item 2 possible. Done together they could take the
indexable surface from 412 pages to something in four figures, which is the
only move here with an order-of-magnitude in it.

## 3. The twelve month pages

`docs/ADSENSE-CONTENT-AUDIT.md` item 4, still outstanding: `/when-to-go/[month]`
builds twelve pages from one 228-word block plus per-month data. The data
differs; the prose does not. It is the same objection AdSense named — scaled
content — in a corner of the site that `docs/ADS.md` cites as part of the case
for review. Either give each month its own paragraphs or collapse the twelve
into one page with a table. Small, and it should land before the next
re-review.

## 4. AdSense: nothing to fix, something to wait for

Checked in the dashboard today. `exploretanzania.online` reads **"Getting
ready"**, last updated 2026-10-27 — unchanged since the re-review was
requested. The panel still shows ads.txt as "Not found"; the live file returns
200 `text/plain` with the correct DIRECT line, so that is a stale crawl on
Google's side and not a defect. Policy centre is clean. Auto ads is off and
measured placing nothing, which is right — the placement rules in `lib/ads.ts`
keep ads out of the funnel, and Auto ads would ignore them.

So there is no AdSense work to do. When approval lands, the thing to change is
not the number of units but where the second one sits: the directory feed and
mid-article in guides are the two placements with the impressions. One unit
covers everything today, which is the correct starting point.

**Expectation to hold:** approval is worth having, and at current traffic it is
worth about the price of a coffee a month. Ads become income somewhere north of
50,000 page views. The route there is items 1 and 2.

## 5. Subscriptions: the proof already exists, the audience does not

`SUBSCRIPTIONS_ENABLED` is `false`, deliberately — tiers come back when there
is enough traffic to sell them honestly. That call still looks right, and here
is the measured reason it will stop being right:

**240 WhatsApp chats were opened from this site in the last thirty days,
across 158 different listings.** They are recorded per business in
`contact_clicks`, and the operator dashboard already counts them as contacts
alongside leads. The site is delivering real business to operators right now —
roughly 1.5 enquiries per listing per month on the listings that get any — and
it can prove it per operator.

The gap is that **only 17 of those businesses have an owner who can log in and
see it**. Nobody will pay $50 a year for a dashboard they have never opened.

So the order is: images → claims → owners see their own WhatsApp numbers →
subscriptions. Not the other way round. A concrete trigger for flipping the
flag: when 200 listings are claimed and the median claimed listing can be shown
a double-digit monthly contact count, the pitch writes itself and the billing
code is one line from live.

What not to do in the meantime: do not sell placement, and do not sell
verification. §6.4 already says a trust mark may not be bought, and a directory
whose badges are for sale has nothing left to charge for afterwards.

## 6. Smaller things worth doing

- **Duplicate listings.** The image work surfaced at least two: "Mili Adventure
  Africa" and "Mili Adventure Africa – Self Drive Safari & 4x4 Rental
  Tanzania", and an "Acacia Restaurant" pair. A dedupe pass on name + proximity
  would find the rest.
- **Tanzania has 3 approved non-stub operators against Kenya's 399.** The
  Kenyan licence register produced those 399; there is no Tanzanian equivalent
  in the database yet. That asymmetry shows on the default directory view,
  which is Tanzania.
- **Outreach has reached 273 operators and converted 17.** Worth re-running the
  campaign *after* the images land, to the same list — the message "your page
  is live, here is your photograph, here are the 9 travellers who messaged you
  last month" is a different email from the one they ignored.
- **2 published reviews.** Reviews are what make a directory page worth ranking
  above the operator's own site. Nothing here is broken; it has just never been
  asked for.

## 7. The crawl budget is the ceiling on everything above

Measured 2026-11-02: the Apify plan is **STARTER, $19 a month**, and a place
costs **$0.0066** to crawl with detail pages and images on. That prices the
rest of the work exactly:

| | regions left | places at 30/term | cost |
|---|---|---|---|
| Tanzania | 25 | ~6,000 | ~$40 |
| Kenya | 16 | ~3,840 | ~$25 |
| Uganda | 10 | ~2,400 | ~$16 |
| Rwanda | 7 | ~1,680 | ~$11 |
| **Total** | **58** | **~13,900** | **~$92** |

Four Tanzanian regions fit in what was left of this month and produced 741
new places. The other 58 regions are one month's $19 four times over, or a
single month on a plan one tier up.

This is the cheapest line item in the whole document and it gates two others:
the listings that found no place id in item 1 need a search to get one, and
item 2 cannot raise the indexable surface past what has actually been
crawled. Worth saying plainly — **$92 of crawl is the difference between 412
indexable pages and a four-figure number**, and nothing else on this list has
that ratio.

## In one paragraph

Nothing needs building. Ads are wired and waiting on Google, billing is wired
and switched off on purpose, lead routing and per-operator attribution both
work. The pictures are now fixed: 1,407 listings carry a photograph that will
still be there next month, against 139 a day ago. That leaves 17 owners and
412 indexable pages as the two numbers every revenue line still waits on, and
both are now downstream of one cheap thing — $92 of crawl, which buys the
place ids the remaining listings need and the facts that would let a stub into
the index. Then re-run the outreach to operators who can finally see what the
site sends them. The argument gets worth having at that point; today it is
one month's hosting away.
