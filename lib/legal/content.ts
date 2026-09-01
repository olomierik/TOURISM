/**
 * Privacy policy and terms of service.
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
 * there is no cookie consent interface while Google AdSense loads on guide
 * pages, and analytics rows have no retention limit. Both are noted in the text
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
        'Google AdSense is loaded on travel guide pages and sets its own cookies, which are outside our control and are governed by Google’s policies. There is currently no consent banner offering you a choice about this before it loads. If you are in the EU or UK, that is not the standard you are entitled to, and it is being fixed rather than defended.',
      ],
    },
    {
      heading: 'Who else sees your data',
      body: [
        [
          'Supabase — hosts the database and handles sign-in. All of the above is stored there.',
          'Vercel — serves this site and processes the requests that reach it.',
          'Tour operators — receive the enquiries you send them, and only those.',
          'Flutterwave — processes payments from operators subscribing to paid plans. Card details go to Flutterwave directly; this site never sees or stores them.',
          'Google AdSense — serves advertising on guide pages.',
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
