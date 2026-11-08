/**
 * Privacy policy, terms of service and refund policy.
 *
 * In TypeScript rather than in messages/*.json for two reasons. Legal text is
 * not UI copy — it is a document with a revision date that someone has to be
 * able to read end to end and diff — and putting several thousand words of it
 * into four locale files would bury the actual interface strings.
 *
 * English only, deliberately. Machine-translating a liability clause into three
 * languages nobody on this project can check is worse than not translating it:
 * a mistranslated limitation is not a smaller promise, it is a different one.
 * The pages say plainly that English governs, which is what a real multilingual
 * site does anyway.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOT LEGAL ADVICE. Every statement below was written by reading this
 * repository — the analytics route, the lead schema, the payment integration,
 * the auth setup — so it describes what the software actually does rather than
 * what a template assumes. That makes it accurate. It does not make it
 * sufficient. This site is published in German, French and Italian, which means
 * GDPR applies, and two gaps are known and unfixed at the time of writing:
 * ads must stay off until Google's consent message (AdSense Privacy &
 * messaging) is set up for the EEA, UK and Switzerland, and analytics rows
 * have no retention limit. Both are noted in the text
 * rather than papered over, and both need a lawyer's eye before this site takes
 * meaningful EU traffic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LegalSection = {
  heading: string;
  /** Paragraphs. A string is prose; an array renders as a bulleted list. */
  body: Array<string | string[]>;
};

export type LegalDocument = {
  title: string;
  /** Shown at the top. A policy without a date is not a policy. */
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const UPDATED = '31 August 2026';

/**
 * The refunds page is newer than the other two and carries its own date.
 *
 * Written 8 Nov 2026 because Paddle will not approve a domain for checkout
 * without one: their add-domain form requires the site to link to or contain
 * terms of service, a privacy notice **and** a refund policy, and this site
 * had the first two and nothing on refunds at all.
 *
 * Two numbers in it are Erick's to confirm rather than mine to invent — the
 * 14-day window on a first payment, and the five working days to answer. Both
 * are written as commitments because a refund policy hedged into uselessness
 * is why people distrust them; if either is wrong, change it here before this
 * goes in front of a Paddle reviewer.
 *
 * Everything else was read out of the code: the 60-day trial from
 * `lib/billing/trial.ts`, the three payment routes from `lib/payments/` and
 * `lib/billing/bank.ts`, and the cancellation rule from the Terms, which
 * already says a cancelled plan runs to the end of the period paid for. This
 * page must not quietly contradict that sentence, and does not.
 */
const REFUNDS_UPDATED = '8 November 2026';

export const PRIVACY: LegalDocument = {
  title: 'Privacy',
  updated: UPDATED,
  intro:
    'This page describes what Explore Tanzania collects, why, and what happens to it. It was written by reading the code that does the collecting rather than from a template, so where it is specific — a column name, a hashing method, a third party — that is because the software genuinely works that way.',
  sections: [
    {
      heading: 'What we collect when you simply read the site',
      body: [
        'Page views are recorded without storing anything that identifies you. There is no cookie for analytics and no advertising identifier involved. Each event stores the page path, the language, the type of event, and a visitor hash.',
        'The visitor hash is worth explaining, because it is the part people are usually right to be suspicious of. It is a keyed hash of your IP address, your browser user-agent string, and the current date. Your IP address is never written to the database — only the hash is — and because the date is part of the input, the hash changes every midnight UTC. That means we can tell that two page views in one day came from the same browser, and we cannot tell that today’s visitor is the same person as yesterday’s.',
        'Requests that identify themselves as bots are discarded before anything is stored.',
        'These rows currently have no automatic expiry. That is a gap rather than a policy, and it is being addressed.',
      ],
    },
    {
      heading: 'What you give us on purpose',
      body: [
        'When you request a quote, the form collects what an operator needs in order to answer you:',
        [
          'your name and email address',
          'your phone or WhatsApp number, if you choose to give one',
          'where you want to go, when, and how many of you there are',
          'a budget range, if you enter one',
          'the message you write',
          'the page you came from, so we can tell which listing prompted the enquiry',
        ],
        'This is passed to the operators we match you with. That is the entire point of the form — an enquiry nobody receives is not an enquiry — but it does mean your details leave this site and reach a tour company. We match on where you are going and what you asked for, and we tell you which companies received it.',
        'If you create an account, we store your email address, your name, and whatever you add afterwards: saved trips, saved listings, reviews you write. Sign-in is handled by Supabase; where Google or Apple sign-in is enabled, that provider tells us your email address and name and nothing else.',
      ],
    },
    {
      heading: 'Where you are',
      body: [
        'Two different things on this site ask a browser for a location, and they are worth separating.',
        'On the near-me page, pressing "Use my location" asks your browser for your position and sends it to our server once, to run one query. It is not written to the database, it is not logged, and it is not put in the address bar — the search is a form submission rather than a link, precisely so that your position does not end up in your history or in a referrer header. It is also used to centre the map, which means OpenStreetMap receives a request for the tiles around you and can infer roughly where you are from it. The prompt only appears when you press the button.',
        'If you run a business listed here, the dashboard offers to record your location so that travellers searching nearby can find you. That coordinate is stored, and it is shown publicly on your listing and on maps — that is what it is for. It is only stored if you press the button; nothing is captured in the background, and you can change it whenever you like.',
        'Where a listing has no coordinates of its own, it may be placed at the centre of the town named in its address. Those are marked as approximate everywhere they appear, and no distance is shown for them, because the centre of a town is not an address.',
      ],
    },
    {
      heading: 'Cookies',
      body: [
        'Signing in sets a session cookie. It is necessary — without it you would be signed out on every page — and it is removed when you sign out.',
        'A short-lived cookie also remembers where you were heading when you were asked to sign in, so you land back on the right page afterwards.',
        'Your language and light or dark preference are stored in your browser, not on our servers.',
        'This site can show advertising from Google AdSense on travel guides, destination pages and the business directory. While ads are switched on, third-party vendors, including Google, use cookies to serve ads based on your previous visits to this site and other websites. Google’s use of advertising cookies lets it and its partners serve ads to you based on your visits to this and other sites.',
        'You can opt out of personalised advertising in Google’s Ads Settings (adssettings.google.com), and out of many other vendors’ cookies at aboutads.info. Visitors in the EEA, the UK and Switzerland are asked for consent through Google’s consent message before any advertising cookies are set.',
      ],
    },
    {
      heading: 'Who else sees your data',
      body: [
        [
          'Supabase — hosts the database and handles sign-in. All of the above is stored there.',
          'Netlify — serves this site and processes the requests that reach it.',
          'Tour operators — receive the enquiries you send them, and only those.',
          'Flutterwave — processes payments from operators subscribing to paid plans. Card details go to Flutterwave directly; this site never sees or stores them.',
          'Google AdSense — serves advertising on guide, destination and directory pages while ads are switched on.',
        'Viator (a Tripadvisor company) — destination pages may link to tours on Viator as a partner. If you follow such a link, Viator sets its own cookies, and if you book within 30 days it may pay us a commission. It costs you nothing extra.',
          'OpenStreetMap — serves the map tiles on destination, directory, listing and near-me pages. Loading a map sends your IP address and the tile coordinates you are looking at to their servers. On the near-me page those tiles are centred on you, so the request reveals roughly where you are. A map is only loaded once it is on screen, so a page you do not scroll through sends nothing — but on the near-me page the map is the first thing under your results, so it loads as soon as they appear.',
        ],
        'We do not sell anything to anyone, and we do not share your enquiry with operators you were not matched to.',
      ],
    },
    {
      heading: 'What you can ask us to do',
      body: [
        'You can ask for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Deleting your account removes your profile, your saved trips, your saved listings and your reviews.',
        'Enquiries you have already sent are the exception worth being straight about: once an operator has received your message, we cannot reach into their inbox and remove it. We can delete our copy.',
        'To make any of these requests, use the contact page.',
      ],
    },
    {
      heading: 'Children',
      body: [
        'This site is for people arranging travel and is not intended for children. We do not knowingly collect information from anyone under 16.',
      ],
    },
    {
      heading: 'Changes',
      body: [
        'When this page changes, the date at the top changes with it. There is no notification list; the date is the record.',
      ],
    },
  ],
};

export const TERMS: LegalDocument = {
  title: 'Terms',
  updated: UPDATED,
  intro:
    'The short version: this is a directory and a set of planning tools. We introduce you to tour operators. We do not sell trips, take bookings, or hold your money, and the contract for any trip is between you and the operator.',
  sections: [
    {
      heading: 'What this site is',
      body: [
        'Explore Tanzania lists tour operators, lodges and guides across Tanzania, Kenya, Uganda and Rwanda, alongside reference material about destinations, seasons, costs and events. You can send an enquiry and be matched with operators who run the kind of trip you described.',
        'We are not a travel agent and not a tour operator. We do not take bookings, issue tickets, hold client money, or act as agent for either side. When you book, your contract is with the operator, under their terms, and any money you pay goes to them.',
      ],
    },
    {
      heading: 'What the listings are, and are not',
      body: [
        'Most listings on this site were compiled from public sources — operator websites, tourism board registers, public business listings — and have not been claimed by the business they describe. A listing is not a recommendation and not a warranty that the company is currently trading, licensed, or any good.',
        'Where a listing shows a verification badge, that means we checked a specific thing and it is stated on the listing. It does not mean we have inspected vehicles, met guides, or audited insurance.',
        'Check licensing and insurance with the operator, and with the relevant national tourism authority, before you pay anyone anything.',
      ],
    },
    {
      heading: 'Prices, costs and estimates',
      body: [
        'The cost figures on this site — day-rate bands, park fees, the trip cost estimator — are indicative. They are built from published rates, they carry the year they were checked, and they are there so you can tell a reasonable quote from an absurd one. They are not offers, and nobody is bound by them.',
        'Park fees in particular are set by governments, revised annually, and sometimes quoted before tax. An estimate on this site is a starting point for a conversation with an operator, not a price.',
        'Where an operator publishes a special offer, the terms of that offer are theirs. The struck-through price shown alongside it is that operator’s own published package price on this site, not a figure we or they invented for the occasion.',
      ],
    },
    {
      heading: 'Using the site',
      body: [
        'You may read, search and share anything here. Please do not:',
        [
          'scrape the listings wholesale or republish the database',
          'submit enquiries you do not mean, or send operators spam through this site',
          'write reviews for businesses you have not used, or for or against a competitor',
          'attempt to access accounts, dashboards or data that are not yours',
        ],
        'We remove content and close accounts that do these things.',
      ],
    },
    {
      heading: 'If you are an operator',
      body: [
        'You may claim your listing if you can prove you represent the business. Once claimed, you are responsible for what appears on it: prices you publish, packages you describe, offers you run, and replies you send to travellers.',
        'Anything you publish must be true and something you can actually deliver. Offers must be honoured on the terms you set, for as long as you say they run.',
        'Paid plans are billed as described on the pricing page. You can cancel; the plan runs to the end of the period you have paid for.',
      ],
    },
    {
      heading: 'Reviews and content from other people',
      body: [
        'Reviews are written by travellers and are their opinions, not ours. We remove reviews that are abusive, obviously fabricated, or written by someone with a stake in the business, but we do not verify that every review describes a real trip.',
        'Descriptions, photographs and prices on operator listings come from the operator or from public sources, and are their responsibility rather than ours.',
      ],
    },
    {
      heading: 'What we do not promise',
      body: [
        'We work to keep this site accurate and available, and neither is guaranteed. Information can be out of date, an operator can go out of business between our checking and your reading, and the site can be down.',
        'Because we are not a party to your trip, we are not liable for it: not for an operator who disappoints you, not for a cancelled departure, not for anything that happens on the ground. That is between you and the company you booked with, and it is why the paragraph above about licensing and insurance matters.',
        'Nothing here limits liability that cannot lawfully be limited.',
      ],
    },
    {
      heading: 'Governing language and law',
      body: [
        'This site is published in English, German, French and Italian. The English version of this page and the privacy page is the one that governs; the other languages exist to help you read the site, not to create four different agreements.',
        'If something here needs settling, we would rather you wrote to us first. The contact page is the way to do that.',
      ],
    },
  ],
};

export const REFUNDS: LegalDocument = {
  title: 'Refunds',
  updated: REFUNDS_UPDATED,
  intro:
    'The short version: this page is about the paid plans tour operators buy from us. If you are a traveller, you have not paid us anything — your money went to the operator — and the first section explains what that means for getting it back.',
  sections: [
    {
      heading: 'If you are a traveller, read this first',
      body: [
        'We never hold your money. This site does not take bookings, deposits or trip payments; when you pay an operator, you pay them directly, and we are not in the middle of it. That is stated on the Terms page too, and it is the single most important thing on this one.',
        'So a refund for a trip, a deposit or a cancelled departure is the operator’s to give, under the terms you agreed with them. We cannot issue it, reverse it, or compel it, and any page that told you otherwise would be lying to you.',
        'If an operator has taken your money and gone quiet, the things that actually help are:',
        [
          'your card issuer or mobile money provider — a chargeback or reversal is the real remedy, and it has time limits, so do this early',
          'the national tourism authority the operator is licensed by',
          'your travel insurer, if you have one',
        ],
        'Tell us as well. We cannot get your money back, but we can act on the listing, and an operator who does this to one traveller is doing it to others.',
      ],
    },
    {
      heading: 'What this policy does cover',
      body: [
        'The paid listing plans an operator buys from us — Premium and Featured. Both are annual: one payment for a year, with nothing billed monthly. That is the only money this site ever collects.',
        'There are three ways to pay one, and they matter later in this page because a refund comes back by the route it went out:',
        [
          'by card, through Paddle, who are the merchant of record and whose name appears on the statement',
          'by card or mobile money, through Flutterwave',
          'by bank transfer, which an administrator matches against the statement by hand',
        ],
      ],
    },
    {
      heading: 'The sixty days before any of this applies',
      body: [
        'Every listing gets one 60-day Premium trial, started by the owner pressing a button. Nothing is charged when it ends — the listing simply returns to the free plan — and no card is needed to start it.',
        'That is deliberate, and it is why the refund window below is as short as it is. You get two months of the paid tier for nothing, through a whole enquiry season, before you are asked to pay anything at all.',
      ],
    },
    {
      heading: 'Your first payment: fourteen days',
      body: [
        'If you are unhappy with a plan, we will refund your first payment on it in full within 14 days of that payment, for any reason, including no reason. You do not have to argue the case and we will not ask you to.',
        'This applies once per business, to the first payment made after the trial. It is not a rolling fortnight on every invoice.',
      ],
    },
    {
      heading: 'Renewals and cancellation',
      body: [
        'You can cancel a plan at any time, and the plan then runs to the end of the period you have already paid for. You do not lose the remainder, and we do not pro-rate it back to you — the two are the same arrangement described from different ends.',
        'A renewal that has already been charged is not automatically refundable, so cancel before the renewal date if you do not want it. Keep an eye on the date for an annual plan in particular; it is a year between reminders.',
        'If a renewal caught you out and the listing has sat unused since, write to us anyway. This is discretion rather than a right, and we would usually rather refund it than keep money from somebody who had stopped using the site.',
      ],
    },
    {
      heading: 'When we refund regardless of the window',
      body: [
        'Some things are our mistake, and the fourteen days do not apply to them:',
        [
          'you were charged twice, or charged the wrong amount — refunded in full, always',
          'you were charged after cancelling — refunded in full',
          'we removed or suspended your listing for something that was not your doing — refunded for the part of the period you lost',
          'the site was unavailable or the paid features were broken for a sustained stretch of your billing period — refunded in proportion, at our judgement',
        ],
        'You should not have to ask for the first two. If we spot them we will fix them, and if you spot them first, we will not make you prove it.',
      ],
    },
    {
      heading: 'How the money comes back',
      body: [
        'Always to the method it was paid with. We cannot send a card refund to a mobile money wallet or a bank transfer to a card, and we will not send money to an account that did not pay us — that is how refund requests are used to launder a stolen card.',
        'Card payments taken through Paddle are refunded through Paddle, who are the merchant of record for them. Their name, not ours, is what you will see on the statement in both directions, and the money typically lands in five to ten business days depending on your bank.',
        'Card and mobile money payments through Flutterwave return the same way, usually faster for a wallet than for a card.',
        'Bank transfers are refunded by bank transfer, and this is the slow one. It is done by hand, we need the account details to send it to, and it will not be instant.',
      ],
    },
    {
      heading: 'How to ask',
      body: [
        'Through the contact page. Tell us the business name and, if you have it, the payment reference from your receipt — that is the fastest way for us to find the transaction rather than ask you more questions.',
        'We answer refund requests within five working days. If a request is refused you will be told why, in a sentence that makes sense, rather than pointed back at this page.',
      ],
    },
    {
      heading: 'Your rights outside this policy',
      body: [
        'Nothing here limits any right that cannot lawfully be limited. If the law where you are gives you a stronger remedy than this page does, the law wins, and we are not going to make you argue about it.',
        'Most operators buy a plan as a business rather than as a consumer, which in many places means consumer cancellation rights do not apply. We are not relying on that within the first fourteen days: the refund above is offered to everyone on the same terms.',
      ],
    },
    {
      heading: 'Governing language',
      body: [
        'This site is published in English, German, French, Italian and Swahili. The English version of this page is the one that governs; the other languages exist to help you read the site, not to create five different policies.',
      ],
    },
  ],
};
