# SafariBookings teardown — 25 Oct 2026

Reference research for the `design.md` redesign. Examined in Chrome at 1920px:
homepage, `/operators` (3,174 listings), an operator profile (Suricata Safaris,
4,454 reviews) and the quote request form.

SafariBookings is the right comparison: same market, same business model — a
directory where travellers request quotes and operators reply. No instant
booking on either side.

---

## 1. What they actually sell

**13,172 safaris from 3,174 operators.** The headline is a count, and the
inventory unit is the *tour*, not the operator. Every operator card carries
three named tours with prices:

```
Suricata Safaris
5.0/5 – 4,454 Reviews
Office In:     Tanzania
Price Range:   $190 to $600 per person per day (USD)
Tour Types:    Custom budget & mid-range tours that can start every day
Destination:   TZ

  4-Day Group Tour to Tarangire, Serengeti, Ngorongoro   (from $683 pp)
  5-Day Midrange Group Tour with Two Nights in Serengeti (from $1,547 pp)
  6-Day Midrange Group Tour with Two Nights in Serengeti (from $1,856 pp)
  All 26 Tours
```

Explore Tanzania holds **3 packages** against their 13,172 tours. That is the
single biggest structural gap, and it is a supply problem rather than a design
one.

## 2. Their card carries four proof points, none of them a photograph

Worth stating plainly because it contradicts the instinct to copy Airbnb: the
operator card is **text**. The photo is small and incidental. What does the
work is rating, country of registration, price band and tour type.

Measured against the Explore Tanzania database:

| Their field | Their use | Explore Tanzania coverage |
|---|---|---|
| Rating + review count | the spine of the whole site | **1** of 2,618 |
| Price Range per person per day | on every card, and a filter | **1** |
| Operator age in years | a filter ("17 years" … "1 year") | **1** (`founded_year`) |
| Office In (country) | on every card, and a filter | **2,618 — 100%** |
| Licence | not shown publicly | 11 |
| A photograph that loads | small, incidental on their card | **~5%** — see below |

**Four of their five proof points are unavailable here.** Only country is.

## 2b. The photo column is populated; the photos are not there

Measured 25 Oct, and it corrects the "55% have a cover photo" figure used
earlier in this migration:

- **1,428 of 2,618 listings have a `cover_image_url`** — the 55% is real as a
  database statement.
- **945 of a 1,000-row sample (92%) point at `lh3.googleusercontent.com`** or
  another Google host. These are Google Places photo URLs, captured at import.
- **39 of 40 sampled Google URLs return HTTP 403.** Google Places photo links
  are short-lived and were never meant to be stored and re-served.

So roughly **90% of the cover images on this site do not load**, and real
coverage is nearer **5%** than 55%. The audit's "6 broken images" on
`/business/{slug}` (§2.3) is this problem seen from one page.

Two consequences:

- §5.2 **ingestion rules become urgent, not Phase 4 housekeeping.** Photos have
  to be fetched and stored (Supabase storage is already in use — one featured
  listing serves from it today), not referenced.
- §9.2's "≥ 3 real photos" was already unreachable on licence and review
  grounds; on photos it is further away than the column suggests.

Home "Featured" is, by luck, not affected: `getFeaturedBusinesses` filters on
`is_stub = false`, and non-stub listings tend to carry a real website and
self-hosted imagery. 7 of its 8 candidates load. The directory, which applies
no such filter, is where the breakage shows.

## 3. Their filters are supply-derived, not review-derived

From `/operators`:

- **Office In** — 33 countries with counts (Kenya 966, Tanzania 788, Uganda 315)
- **Price Range (Per Day)** — five bands, USD, per person sharing
- **Comfort Level** — Luxury 1,442 · Mid-range 2,522 · Budget 1,014
- **Specialized In** — custom private, shared group, day tours, self-drive,
  photographic, horseback, canoe, birding, golf combos
- **Can Arrange** — international flights, airport transfers, pre/post
  accommodation, road transfers, domestic flights, custom extensions
- **Rating** — 4 bands

Explore Tanzania has none of these structured attributes. They exist because
operators fill them in, which happens because 3,174 operators have claimed
their listings. Explore Tanzania has **3 claimed listings**.

Note their Rating filter counts: ~2,213 of 3,174 operators have a rating, so
roughly **960 of their own listings carry no reviews either**. They solve this
by ranking unreviewed operators below reviewed ones, not by inventing a score.

## 4. The quote form — one page, nine fields

This is the most transferable finding. `design.md` §7.7 records Explore
Tanzania's form as **3 steps and 25 fields**. Theirs:

1. Full Name
2. Email Address
3. Country of Residence
4. Mobile Phone Number — prefixed `+255`, and carrying its own justification:
   *"We need a phone number in case the operator cannot reach you by email."*
5. Country to visit — **pre-answered**, not asked: "This tour operator offers
   tours in the country below. Tanzania"
6. **Tour Duration in Days** (1–15+) — *"Excluding travel time to/from Africa"*.
   Not a date range.
7. Tour Type — radio over **the operator's own published rates**:
   Private/Shared × Camping/Budget/Mid-range/Luxury, each with a real
   `$350 to $450 pp per day`
8. Your Message — with coaching copy: *"You will receive the best response from
   the tour operator if you introduce yourself and share the reasons for your
   interest."*
9. Travellers + Start Date in a sidebar, with **"My dates are somewhat flexible"**

Plus **"Remember my message for future quote requests"** — persistence across
enquiries, which is the thing that makes contacting six operators bearable.

Five decisions worth stealing outright:

- **Duration in days beats a date range.** A traveller eight months out knows
  "about a week"; they do not know 14–21 March. §7.7 already flags the native
  date picker as a problem; this is the answer.
- **Budget as the operator's real published tiers**, not a free min/max. The
  traveller picks a number that exists rather than inventing one.
- **Every intrusive field states why it is needed**, inline, next to the field.
- **Pre-answer what you already know.** Country is stated, not asked.
- **The third "step" is the outcome**, not a form page: "Operator Emails You a
  Quote". It sets the expectation rather than collecting anything.

## 5. Where Explore Tanzania is genuinely ahead

Not a consolation list — these are real and they are the ones to build on:

| | Explore Tanzania | SafariBookings |
|---|---|---|
| Tanzanian listings | **2,618** | 788 |
| Coordinates | **2,545 (97%)**, 2,210 exact | no map product |
| Destination pages | **46**, with month-by-month conditions | country/park pages |
| Editorial | 21 guides, 37 attractions, 552 condition records, cost bands | thin |
| Descriptions / taglines | **100%** | n/a |

They win on structured commercial data and review volume. Explore Tanzania wins
on coverage, geography and editorial depth. A design that competes on their
strengths loses; one that competes on these can win.

---

## 6. Consequence for `design.md` §9.2 — the rule cannot be satisfied

§9.2 requires **all** of the following for Home "Featured":

- Country = Tanzania
- Traveller category
- Tier = **Licence checked**
- **≥ 3 real photos**
- **≥ 3 reviews averaging ≥ 4.0**

Measured today: 11 listings have a licence number, 3 are claimed, and **0 have
a single review**. **No listing can ever qualify**, so Featured would render
empty permanently. §7.1.7 says to hide the section below 3 qualifying listings,
so it fails safe — but it fails to nothing.

The same applies to §7.2's Recommended sort, "licence-checked + claimed + ≥ 3
photos first, then by review count". That is a sort over four near-constant
columns. It is the identical shape to the bug fixed in `eb69a04`, where
`tier DESC, rating_avg DESC` sorted 2,618 rows by two columns that hold one
value each and put a pizzeria on the homepage.

**Recommendation:** keep §9.2 as the *destination* and add a documented interim
rule that ranks on signals the data actually carries today — has a cover photo,
is not an import stub, has coordinates, has a phone or website, is in a
traveller category — tightening automatically as claims, licences and reviews
arrive. This is what `getFeaturedBusinesses` already does since `eb69a04`;
§9.2 should state it as the fallback rather than leaving the rule unsatisfiable.

**Erick's call** — this belongs beside the other open decisions in §17.
