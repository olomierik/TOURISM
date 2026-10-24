# Next features (2026-10-24)

**Built since:** replies inside the site (#64), verified reviews with operator replies (#65), reminder emails (#66), compare quotes (#67), the claim funnel (#68). The list below keeps them for the record.

What to build next for Explore Tanzania. The model stays enquiries plus operator subscriptions, with ads and Viator
partner links on top. Ordered by value for the effort; each item says what it needs.

## Worth building next

1. **Reply inside the site.** Operators reply to an enquiry by email today, so the conversation leaves the site,
   reply times are only estimated, and no review can be tied to a real enquiry. Add a message thread per enquiry
   (traveller and operator), with an email notice for each new message.
   *Needs:* nothing new; Resend for the notices.
2. **Verified reviews.** When an operator marks an enquiry "won", invite the traveller to review. Show those reviews
   with a "Verified traveller" label and let operators reply publicly. This closes the brief's gap that reviews are
   open to anyone. *Needs:* item 1 helps but isn't required.
3. **Compare quotes.** One request goes to up to six operators. Give the traveller a page listing every reply side by
   side: price, dates, what's included, the operator's rating. That's the moment they choose. *Needs:* item 1, or a
   simple "send a quote" form for operators.
4. **Reminder emails** (the brief's Phase 4):
   - to operators: an enquiry unanswered after 12 hours, and trial ending in 14, 7, 3 and 1 days;
   - to travellers: "did you hear back?" after 2 days.

   Reply speed is what travellers judge operators on. *Needs:* a scheduled job (Supabase cron calling a route, or
   Netlify scheduled functions) and Resend.
5. **A better claim funnel** (Phase 3). Single-use claim links that expire, plus Resend webhooks so bounced and
   complaining addresses are suppressed automatically. Most of the ~2,600 imported listings are unclaimed, and every
   claimed one is a potential subscriber. *Needs:* a Resend webhook secret.
6. **WhatsApp first.** In Tanzania WhatsApp is how operators answer. Add a tracked "Chat on WhatsApp" button on cards
   and in the quote confirmation, and count clicks as contacts in the operator's analytics. *Needs:* nothing.
7. **Monitoring.** Point an uptime monitor (UptimeRobot or Better Stack, both free) at
   `https://exploretanzania.online/api/health`, and add error tracking (Sentry has a free tier). *Needs:* an account,
   five minutes.

## Worth doing when traffic grows

8. **Sponsored placements.** A paid "Sponsored" slot at the top of a category or destination, Viator's Accelerate
   idea. It's always labelled and doesn't affect the organic ranking. It builds on the Featured plan that already
   exists.
9. **Swahili listings.** The interface is translated; listings and guides still read in English. Offer
   machine-translated drafts that operators approve.
10. **Apple sign-in.** The button appears by itself once Apple is set up in Supabase. *Needs:* the Apple Developer
    Program ($99 a year), and renewing the key every 6 months.
11. **Installable app.** A web app manifest so the site can be added to the home screen, with saved trips readable
    offline (useful on safari with no signal).
12. **Discovery jobs in the admin** (Phase 5). Import operators by region and category from Google Places, with a
    preview, deduplication and cost tracking. *Needs:* a Google Places API key and a monthly budget.

## Decisions waiting on the owner

| Decision | Why it matters |
|---|---|
| Plan price: the brief's $200 a year, or the $50/$75 in the database | Trial reminders and the pricing page need one answer |
| Viator partner ID | The "More tours on Viator" links stay hidden until `NEXT_PUBLIC_VIATOR_PID` is set on Netlify |
| AdSense application and consent message | Ads stay off until both are done (`docs/ADS.md`) |
| Apple Developer membership | Needed for Apple sign-in |

Bookings and payments stay out of scope: taking travellers' money means licensing, refunds, chargebacks and payouts
to operators (see the audit, Phase 6).
