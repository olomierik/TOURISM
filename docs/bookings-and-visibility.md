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

## 7. Order of work

| # | item | effort | note |
|---|---|---|---|
| 1 | Approve the five drafts | minutes | PR already open; a fifth of claimed supply |
| 2 | `directory_default_tier` set to `substantial`, plus the show-all button | 2 days | 414 listings, not 26 |
| 3 | `bookings` table and the two-sided flow | 1 week | the piece with no equivalent elsewhere |
| 4 | Review invite on `completed` | 1 day | reuses `sendReviewInvite`; 3 reviews today |
| 5 | `/admin/bookings` and per-operator counts | 2 days | |
| 6 | Booking count on the listing, capped sort rung | 1 day | **only** after 3–5 is proven |

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
