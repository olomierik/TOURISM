# Trips, activities and register checks

What tanzaniaoperators.com classifies by, what of it is worth having, and what
this branch does with it. Read on 8 Nov 2026.

---

## 1. Their classification, as it actually is

Four top-level **intents**, which is the idea worth taking:

| Theirs | Operators | Ours |
| --- | --- | --- |
| Safari | 530 | `safari` |
| Beach | 257 | `beach` |
| Combo | 245 | `combo` |
| Mountain | 151 | `mountain` |

593 unique operators across the four, so most carry more than one. Combo is its
own value rather than "safari AND beach", and that is right: an operator selling
a Serengeti-plus-Zanzibar itinerary is selling something neither single intent
describes.

Then four filter axes:

- **activities** — 9 values: `cultural-tours`, `balloon`, `day-trips`,
  `walking-safaris`, `bird-watching`, `photography`, `snorkeling`, `diving`,
  `spice-tours`
- **licenses** — `tato`, `kinapa` ("TATO: mountain trekking"), `zato`, and
  `contact` ("Phone format checked")
- **price** — `budget`, `mid`, `luxury`
- **duration** — `3d`, `5d`, `7d`
- **min-completeness** — 50%, 80%

On the operator page: name, city, intent icons, register chips with dates,
"Listed on" (which directory pages they appear on), services, and contacts —
website, email, phone, location. Each page carries schema.org `TravelAgency`
JSON-LD. Their filters run client-side off a JSON array embedded in each
category page; the server ignores the query string.

### What we took, and what we left

**Took:** the four intents, the nine activities, the register checks.

**Left:**

- **price and duration.** Measured across all 593: every operator has an empty
  `price` and an empty `duration` array. The facets exist, the filter chips
  render, and nothing is behind them. We already hold real day rates on 
  `day_rate_low`/`day_rate_high`.
- **their trust score and completeness percentage.** Both are their editorial
  judgement about a listing, not a fact about the operator, and a number we
  cannot explain is a number we should not publish.
- **their listing prose.** Every description is a template with the operator's
  details interpolated. Importing 593 of those is migration 059 again — the
  import that produced 438 "Discovered – currently not indexed" pages and the
  AdSense rejection.

### The one real idea: record the absences

Their operator pages say things like

> Not on the TATO list when checked on 24 Oct 2026. Not on the TLTO list when
> checked on 24 Oct 2026. Listed by ZATO (checked 24 Oct 2026).

That third sentence is a badge, and every directory has badges. The first two
are the interesting ones. A row that says *we read the TLTO register on this
date and this operator was not on it* is a statement about our own diligence,
and it is the only thing on a listing that lets a traveller tell a checked
listing from an unchecked one.

So `business_registers.listed` is a boolean and `checked_on` is `not null`. A
missing row cannot distinguish "we looked and found nothing" from "we never
looked"; `listed = false` can. Migration 074's header has the reasoning.

---

## 2. What is in this branch

**Migration 074** — `business_intents`, `business_activities`,
`business_registers`, plus `businesses.import_source` / `import_checked_on` so
an import can be audited or withdrawn as a unit, which 059 could not be.

Register rows are **readable by anyone, writable only by an admin.** An operator
who could edit their own register check would make it worthless, which is the
whole reason it is worth something. Intents and activities an owner may edit.

**`data/tanzania-operator-registers-2026-11-08.json`** — 588 operators, facts
only.

**`scripts/import-operator-registers.mjs`** — matches, enriches, inserts. Dry by
default.

**Profile page** — a "Register checks" block listing every register read, the
ones that carried the operator and the ones that did not, each with its date,
under copy that says plainly that trade-association membership is not a
government licence and that we have not telephoned anyone. Activities render as
badges below it.

**Directory** — a trip-intent chip row above the filters (`?intent=safari`).
Links, not client state, so each is shareable and crawlable, and each keeps the
visitor's other filters. Intent is never relaxed by the fallback passes: a
visitor who asked for mountain operators and is shown beach operators has not
had their filter widened, they have had it ignored.

---

## 3. What the import does

| | |
| --- | --- |
| incoming | 588 |
| already here | 75 |
| new | 513 |
| ambiguous, skipped | 4 |

Matched by phone 43, domain 26, name+city 6. Phone and domain are identities;
a name is a guess, so the name key is only trusted when the city agrees. The
generous direction is the dangerous one — merging two real operators into one
listing hands one company's enquiries to another — so the 4 ambiguous ones are
printed and skipped for a person to look at.

**On the 75 we already hold**, it fills only empty fields: 71 missing emails, 19
missing cities, 5 phones, 5 websites. It never overwrites a value a person put
there.

**The 513 new rows go in as `is_stub = true`**, which migration 059's sitemap
rule already excludes (`is_stub.eq.false,owner_id.not.is.null,is_verified.eq.true`).
They are reachable and searchable on the site; they are not pushed at Google as
thin pages. That is what makes an import this size safe to run, and it is the
answer to the objection in `operator-data-and-claim-proof.md` §2 — the problem
there was never the row count, it was 2,207 indexable template pages.

Evidence written: **1,926 register rows**, of which 1,173 are absences.

---

## 4. Order of operations, and what is still open

Migration 074 **must be applied before this code is deployed.** Without the
tables, `?intent=…` falls through to the curated fallback and logs
`Could not find a relationship between 'businesses' and 'business_intents'` —
degraded, not a 500, but it returns nothing. Verified locally.

Open:

- **The hide-unclaimed-by-default toggle** from `bookings-and-visibility.md` §6
  is not built. Until it is, these 513 unclaimed stubs appear in the default
  directory alongside the claimed ones.
- **TLTO has no positives.** 555 absences, 0 listings, although the compiler
  claims 31 TLTO members. Their flags do not carry it. Read the TLTO register
  directly before showing TLTO as a check that means anything.
- **Re-reading.** A register check has a date on it and nothing refreshes it.
  Six months is the outside limit before `checked_on` should be treated as
  stale, and the script is re-runnable for exactly that reason.
- Still unanswered from #108: narrow the verified-badge wording, or pull the 19
  badges on listings with no licence number.
