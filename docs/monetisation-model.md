# The monetisation model: pay-per-lead, priced as a share of trip value

Written 2026-11-07. Answers four questions: leads or commission or
subscription; what the competition actually charges; whether to sell enhanced
visibility; and how other platforms know a booking happened.

It builds on `MONETISATION.md` (measured 2026-11-01) rather than replacing it.
That document's ordering — images, then claims, then owners seeing their own
numbers, then billing — still holds and nothing here moves it. One of its
constraints needs amending, and §6 says which and why.

## 1. The short answer

**Pay-per-lead, prepaid, priced as a percentage of the estimated trip value.
Not commission. Not a monthly subscription. Not yet.**

Commission is the better-aligned product and it is unavailable: you cannot
invoice a percentage of a booking you cannot see, and the only players who can
see bookings are the ones that take the payment. Subscription is available and
wrong at this size: it charges for hope, and the churn when the leads do not
arrive costs the supply side that took a year to assemble.

Pay-per-lead is the only model where the thing being charged for is the thing
that can be proved delivered.

The timing is not a detail. At **3 enquiries all time** there is no lead
business, and `MONETISATION.md` is right that the binding constraint is the
**17 claimed listings out of 3,336**. Section 5 sets the thresholds.

## 2. What the competition charges

### The direct comparable

SafariBookings is the one to copy, with one deliberate difference. Its
[partnership agreement for tour operators](https://www.safaribookings.com/partnership-agreement-for-tour-operators)
is public, and the mechanism is unusually clean:

| Clause | What it says |
|---|---|
| Art. 4.1 | Listing the company and using the review service is **free** |
| Art. 4.2 | Each quote request costs an operator-chosen **percentage of an estimated booking value**, within a range that varies by country, settable per tour or per profile. The estimate "can differ from the actual gross revenue" |
| Art. 4.3 | "The higher the payment percentage Tour Operator offers, the higher its Tours and company profile will rank" — blended with performance (reviews, response time) and relevance |
| Art. 4.4 | The operator may accept a lead or request approval to decline; charged if accepted, or if the decline request is refused at SafariBookings' sole discretion |
| Art. 4.7 | Credit exhausted, tours go offline |
| Art. 4.9 | "Payments to SafariBookings for purchasing advertising credit are non-refundable" |
| Art. 2.6 | A **10% marketing budget** is added on top of the operator's tour rates |
| Art. 9.2 | Leads must be answered within three business days |

Read that twice. It is charged **per lead, from prepaid credit, on delivery** —
but it is *denominated* as a percentage of booking value, so it reads to the
operator like commission while carrying none of commission's obligations. There
is no settlement, no reconciliation, and no exposure to whether the trip
happened.

### The transaction platforms

These charge far more, because they are the booking:

| Platform | Operator cost |
|---|---|
| [TourRadar](https://www.sambahq.com/ota-supplier-guide/ota-commission-rates) | 15.25% commission + 1.75% tech fee + up to 3% payment processing — **18.7–20% all-in**, the only one publishing components |
| [Viator](https://otaplaybook.com/viator-commission-rate-what-operators-actually-pay/) | Unpublished; operators report **20–25%**, commonly 25%. Plus a $29 non-refundable fee per new product listing since August 2025. [Accelerate can push effective rates to 30–35%](https://kijo-digital.com/guides/viator-getyourguide-commission/) in competitive categories |
| [GetYourGuide](https://bookwithkong.com/blog/getyourguide-vs-viator-vs-klook) | **20–30%**, standard commonly cited at 30%, negotiated to 25–28% at volume |

Zicasso, kimkim and Evaneos run referral-plus-commission — specialists receive
enquiries at no charge and pay on the sale — but none publishes a rate, so
treat the structure as confirmed and the number as unknown.

These figures matter as a ceiling, not a target. **An operator demonstrably
pays 20–30% of trip value for a booking handed to them.** That is the headroom
a 2–4% lead fee sits inside, and it is why the lead fee has room to rise later.

### The adjacent per-lead markets

Worth reading for the failure modes rather than the prices:

- **[Thumbtack](https://thebookingflow.com/blog/lead-generation/thumbtack-for-contractors/)**:
  dynamic pricing, roughly $15–60+ per lead, commonly $35–60; one estimate puts
  cost per *booked job* near $350. Refunds are issued as platform credit rather
  than money, [requests are frequently denied](https://superdupr.com/blog/is-thumbtack-worth-it),
  and a non-responsive customer is reportedly not a refund reason. Over 1,000
  BBB complaints on file through January 2026; not BBB-accredited.
- **[Bark](https://djcontractormarketing.com/bark-leads-review/)**: credits at
  about $2.35 each, 6–12 credits per lead, so roughly $15–30. Leads are shared
  with up to five professionals and cash refunds are rare.

Both are large, profitable, and widely resented by their supply side, for the
same single reason: **the operator carries all the risk that the lead is
worthless.** SafariBookings Art. 4.9 is the same wound. Section 4 turns that
into the wedge.

These sources are mostly vendor and contractor blogs with commercial interests
and their figures conflict; the bands are reliable, individual numbers are not.

## 3. How platforms know a booking happened

This was the sharpest question asked, and the answer is genuinely surprising:
**in the referral model, nobody verifies.** There are only three honest
mechanisms in the market.

**One — be the transaction.** Viator, GetYourGuide, TourRadar, Booking.com.
They know a booking happened because they took the money. This is the only
mechanism that yields *reliable* booking truth, and it is what the 20–30%
actually buys: inventory and availability management, payment processing,
refunds, chargebacks, customer service, and in several jurisdictions a travel
licence and bonding. It is not available to a site with 3 published packages.

**Two — charge on the lead and decline to care.** SafariBookings, Thumbtack,
Bark. Revenue is decoupled from outcome by design. SafariBookings' agreement
contains **no clause requiring operators to report or confirm bookings at all** —
the estimated booking value is a pricing input, not a settlement figure, and
the agreement says outright it can differ from actual revenue. This is not an
oversight; it is the product. It removes every incentive the operator has to
hide a win, and with it the entire cost of enforcement.

**Three — make self-reporting pay for itself.** The Zicasso/kimkim pattern. The
platform cannot audit the booking, so instead it makes declaring the win worth
more to the operator than concealing it — because the declaration is what
unlocks the review, the ranking, or the next lead.

**This site already implements the third mechanism and does not know it.**
`lib/dashboard/actions.ts:50` fires `sendReviewInvite()` the moment an operator
marks a lead **won**, which sends the traveller a review invitation carrying a
"Verified traveller" mark. The operator who reports the win receives a
verified review. The operator who hides it receives nothing.

That is the whole answer, and it is the right one: **do not build booking
verification. Build the incentive.** Verification is an arms race a 270-visitor
site cannot win and does not need to fight. An operator under-reporting wins
forfeits the verified reviews that make the next lead convert, and reviews plus
response time are what drive ranking (§6). Under-reporting has to cost more
than it saves — and once ranking is published, it does.

A concrete consequence: **never** price a lead off self-reported booking value.
Report-your-own-win works for reputation precisely because the operator gains
by it; the instant the same field determines an invoice, it inverts, and every
won lead becomes a lost one. SafariBookings keeps these strictly apart by
estimating trip value itself. So should this site.

## 4. Pricing

**2–4% of estimated trip value per accepted lead. Minimum $8, maximum $120.
Prepaid credit, $100 minimum top-up.** On a $3,000 safari at 3%, that is $90.

A percentage rather than a flat fee because safari trips run from roughly $800
day trips to $15,000 private itineraries. Any flat fee is simultaneously
insulting on the large leads and extortionate on the small ones, which is
precisely why SafariBookings denominates in percent. **The site estimates the
value from the enquiry itself** — party size, nights, destinations, season,
accommodation tier — never from the operator's own declaration.

### The wedge: a real decline path

This is the one place to deliberately diverge from SafariBookings, and it is
worth more than any pricing tweak.

- **Traveller does not reply within 72 hours → credit returned automatically.**
  Non-reply is measurable; no adjudication needed.
- **Decline a lead inside 12 hours of delivery → no charge, no approval.**
  Not Art. 4.4's "sole discretion".
- **Duplicate or spam → credit returned, no argument.**
- Abuse control is a ceiling on free declines (say 30% of leads in a month),
  not a discretionary veto.

Thumbtack's 1,000+ BBB complaints and SafariBookings' non-refundable clause are
the same injury, and it is the loudest grievance of operators on both. "You
only pay for leads that answer you" is a sentence that sells itself to a
Tanzanian operator who has been burned, and it costs little: contact activity
is already being counted in `contact_clicks`.

### What the revenue actually looks like

Honest arithmetic, at a $3,000 average trip and 3%:

| Accepted leads / month | Monthly revenue |
|---|---|
| 30 | $2,700 |
| 100 | $9,000 |
| 300 | $27,000 |

Against **3 enquiries all time**, this is not yet a business, and no choice of
pricing model changes that. The work for the next two quarters is demand and
claims, not billing. Section 2's one useful conclusion is that the model is
sound and the price has headroom — not that it can be switched on.

## 5. Sequence and thresholds

`MONETISATION.md`'s ordering is unchanged: images → claims → owners see their
own WhatsApp numbers → billing. The measurement is already built — 240 WhatsApp
chats across 158 listings in thirty days, recorded per business in
`contact_clicks` and already surfaced in the operator dashboard. **The gap is
not instrumentation. It is that only 17 businesses have an owner who can log
in and look.**

- **Now → 200 claimed listings.** Charge nothing. Claims are the only metric
  that matters; every unclaimed listing is a lead with nobody to sell it to.
  Report-the-win → verified review is already live and should be made explicit
  in the dashboard copy, because it is the booking-truth mechanism.
- **200 claims and a double-digit median monthly contact count** —
  `MONETISATION.md`'s existing trigger — **plus 30+ enquiries a month.** Now
  turn on prepaid lead billing. The enquiry floor is an addition: claims alone
  make subscriptions sellable, but lead billing needs leads.
- **100+ enquiries a month.** Raise toward 4%, open the operator-settable bid
  (§6), and only here consider collecting deposits — the one route to real
  commission, at 10–15% of a 20% deposit the site processes, never of a trip it
  merely referred. That is a payments product with licensing implications; do
  not start it earlier for the sake of a cleaner revenue model.

Subscriptions are not killed, they are demoted. Keep `SUBSCRIPTIONS_ENABLED`
false; revisit a flat annual tier once lead billing is running, as a
volume-discount wrapper for operators who would rather cap their spend.

> **Overridden, 9 November 2026.** `SUBSCRIPTIONS_ENABLED` is now `true` —
> Erick's call, ahead of lead billing rather than after it. The recommendation
> above is left as written because its reasoning about sequencing is still the
> better argument on the merits; it was simply not the decision taken. What
> changed in the meantime is that the prices exist (080), a checkout provider
> is configured, and a claim now starts a 60-day Premium trial on its own, so
> an operator can meet the paid tier by using it rather than by buying first.
> `lib/billing/enabled.ts` has the detail.

## 6. Enhanced visibility, and amending the §5 constraint

`MONETISATION.md` §5 says: "do not sell placement, and do not sell
verification. §6.4 already says a trust mark may not be bought."

**The verification half is right and should never be relaxed.** A directory
whose badges are for sale has nothing left to charge for. Keep it absolutely.

**The placement half is being read too broadly, and PR #97 has already
overtaken it** by shipping admin boosts — which is worth resolving deliberately
rather than leaving as a live contradiction between the strategy document and
the code.

SafariBookings Art. 4.3 shows the defensible version: ranking weighs the
operator's bid **alongside** review performance, response time and relevance.
The operator who pays more ranks higher *among operators who already clear the
quality bar* — the bid is a tiebreak inside a band, not a ladder across bands.

Proposed rule, to replace §5's blanket prohibition:

> **rank = relevance × earned quality × bid**, where bid moves a listing only
> within its quality band and never across one. An operator with no reviews and
> a five-day response time cannot outrank one with forty reviews and a two-hour
> response at any price. The formula is published on the site.

Publishing the formula is itself the trust product. It is the thing
SafariBookings does not do, and it is free.

> **Decided 2026-11-07, and the code now goes further than the rule above.**
> The product decision was that featured operators get the platform's highest
> visibility outright, so what shipped is a pin, not a tiebreak:
>
> - In search, a live boost leads page one of **every** sort order, not only
>   Recommended. So a boosted listing can sit above a better-rated one under
>   "highest rated".
> - In lead routing, `is_featured` sits above subscription tier, beaten only by
>   `reachable` — an operator with no email address still cannot take a slot,
>   because a lead nobody can answer is not a lead.
> - A directory-wide boost reaches searches and leads whose destination or
>   category the operator never filled in. Silence is relaxed; a stated
>   coverage list is still honoured exactly as before.
>
> What holds the trust side up instead of the quality band: every pinned card
> carries the Featured label, the pin is capped at four per page, pinned rows
> are prepended rather than swapped in so nothing they displace leaves the
> directory, page two onward is untouched by placement, and verification and
> review ordering remain unbuyable. The honest-ranking cost is real and is
> named here rather than hidden: under an explicit sort, position no longer
> means only what the sort says it means. Publishing the formula (below) is
> what keeps that from being a lie — a disclosed pin is an advert, an
> undisclosed one is a rigged result.

Two consequences:

1. **PR #97's admin boosts are now the ranking lever**, applied as above and
   disclosed on every card they move. They are still admin-created rather than
   operator-settable; turning them into a self-service bid is the remaining
   step toward §4's auction, and until then the "formula is published" promise
   means publishing that featured placement is paid for and capped.
2. **The public demand board shipped in PR #97 is the better visibility
   product** and should be priced first. Operators paying to see and answer
   demand is the same revenue with none of the ranking-integrity exposure.

Never sellable, at any volume: verification or trust marks; review placement or
ordering; the ability to suppress a bad review; any position above a
better-rated operator.

## In one paragraph

Charge per lead, prepaid, at 2–4% of a trip value the site estimates itself —
the SafariBookings mechanic, because commission needs booking truth that only
payment processors have and subscriptions need volume this site does not have.
Diverge on refunds: credit back any lead the traveller never answers, which is
measurable and is the loudest unmet grievance in every comparable market. Do
not build booking verification; `lib/dashboard/actions.ts:50` already pays
operators in verified reviews for reporting their own wins, and that incentive
is how every referral platform in this market actually learns a booking
happened. Sell visibility as a bid that reorders listings only within an earned
quality band, publish the formula, and keep trust marks unbuyable forever.
Switch none of it on until 200 listings are claimed and enquiries clear 30 a
month; at 3 enquiries all time the constraint is demand, and no pricing model
fixes that.
