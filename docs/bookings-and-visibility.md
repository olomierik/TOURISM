# Bookings, trust and who shows in the directory — 8 Nov 2026

A design for eight things asked together: admin deletion, approving drafts,
hiding unclaimed listings by default, a BOOK action between traveller and
operator, an admin view of booked trips, and letting bookings raise an
operator's visibility and trust.

Everything measured below was read from production on 8 November 2026.

---

## 0. Two of the eight are already done

**Admin can already delete a business.** `/admin/businesses/[id]` renders
`BusinessDangerZone`, which offers *Retire* (soft — sets `deleted_at`, status
`suspended`, reversible) and *Delete* (hard — cascades into the listing's
leads). Both call `deleteBusinessAsAdmin`. Nothing to build; it is at the
bottom of the listing's admin page behind a two-step reveal.

**Drafts could not be approved because the button was missing**, not because
anything prevented it. Fixed in a separate PR. Five listings were sitting in
`draft`, every one claimed by a real operator, the oldest since 22 September —
about a fifth of the directory's claimed supply, invisible for want of a
control. `setBusinessStatus` always handled the transition, audited it and
emailed the owner.

---

## 1. How SafariBookings actually does it

Worth stating plainly, because the answer is the opposite of what the feature
request assumes.

**They never see the booking or the money.** SafariBookings says it is not a
tour operator and does not arrange tours. A traveller requests a quote, the
operator answers by email, and the traveller pays the operator directly.

**"Booked" is self-declared by the operator.** Each quote request in the
operator's dashboard is marked *Booked* or *Not Booked* by the operator
themselves. SafariBookings even tells operators to mark anything older than
three months as Not Booked.

**That flag does not buy ranking.** Ranking is bought with money, explicitly:
operators choose what percentage of booking value they pay per quote request,
and *offering a higher payment per quote request will result in a higher
ranking*. The billed value is SafariBookings' own estimate — their partner
agreement says the value of a quote request is determined by SafariBookings
and *can differ from the actual gross revenue generated when a client books*.

**Trust comes from reviews, not bookings.** Reviews are traveller-initiated and
open to anyone who went on a paid safari with that operator, whether or not
they booked through the platform. Every review is screened by an algorithm,
and anything it cannot confirm goes to human checkers. One review per person
per operator. Operators may reply but **cannot edit or remove** a review.
Paying for reviews is banned and fraud brings suspension. In 2025 they took
38,999 review submissions and published 32,541 — **19% declined**. The
"Performance" label goes to tours from the top 50 highest-rated operators.

### The lesson

SafariBookings collects the operator's booked flag and deliberately keeps it
**out of trust and out of ranking**, because a number one party can type is
not evidence. They spend their verification effort on reviews instead.

This matters for the request below that bookings should raise visibility and a
trust score.

---

## 2. BOOK: the design

### What already exists

`lead_businesses.status` already runs `sent → viewed → responded → quoted →
won → lost → declined`, and `lib/dashboard/actions.ts` already does:

```ts
// A won enquiry means the traveller is travelling with this operator: invite
// them to review it, once, with a "Verified traveller" mark.
if (status === 'won') await sendReviewInvite(leadBusinessId);
```

So a booking concept is half-built. It has two gaps:

1. **It is operator-declared only** — exactly SafariBookings' model, with
   exactly SafariBookings' weakness.
2. **It only exists for leads.** A traveller who found an operator through a
   listing and left via WhatsApp has no lead row, so no `won` is possible.
   That path is most of the site's contact: 257 listings were contacted in 30
   days against **5 enquiries all time**.

### The recommendation: a booking is a handshake, not a declaration

One new table, because a booking must be able to exist without a lead.

```sql
create type booking_status as enum
  ('proposed', 'confirmed', 'completed', 'cancelled', 'disputed');

create table bookings (
  id                     uuid primary key default gen_random_uuid(),
  reference              text unique not null,          -- ET-B-2026-000123
  business_id            uuid not null references businesses(id) on delete cascade,
  traveller_id           uuid not null references profiles(id) on delete cascade,
  -- Set when the booking grew out of an enquiry we routed. Null for the
  -- WhatsApp path, which is the one the lead table cannot see today.
  lead_id                uuid references leads(id) on delete set null,

  status                 booking_status not null default 'proposed',
  declared_by            text not null check (declared_by in ('traveller','operator')),
  traveller_confirmed_at timestamptz,
  operator_confirmed_at  timestamptz,

  travel_start           date not null,
  travel_end             date,
  party_size             smallint check (party_size between 1 and 60),
  -- Self-reported by whoever declared it, shown to both sides and to admin,
  -- and never used to bill. See §4.
  amount                 numeric(12,2),
  currency               char(3),

  cancelled_at           timestamptz,
  cancelled_by           text check (cancelled_by in ('traveller','operator','admin')),
  cancel_reason          text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- A booking counts only once both sides have said so.
alter table bookings add constraint bookings_confirmed_needs_both
  check (status <> 'confirmed'
         or (traveller_confirmed_at is not null and operator_confirmed_at is not null));

-- One live booking per traveller, operator and start date; a second attempt
-- edits the first rather than inflating anybody's count.
create unique index bookings_one_live
  on bookings (business_id, traveller_id, travel_start)
  where status in ('proposed', 'confirmed', 'completed');
```

### The flow

1. **Either side declares.** The traveller gets a *"I've booked with this
   operator"* button on the listing and inside their enquiry thread; the
   operator gets *"Mark as booked"* on a lead and on their bookings page. The
   declaring side's `*_confirmed_at` is stamped; status is `proposed`.
2. **The other side confirms.** In-app for a signed-in traveller; by tokened
   email link otherwise, reusing the `review_token` pattern already on
   `lead_businesses`. On confirmation status becomes `confirmed`.
3. **After travel.** A nightly job moves `confirmed` past `travel_end` to
   `completed` and sends the review invite — the same `sendReviewInvite` path,
   now reachable from the WhatsApp half of the business too.
4. **Either side can cancel** before or after confirmation, with a reason.
   Disagreement sets `disputed`, which is an admin queue, not a number.

Nothing here blocks a traveller who does not want an account: the BOOK button
asks for an email, creates the profile, and the confirmation link does the
rest. That is also how the traveller becomes reviewable.

### Why two-sided is the whole point

A one-sided BOOK is a text field an operator can type into. Two-sided, it is
the only record on the site that two parties with opposing interests both
signed. That is a stronger artefact than SafariBookings has, and it is the
thing worth building — but only if the second signature is real, which §3 is
about.

---

## 3. Visibility and trust: where this goes wrong

> "For operators to click BOOK raises his visibility and trust score"

**Do not do this with a one-sided booking.** An operator who can raise their
own ranking by pressing a button will press it, and the operators who press it
hardest will be the ones with the least real business. The directory's own
rules already say so — `docs/MONETISATION.md` §5 and `design.md` §6.4:
*a trust mark may not be bought*. A badge you award yourself is cheaper than
one you buy.

There is also a quieter failure. Visibility is a finite good: every listing
promoted pushes another down. Promoting self-declared bookings does not just
reward the dishonest operator, it demotes the honest one who did not bother.

### What to do instead

**Only `confirmed` and `completed` bookings count — never `proposed`.** The
traveller's signature is the gate, and it is also the thing an operator cannot
manufacture without a real traveller's email.

**Show the count as a fact, not a score.** On the listing: *"7 trips booked
through Explore Tanzania"*, next to the licence badge. A number with a
definition beats a composite nobody can audit — and every composite "trust
score" eventually gets reverse-engineered and farmed.

**Let it sort, under reviews, with a ceiling.** `lib/curation.ts` already has
the ladder:

```ts
const score = (b) => (b.isVerified ? 4 : 0) + (b.isClaimed ? 2 : 0)
                   + (b.photoCount >= MIN_REAL_PHOTOS ? 1 : 0);
```

Add bookings as the weakest rung and cap it, so it breaks ties but never
overtakes a licence check or a review average:

```ts
+ Math.min(confirmedBookings, 3) * 0.25   // 0 … 0.75, below the photo rung
```

**Make the review the real reward.** A confirmed booking's most valuable
output is that it unlocks a *Verified traveller* review. Reviews are what
SafariBookings built a moat out of — 32,541 published in 2025 against **3 on
this site**. A booking that never produces a review should decay in weight; an
operator with twenty bookings and no reviews is a flag for admin, not a
leader on page one.

### Anti-gaming, concretely

- Traveller and operator must be different accounts, and an operator's own
  account cannot confirm against their own listing.
- The traveller's confirmation must come from a verified email.
- Cap the effect at three bookings, so farming has no tail.
- Flag for admin: an operator whose confirmations all come from accounts
  created the same week, or who has many `proposed` bookings nobody confirmed.
- A `disputed` booking counts for nothing while it is open.

---

## 4. Do not bill on this

The conclusion in `docs/monetisation-model.md` — price leads, not bookings —
**still stands, and this feature does not change it.**

The reason is behavioural, not technical. The moment confirming a booking
costs the operator money, confirmations stop. SafariBookings arrived at the
same place from the other direction: they bill an *estimated* value per quote
request and write into the partner agreement that it may differ from real
revenue, precisely so nobody has to observe a booking.

So: bookings earn visibility and reviews, and cost nothing. Leads cost money.
The `amount` field exists to show both sides what they agreed and to let admin
sanity-check the market — never to raise an invoice.

---

## 5. Admin

**`/admin/bookings`** — every booking, filterable by operator, status and
date, showing both confirmation timestamps so a one-sided claim is obvious at
a glance. A `disputed` queue at the top.

**On each operator's admin page** — confirmed / proposed / cancelled counts,
and the ratio of confirmed bookings to published reviews, which is the single
most useful number for spotting a farmed listing.

Admin should be able to void a booking with a reason. Voided bookings stay in
the table; the count is a derived read, never a stored integer, so no
correction is ever lost.

---

## 6. Hiding unclaimed listings

> "There is no reason to show unclaimed businesses on our listings. Let claimed
> businesses show by default and put a button where if clicked it will show all
> unclaimed businesses."

The instinct is right — most of the directory says nothing. The exact rule
needs care, because of how few claims there are.

### What claimed-only would leave on screen

| category | listings | claimed | what the default page shows |
|---|---|---|---|
| hotels | 1,376 | 6 | 6 |
| safaris | 1,254 | 17 | 17 |
| restaurants | 303 | **1** | **1** |
| car-rental | 259 | 3 | 3 |
| activities | 137 | 3 | 3 |
| tour-guides | 24 | **1** | **1** |

Destinations hold up better than I expected: of 48 destinations with any
listings, **44 keep at least one claimed listing** and only 4 go empty. But
"at least one" is often exactly one, and a Restaurants page with a single
entry does not read as a directory.

One more measurement, with a caveat. Of the 257 listings contacted in the last
30 days, **20 are claimed** — so a claimed-only default removes 92% of what
gets contacted. The caveat matters: we established that most of those 839
contacts were not travellers, so this number overstates the real loss. It is
directional, not decisive.

### The better rule is already in the schema

Migration 059 added `is_stub`: set on listings carrying only imported map data
and no original description. **2,922 of 3,336 approved listings are stubs.**
They are already `noindex` and already out of the sitemap, for exactly the
reason being raised here.

So the default does not need a new concept. It needs the existing one:

| default | rule | listings shown |
|---|---|---|
| **claimed** | `owner_id is not null or is_verified` | **26** |
| **substantial** *(recommended)* | `not is_stub` — which already implies claimed or verified or written-up | **414** |
| **all** | everything approved | 3,336 |

414 is a directory. 26 is a landing page. And because `is_stub` is overridden
at read time by ownership, **a listing joins the default the moment it is
claimed and approved** — which is point 4 of the request, for free, with no
extra rule.

### Make it a dial, not a switch

`platform_settings` already exists for runtime configuration without a deploy.
Add `directory_default_tier` with those three values, start it at
`substantial`, and move it to `claimed` once claimed supply can carry it —
somewhere above 300 claimed listings, on today's category spread.

The button the request asks for stays the same either way: *"Show all 3,336
listings, including unclaimed entries from public map data"*, with the count
in the label so nobody wonders what they are missing. Remember it per visitor
in `localStorage`, not in the URL, so the canonical page stays one page.

Two things must ignore the dial:
- **Near-me**, where a traveller wants everything nearby and an unclaimed
  petrol-station-adjacent lodge is still the nearest bed.
- **Search by name.** Someone typing an operator's name must find them, claimed
  or not, or the directory is lying about its coverage.

---

## 6c. What was actually built, and where §6 was wrong

Built on `main`. §6 above is the design; this is the record of it meeting the
data, including the two places the design did not survive contact.

### Where §6 was wrong: "414 is a directory" was an average

§6 recommended a flat `substantial` default on the strength of one number —
414 listings site-wide — and then printed the per-category table without
applying the rule to it. Doing that arithmetic afterwards, against today's
data (3,854 approved, after the register import):

| category | listings | `substantial` | `claimed` |
|---|---|---|---|
| hotels | 1,376 | **6** | 6 |
| safaris | 1,254 | 404 | 17 |
| restaurants | 303 | **1** | 1 |
| car-rental | 259 | 11 | 3 |
| activities | 137 | 3 | 3 |
| tour-guides | 24 | **1** | 1 |

The 414 is almost entirely Safaris. A flat `substantial` default gives
Restaurants one card and Hotels six — a worse page than the unfiltered one it
replaced, and the opposite of what the request asked for. The site-wide number
was hiding that every other category collapses.

So the rule shipped with a floor: `MIN_TIER_RESULTS = 12`. Two head-count
probes run in parallel, and if the filtered slice cannot fill a page the tier
is dropped for that view and the page **says so** rather than quietly serving
a different rule than its own control advertises. That is the third state in
`components/directory/show-all-listings.tsx`, and it is why
`/directory?category=restaurants` shows everything with an explanation
instead of one lonely card.

### The other departure: URL, not `localStorage`

§6 said to remember the choice per visitor in `localStorage`. It shipped as a
URL parameter (`?all=1`) instead. `localStorage` would have made the same URL
render differently for different people, which breaks sharing, breaks the back
button, and makes the page impossible to describe in a bug report. The
canonical already points at the unparameterised page, so the extra URL does
not compete in the index — which was the only thing `localStorage` was
protecting.

### Deliberately out of scope

The tier applies to `/directory` only. `/[category]` pages keep showing
everything. They are the pages that rank, their own collapse is the worst of
any slice (Hotels 6, Restaurants 1), and a thin-result fallback that fires on
almost every one of them is not a feature — it is a filter that does nothing
except add a paragraph of apology. Revisit when claimed supply is spread
across categories rather than pooled in Safaris.

### §6's own constraint was already being violated

§6 required: *"Search by name. Someone typing an operator's name must find
them, claimed or not, or the directory is lying about its coverage."* The
feature honours it — the tier is dropped whenever a search term is present.
The schema did not.

`business_translations_tsv` has indexed `tagline`, `short_description` and
`description` since migration 011. The business name is **not** in that list
and never has been; it lives on `businesses`, which the trigger cannot see.
Name search appeared to work only because 059's imported listings carry a
template description with the name interpolated into it, so a name query
matched the description by accident. The register import then added 513
listings with no description — correctly — and they became unfindable by the
only string anybody would type. Searching "acatree" returned nothing while
`/business/acatree-tours-and-safaris` answered 200.

Three migrations close it:

| migration | what it does |
|---|---|
| **076** | folds `businesses.name` into the vector at weight A, plus a re-stamp trigger so a rename updates it; backfills 2,568 empty vectors |
| **077** | `import_source` held a 91-character prose sentence with a date glued on, so nothing could match on it; normalised to `tanzaniaoperators.com` across all 588 touched rows |
| **078** | 38 missing translation rows across 5 locales — b5a6a43 fixed this for the 513 imports and did not sweep what was already there |

078 is worth its own line. `blue-lagoon-adventure-tour-travel-ltd` is an
approved, non-stub operator with a real Italian description and *only* an
Italian translation row. It has been serving Italian visitors and 404ing for
everyone else, and it is why the directory's total read 3,853 against 3,854
approved rows. One listing, invisible in four languages, for want of a row.

Two details that cost more thought than the features:

- **076's backfill disables `business_translations_set_updated_at` by name**
  for the duration. Left on, it would have stamped `now()` on all 19,260 rows,
  and `lib/queries/sitemap.ts` derives each business's `lastmod` from the
  newest of its translation rows — announcing to Google that all 3,854 pages
  changed that day. That is precisely the "unreliable lastmod" that
  `sitemap.ts`'s own comment says gets lastmod ignored across a whole site.
  `session_replication_role` would have been the obvious tool and the wrong
  one: it would have taken the tsv trigger down too and written 19,260 null
  vectors.
- **078 runs after 076** so each inserted row is stamped by the new trigger
  and carries its operator's name. Validated as a chain: Blue Lagoon becomes
  findable by name only because 078 gives it a row *and* 076 indexes the name
  — neither fix works alone.

Measured blast radius of the whole chain: 11 businesses get a moved
`updated_at`, not 3,854.

---

## 6b. Should we just copy SafariBookings?

No — and not because their model is bad. It is a good model that **is not
available to this site**, because every part of it is an output of scale
rather than a cause of it.

| their mechanism | what it needs | what we have |
|---|---|---|
| pay-per-quote auction, higher bid ranks higher | many operators competing for the same lead | **5 enquiries, all time** |
| trust from reviews | volume large enough that fakes are statistically visible | **3 published reviews** |
| 19% of reviews declined by human checkers | a review team | one admin |
| 32,541 reviews published in 2025 | a decade of accumulation | 3,336 listings, 26 claimed |

Copying it would mean copying the endpoint of ten years of accumulation and
calling it a strategy. An auction with one bidder is not an auction, and
review-based trust with three reviews is a blank page.

Take one thing from them and leave the rest: **operators may reply to a review
but never edit or remove it, and review fraud ends the account.** That rule
costs nothing and is worth adopting on day one, before there is anything to
abuse.

### The gap worth owning: nobody can check a licence

This is the strongest card in the deck, and it is lying face up.

Tanzania requires tour operators to hold a TALA licence. **There is no working
public register to check one against.** The ministry's own operator list at
maliasili.go.tz worked for a while, then broke, and has not been fixed —
travellers on Tripadvisor ask where to verify a licence and get no usable
answer. Every piece of advice in this market ends at *"ask the operator for
their licence number"*, with no way to check what they tell you. "How to
verify a Tanzania safari operator's TALA licence" and "how to spot a fake
safari operator" are a whole genre of article, all of it written by operators
marketing themselves, none of it authoritative.

That gap is the right one to fill because **it is the only trust signal that
works at 26 listings.** Reviews need thousands of travellers. A booking
handshake needs liquidity. A licence register needs one administrator, a
registry and a published method — and it is immediately useful on the first
listing it covers.

It is also the one thing `competitive-strategy.md` already identified and
nobody built: *"we hold `license_number` and check it… but there is no page
anywhere stating how we check or what we found. That is the step that turns
the badge from a claim into evidence, and no competitor has it."*

### Before any of that: the badge currently overclaims

Measured on 8 Nov 2026, approved listings only:

| | count |
|---|---|
| carry the verified badge | 26 |
| …of those, **with a licence number on file** | **7** |
| …of those, **with no licence number at all** | **19** |
| have a licence number but are *not* verified | 9 |
| verified listings outside Tanzania | 14 |
| licence numbers in the entire table of 3,336 | **16** |

The badge's own copy tells the traveller:

> "Our team has checked that this business is real and that **its licence** and
> contact details are genuine."

and the badge is defined in code as *"§6.4 Licence checked: verified against
the licensing records."*

On 19 of 26 listings there is no licence number in the row to have checked.
Fourteen are not Tanzanian, so a TALA licence is not the thing that was
verified in any case. Whatever check was performed, the sentence on screen
describes a different one.

This has to be settled before a register is built on top of it, and it is a
product decision rather than a technical one:

- **Narrow the claim** — reword the badge to what was actually checked ("we
  confirmed this operator is reachable and real"), and introduce *Licence
  checked* as a separate, rarer mark backed by a number and a date. Honest
  immediately, and the stricter mark starts at 7.
- **Or raise the bar** — keep the wording, remove the badge from the 19 until a
  licence number is collected and checked. Honest immediately, and the badge
  drops to 7 overnight.

The 9 listings that hold a licence number but carry no badge are free work
sitting in the table either way.

### Decided 8 Nov 2026: narrow the claim

The claim was narrowed. Re-measured on the day of the decision, the problem
had grown while the doc sat:

| | when written | on deciding |
|---|---|---|
| carry the verified badge | 26 | **31** |
| …with a licence number on file | 7 | 8 |
| …with **no** licence number at all | 19 | **23** |
| licence number but no badge | 9 | 9 |
| licence numbers in the whole approved table | 16 | 17 |

`is_verified` keeps all 31 listings and now says only what was actually done —
the operator is real and its contact details reach them — with the copy in all
five locales ending *"This is not a licence check."* The admin hint that taught
reviewers the old meaning ("verifying says the licence and the contact details
check out") was the proximate cause and was rewritten too: the badge never
drifted, it was applied exactly as described against data that was not there.

*Licence checked* became a separate §6.4 mark that cannot be asserted without
evidence. Migration 079 adds `license_checked_at`, `license_checked_by` and
`license_checked_source`, and a check constraint refuses a date without both a
licence number and a named source — so the mark is a database guarantee rather
than a convention a future caller can forget. Admin gained the two fields to
record one.

**No date was backfilled onto the 17 numbers on file.** We hold no record of
when or whether anyone checked them, and inventing one is the failure being
fixed. The mark therefore starts at **zero listings** and is earned one at a
time, which is the only thing that makes it worth carrying.

One thing worth keeping: the `verified` badge variant was an alias for the
licence fill, which is how 31 listings came to render in the licence tier's
colour. It now points at the claimed fill, so the ~40 surfaces Phases 5-8 have
not reached stopped overclaiming without being edited.

### What that register looks like

A public page per verified operator, and one index: the licence number, the
category it was issued in, the date it was checked, by whom, and against what
source — plus what was found when it did not check out. Written so a traveller
can repeat the check. No competitor has this, the government does not have it
either, and it answers a question people are already searching for, which is
exactly the question-shaped long-tail traffic `seo-and-traffic.md` argues for.

### The second card: the deposit

The scam in this market has a specific shape. Operators ask for a
non-refundable deposit of roughly 20–50% before travel, paid to a stranger in
another country, and the guidance written for travellers notes they often do
not understand why, and assume the operator will keep the money.

The two-sided booking in §2 answers this without the platform ever touching
the money: a dated record, signed by both parties, of what was agreed —
dates, party size, amount, and the deposit terms. Not a metric, not a score.
Evidence, held by a third party, that a traveller can point at.

SafariBookings structurally cannot do this. They never close the loop, which
is precisely why their "Booked" flag is one-sided and why it buys nothing.

### The third card: WhatsApp

SafariBookings routes quote requests by **email**. Migration 069 recorded the
local reality: *"In Tanzania WhatsApp is how operators answer, and three in
four listings have a phone but no email."* The WhatsApp redirect already
exists and now counts honestly. A booking flow that completes over WhatsApp,
with the platform holding the record, fits how this market actually transacts
in a way a Dutch email marketplace does not.

### So, in order of what differentiates

1. **Fix the badge** — it is the foundation of everything else here, and it is
   currently wrong.
2. **Publish the licence register** — the only trust that works at this size,
   and a search-demand gap nobody fills.
3. **Ship the two-sided booking as a record of terms**, deposit included —
   consumer protection, not a leaderboard.
4. **Adopt their one free rule** — operators may reply to reviews, never edit
   or remove them; fraud ends the account.

None of these needs scale to be true. All of them get stronger with it. That
is the test a differentiator has to pass, and the pay-per-quote auction fails
it.

---

## 7. Order of work

| # | item | effort | note |
|---|---|---|---|
| 0 | ~~Settle the verified badge~~ | done 8 Nov | narrowed; *Licence checked* is now a separate mark, earned, starting at 0 |
| 1 | Approve the five drafts | minutes | PR already open; a fifth of claimed supply |
| 2 | `directory_default_tier` set to `substantial`, plus the show-all button | 2 days | 414 listings, not 26 |
| 3 | The public licence register | 3 days | the differentiator that works at this size |
| 4 | `bookings` table and the two-sided flow | 1 week | the piece with no equivalent elsewhere |
| 5 | Review invite on `completed`, and the no-edit-no-remove rule | 1 day | reuses `sendReviewInvite`; 3 reviews today |
| 6 | `/admin/bookings` and per-operator counts | 2 days | |
| 7 | Booking count on the listing, capped sort rung | 1 day | **only** after 4–6 is proven |

Item 6 last, deliberately. Until bookings are being confirmed by real
travellers in real numbers, a visibility reward has nothing honest to measure
and everything to farm.

---

## Sources

- [SafariBookings — Genuine Reviews from Real Travelers](https://www.safaribookings.com/genuine-reviews)
- [SafariBookings — Ranking System, Recommendation Labels & Filter Options](https://help.safaribookings.com/hc/en-150/articles/25465918704029)
- [SafariBookings — Introduction to the Dashboard](https://help.safaribookings.com/hc/en-150/articles/28839340976669-Introduction-to-the-SafariBookings-Dashboard)
- [SafariBookings — Partnership Agreement for Tour Operators](https://www.safaribookings.com/partnership-agreement-for-tour-operators)
- [SafariBookings — Converting More Requests to Bookings](https://help.safaribookings.com/hc/en-150/articles/19487006345117)
- [Tripadvisor Tanzania forum — Website to verify TALA license?](https://www.tripadvisor.com/ShowTopic-g293747-i9226-k15369426-Website_to_verify_TALA_license-Tanzania.html)
- [How to Verify a Tanzania Safari Operator's TTLB / TALA License](https://savunda.com/blog/verify-tanzania-safari-operator-license)
- [Tanzania Safari Scams: How to Spot Fake Operators](https://safarani.co.tz/articles/tanzania-safari-scams-how-to-book-safely)
