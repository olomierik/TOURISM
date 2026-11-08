# tanzaniaoperators.com, and who is allowed to claim a listing

Two halves of one request, from 8 Nov 2026: import that site's operators and
activities into ours, and make the claim process check that the contacts used
were really the operator's.

The second half is built and in this branch. The first half I recommend against
in the form asked for, and the rest of this is why, with what I would do instead.

---

## 1. What that site actually is

Read on 8 Nov 2026. Their own About page, not my inference:

> We show association listings that we can check. Association membership is
> voluntary, and the government tour operator licence (TALA) has no public list
> that we can check.

Their stated sources and counts:

| Source | Listings |
| --- | --- |
| TATO — Tanzania Association of Tour Operators | 431 |
| TLTO — Tanzania Licensed Trekking Operators | 31 |
| ZATO — Zanzibar Association of Tour Operators | 129 |
| Supplied by the operator | 20 |

Their badges, in their words: **"Phone number format checked. We have not called
the business."** And *Claimed* "is not a licence check or an endorsement."

They charge operators $100/yr to edit a profile, and they run an Opt-Out &
Corrections page.

So the premise of the request does not hold. The site does not contain verified
licences. It contains **association membership, which it did not verify either**,
plus a regex on the phone number. It is the same kind of artefact as our own
directory: a compilation, one person's reading of other people's registers.

## 2. Why importing it would make this site worse, not more trustworthy

Three reasons, in order of how much they cost us.

**We have run this experiment already and it failed.** Migration 059 imported
2,207 template listings. The result is in the Search Console numbers from this
same week: 438 pages sitting in *Discovered – currently not indexed*, Google
declining to crawl them, and an AdSense rejection for low-value content. Adding
593 more rows built from someone else's text is the identical move. The constraint
on this site is not how many operators it lists — it already lists 3,336 — it is
that only 26 are claimed and 414 have enough substance to be worth a visit.

**Their verification does not survive the trip.** Their card says *Listed by
TATO*. If we import it, we either carry that sentence over — in which case we are
republishing a claim we did not check, sourced from a page that says it did not
check it either — or we drop it, in which case we have imported 593 names and no
trust. Showing it as ours is the badge-overclaiming problem already flagged in
`bookings-and-visibility.md` §6b, except at twenty times the scale.

**It is their database, and they police it.** A compilation is protectable as a
compilation in most of the jurisdictions that matter to us, they sell access to
editing it, and they maintain a corrections process that exists to track who is
copying. We would be the directory whose answer to "where did your data come
from" is a competitor's name.

## 3. What to do instead

Go to the sources they name. TATO, TLTO and ZATO publish their own member
registers; that is where their 591 came from. Reading the register directly is
legitimate, is fresher than their copy of it, is attributable in a sentence a
traveller can check, and — the part that matters — **TATO requires its members to
hold a valid TALA licence**, so TATO membership is a real signal rather than a
relabelled one.

And use it as an **overlay, not an import**. The listings mostly already exist:
3,336 of them. A register match should write to the listing we have —

- `association` and `association_id`, shown as "TATO member, register read 8 Nov
  2026", with the register linked
- nothing in the verified badge, which stays reserved for a licence number we
  have actually seen (see the open decision in `bookings-and-visibility.md` §6b)

— and should create a new row only where no listing matches on name, phone or
domain. Dozens of new rows, not 593, and every existing listing gets stronger
rather than being buried under new ones.

That also happens to be the thing their site cannot do and says so: there is no
public TALA list to check. Ours is the directory that went and looked. That is
worth more than 593 names.

---

## 4. The claim-proof half — built in this branch

The ask: *"makesure the claiming process check and verify if the proper contacts
were used during claiming to avoid anyone claiming other people busineses."*

**Most of it already existed.** `lib/claims/verification.ts` sends a one-time
code to the contact address the licensing register published — not an address the
claimant typed — hashes the code with HMAC before storing it, expires it in 30
minutes and locks out after 5 attempts. There is a second route for an operator
who controls the listing's website domain. This is a stronger check than the
competitor's, which is a regex.

**What was missing was that nothing required it.** Measured on 8 Nov 2026:

| How the 21 approved claims were proved | Claims |
| --- | --- |
| Code answered at the published contact | 19 |
| Evidence paragraph only — no proof | 2 |

A claim can be filed with a 20-character paragraph instead of a code, and
`decideClaim` never read `verified_at`. Worse, `getPendingClaims` did not even
select it, so the reviewer **could not see** which kind of claim they were
approving. `fish-eagle-point` and `shangaa-africa` were handed over on a
paragraph. Both may well be their rightful owners; the point is that the record
cannot say.

Three changes:

1. The queue card now shows the proof as its own line — "Answered a one-time code
   sent to info@…, the contact this listing was published with", or an amber "Not
   proved. This claimant never answered a code at the contact the listing was
   published with."
2. Approving an unproved claim is refused by the server unless the admin writes
   at least 20 characters saying how they established the person runs the
   business. Rejecting needs nothing, since that is the expected outcome.
3. That reason is stored on the claim and in `audit_logs`, alongside the proof
   method and contact for the proved cases too — an audit trail that records only
   the overrides cannot be used afterwards to tell the two apart.

The override stays deliberately open. An operator whose register address is a
dead agency mailbox is a real case, and an admin who rang them knows something
the database does not. What changed is that it leaves a trace.

**Still to decide:** the two historical approvals. I would leave the transfers
alone and ask both operators to answer a code now, which costs them one email and
closes the record.
