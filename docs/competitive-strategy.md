# How Explore Tanzania competes — 26 Oct 2026

Research: SafariBookings (the direct competitor, torn down separately in
`competitor-teardown.md`), TourRadar and Much Better Adventures, all examined
in Chrome at 1920px. This document is about what they have in common, where
that leaves us, and what is worth building.

It is deliberately blunt about the gaps, because the ones that matter are not
design problems and no amount of visual work closes them.

---

## 1. What the three have in common

| Pattern | SafariBookings | TourRadar | Much Better Adventures |
|---|---|---|---|
| Social proof above the fold | 3,174 operators, review counts in the thousands | Trust bar: 2,000 operators, 4.6 Trustpilot, 10,000+ reviews, 24/7 support | Review counts per trip |
| Inventory unit | the **tour**, priced | the **tour**, priced | the **trip**, priced |
| Card anatomy | rating, country, price band, tour types | photo, days, rating + count, from-price, discount | photo, days, rating, from-price |
| Price anchoring | price range per day | strikethrough + "60% off" | from-price |
| Saved items | — | heart on every card | heart on every card |
| Display type | utilitarian | Helvetica 700, 72px | Rubik 700, **uppercase**, 48px |

Four things are universal and we should read them as table stakes rather than
as ideas:

1. **A number of operators, and a number of reviews, before anything else.**
   All three lead with counted proof.
2. **The sellable unit is a priced tour**, not a company. A directory of
   companies asks the visitor to do the comparing.
3. **Every card carries a price.** Even "from $683 pp" is a price.
4. **Saving is one tap** and the saved list is a real surface.

## 2. Where we actually stand

Measured against our own database, not estimated:

| | Them | Us |
|---|---|---|
| Priced tours | 13,172 (SafariBookings) | **3** |
| Reviews | 4,454 on a *single* operator | **1 site-wide** |
| Operators | 3,174 | 2,618 listed, **3 claimed** |
| Photos that load | theirs do | ~1 in 30 |

**We match them on supply and lose on everything that makes supply usable.**
2,618 listings is a comparable directory; 3 claimed listings and 1 review is
not a comparable product. Every structural gap above is the same gap: nobody
has claimed their listing yet.

That is why the outreach work matters more than any feature on this list.
Claiming sets `owner_id`, which simultaneously makes a listing indexable, puts
it in the sitemap, lets the operator add photos and packages, and qualifies it
for Featured and Similar under §9.2. One action unlocks five systems that are
already built and currently idle.

## 3. What to build, in the order that pays

### Tier 1 — makes the directory usable at all

**1. Operator-side package creation that an operator will actually finish.**
The dashboard can already create packages; 3 exist. The gap is not capability,
it is that nobody has been asked. Pair the claim invitation with a two-field
starter ("name your most popular trip, and its from-price") and the inventory
unit becomes a priced tour, like theirs.

**2. Reviews that can exist before a booking does.** 1 review against their
4,454 is the single most visible difference on any comparison. §7.3 already
specifies merging comments into reviews; what is missing is a route for a
traveller who enquired to be asked afterwards. `lead_businesses` already holds
a `review_token` and `review_invited_at` — the mechanism is built and unused.

**3. Photo ingestion (§5.2).** 96% of stored photos are hotlinked Google URLs
and 29 in 30 return 403. Fetch and store ~900 images. Until then MediaFallback
is the common case and we look like a stub directory because we are showing
one.

### Tier 2 — differentiators nobody in this niche has

**4. A real price-transparency tool.** The homepage band already says a
mid-range safari is US$250–450/day and US$100–170 of that is non-negotiable
park fees. Nobody else states this. Turning it into a per-park, per-month
calculator — "7 days, Serengeti + Ngorongoro, July, 2 adults" → fees, vehicle,
lodging, and what is left for the operator's margin — is a tool travellers
would link to each other, and it is defensible because it is built on data we
already hold in `destination_costs` and `destination_seasonality`.

**5. "Quote inbox" with side-by-side comparison.** §16 lists it as later work
and §6.5 already specs the QuoteCard for it. Six quotes arriving in a mailbox
is six emails; six quotes in one view with price, days and inclusions aligned
is the reason to come back to the site rather than deal direct. This is the
single strongest retention feature available to us and the competitors do not
have it — they hand you off to email too.

**6. Licence verification as a public register.** We hold `license_number` and
check it. Nobody else in this niche shows the verification *method*. A public
"how we check, and what we found" page per operator converts the badge from a
claim into evidence.

### Tier 3 — polish that compounds

**7. Month-by-month answers as landing pages.** `/when-to-go/{month}` already
exists against 42 destinations with real seasonality data. These are the
queries people actually type and they are cheap to make excellent.

**8. Saved list → "ask all of these for a quote".** Already specced in §7.14,
already promised in the copy, not yet wired.

## 4. What was built today

- **Typography**: faux bold removed site-wide. Instrument Serif ships one
  weight and 91 places asked for 700, so the browser was smearing outlines at
  53px on the home page H1. `font-synthesis-weight: none` makes the real
  outlines render and makes the defect impossible to reintroduce.
- **Motion**: one `Reveal` primitive — a 12px rise and fade as a block enters
  the viewport, applied to every homepage band. Opacity and translate only, so
  it cannot shift layout; never runs for `prefers-reduced-motion`; never hides
  content from a crawler or a reader without JavaScript; runs once.
- **Hero slideshow** with the LCP, reduced-motion and WCAG 2.2.2 costs paid.

## 5. What I would not copy

**Discount theatre.** TourRadar's homepage is a Black Friday banner with "60%
off" strikethroughs on every card. It works for a booking engine with
contracted inventory. For a directory whose proposition is that operators quote
you directly and we add nothing to the price, a fake anchor price is the fastest
way to lose the one thing we are selling.

**A photo-first operator card.** The instinct is to copy Airbnb. SafariBookings
— who know this market — made their operator card almost entirely text:
rating, country of registration, price band, tour types. On a page where a
traveller is comparing operators rather than browsing rooms, the proof points
do the work and the photograph is decoration. §6.5's card is right to lead with
them.
