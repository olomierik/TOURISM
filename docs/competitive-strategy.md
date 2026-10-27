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

**Corrected 26 Oct 2026, after checking the codebase instead of the spec.**
The first version of this section proposed five things. Three of them were
already built, and I had not looked before writing it. A roadmap that bills
for finished work is worse than no roadmap, so what follows states how each
claim was checked.

### Already built — do not commission these

| | Where it lives | How I checked |
|---|---|---|
| Reviews that precede a booking | `lib/reviews/invite.ts`, `/review/[token]` | `lib/dashboard/actions.ts:50` calls `sendReviewInvite()` when an operator marks a lead won; it emails a tokenised link and stamps `review_invited_at` |
| Price transparency | `/trip-cost`, `components/trip/cost-estimator.tsx` (511 lines) | reads the same `destination_costs` (36 rows, with `authority` and `fees_as_of`) and `destination_seasonality` (552 rows) I proposed building on |
| Quote inbox with comparison | `/enquiry/[reference]`, `/account/enquiries` | comparison existed already; the inbox now leads with lowest price and quote count |
| Saved list → ask all | `/account/favorites` | §7.14's sticky bar, shipped with this document's correction |
| Month-by-month landing pages | `/when-to-go` | route exists against the 46 destinations with seasonality rows |

The reviews pipeline is the important correction. It is complete and idle: it
fires when an operator marks a lead **won**, and no operator ever has. One
review site-wide is not a missing feature, it is four owners.

### Genuinely unbuilt

**1. Photo ingestion (§5.2).** Still the largest visible defect and still
untouched. 96% of stored photos are hotlinked Google URLs and 29 in 30 return
403. Fetch and store ~900 images. Everything else on this list is cosmetic
next to it.

**2. Licence verification as a public register.** We hold `license_number` and
check it, and the badge shows on the card and the business page — but there is
no page anywhere stating *how* we check or what we found. That is the step
that turns the badge from a claim into evidence, and no competitor has it.

### The thing that is not a feature

Measured today: **4 businesses with an `owner_id`, 1 claim, 1 review, 3
packages, against 2,618 approved listings.**

Claiming sets `owner_id`, which makes a listing indexable, puts it in the
sitemap, lets the operator add photos and packages, qualifies it for Featured
and Similar under §9.2, and — via the pipeline above — is the only way a review
can ever exist. Five built systems are waiting on that one action.

No amount of further building changes this number. The outreach tooling is
finished and sends nothing on its own; it needs a human to press send.

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
- **Quote inbox**: the enquiries list leads with lowest price and quote count
  instead of making a traveller open each request to learn whether anyone
  replied. Cheapest is picked within one currency and never converted.
  Verified by `scripts/verify-quote-inbox.mjs` as the `authenticated` role,
  because a service-key probe would pass with no SELECT policy on
  `lead_quotes` and the page would then show "no replies yet" on a quoted
  enquiry.
- **Ask all your saved operators** (§7.14), fulfilling a promise the Saved
  page had made since it shipped.
- **A distribution bug fixed on the way**: "Also ask up to 5 similar
  operators — off by default" was never sent to the server, and the server
  matched regardless. Declining to widen a request did nothing; the
  traveller's name, email and phone went to five uninvited operators anyway.

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
