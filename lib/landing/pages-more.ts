import type { LandingPage } from './types.ts';

/** Safari styles, trip lengths, departure points, activities and the rest of East Africa. */
export const morePages: LandingPage[] = [
  // ---------------------------------------------------------------- styles
  {
    slug: 'budget-tanzania-safari',
    group: 'styles',
    heading: 'Budget Tanzania safaris',
    shortLabel: 'Budget safaris',
    metaTitle: 'Budget Tanzania Safari — Cheap Camping Tours from {count} Operators',
    metaTitleFallback: 'Budget Tanzania Safari — Affordable Camping Tours',
    metaDescription:
      'Affordable Tanzania safaris from about US$200 a day: camping and simple lodges, shared vehicles, and how to save money without cutting corners.',
    keywords: [
      'budget tanzania safari',
      'cheap tanzania safari',
      'affordable safari tanzania',
      'tanzania camping safari',
      'low cost safari serengeti',
      'cheap safari arusha',
    ],
    intro: [
      'A budget safari sees the same animals as a luxury one. The savings come from where you sleep — public campsites or simple lodges outside the park gates — and from sharing the vehicle with other travellers.',
      'Expect to pay roughly US$200 to US$300 per person per day including park fees, vehicle, guide, cook and food. Park fees are fixed, so no honest operator can go much lower.',
    ],
    facts: [
      { label: 'Typical price', value: 'US$200 – 300 per person per day' },
      { label: 'Accommodation', value: 'Dome tents on public campsites, or simple lodges' },
      { label: 'Vehicle', value: 'Shared or private 4x4 with pop-up roof' },
    ],
    sections: [
      {
        heading: 'How to save without regretting it',
        bullets: [
          'Travel in April, May or early November when rates drop.',
          'Join a shared departure if you are one or two people.',
          'Skip the Ngorongoro Crater if you are a couple on a tight budget; the fee is per vehicle.',
          'Mix camping with one lodge night to recover.',
        ],
      },
      {
        heading: 'Where cheap becomes too cheap',
        paragraphs: [
          'A price far below other quotes usually means an overloaded vehicle, an unpaid crew, or park fees you will be asked for later. Ask how many people will share the car and whether every fee is written into the quote.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the cheapest way to do a safari in Tanzania?',
        a: 'A shared camping safari from Arusha of three to five days, travelling outside the peak months of July and August.',
      },
      {
        q: 'Is a camping safari safe?',
        a: 'Yes. Campsites are inside or beside the parks, crews are experienced, and rangers patrol. Follow your guide’s rules about leaving the tent at night.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ', tours: { comfort: 'budget' } },
    guides: ['camping-safari-or-lodge-safari', 'tanzania-safari-cost'],
    related: ['group-joining-safari-tanzania', '3-day-tanzania-safari', 'safari-from-arusha', 'luxury-tanzania-safari'],
  },
  {
    slug: 'luxury-tanzania-safari',
    group: 'styles',
    heading: 'Luxury Tanzania safaris',
    shortLabel: 'Luxury safaris',
    metaTitle: 'Luxury Tanzania Safari — Private Camps, Fly-in Tours & Lodges',
    metaTitleFallback: 'Luxury Tanzania Safari — Private Camps, Fly-in Tours & Lodges',
    metaDescription:
      'Luxury safaris in Tanzania: intimate tented camps, private guides, fly-in itineraries and migration camps. Compare operators who specialise in high-end trips.',
    keywords: [
      'luxury tanzania safari',
      'luxury safari serengeti',
      'luxury safari lodges tanzania',
      'high end safari tanzania',
      'fly in safari tanzania',
      'private luxury safari',
    ],
    intro: [
      'A luxury safari in Tanzania is less about marble bathrooms than about space and time: small camps of a dozen tents in the best locations, a private vehicle and guide, and flights between parks instead of long drives.',
      'Expect roughly US$800 to US$2,000 or more per person per night, depending on the camp and season.',
    ],
    sections: [
      {
        heading: 'What you are paying for',
        bullets: [
          'Camps inside the parks or on private concessions, with fewer vehicles.',
          'A private vehicle and an experienced guide for your group alone.',
          'Light-aircraft flights that turn a day of driving into an hour.',
          'Activities budget lodges cannot offer: walking, night drives, bush dinners.',
        ],
      },
      {
        heading: 'Classic luxury routes',
        paragraphs: [
          'A northern migration safari following the herds, a southern safari in Ruaha and Nyerere ending on a private island, or a short fly-in safari added to a Zanzibar stay.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does a luxury safari in Tanzania cost?',
        a: 'Typically US$800 to US$2,000 per person per night all-inclusive, plus internal flights. The most exclusive camps cost more.',
      },
      {
        q: 'When should I book?',
        a: 'Six to twelve months ahead for July to October, when the best camps fill first.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ', tours: { comfort: 'luxury' } },
    guides: ['fly-in-or-drive-in-safari', 'northern-or-southern-circuit-tanzania'],
    related: ['tanzania-honeymoon-safari', 'private-tanzania-safari', 'great-migration-safari', 'ruaha-safari-tours'],
  },
  {
    slug: 'private-tanzania-safari',
    group: 'styles',
    heading: 'Private Tanzania safaris',
    shortLabel: 'Private safaris',
    metaTitle: 'Private Tanzania Safari — Your Own Vehicle & Guide',
    metaTitleFallback: 'Private Tanzania Safari — Your Own Vehicle & Guide',
    metaDescription:
      'Private safaris in Tanzania with your own vehicle and guide: set your own pace, stay at sightings longer, and tailor the route. Compare local operators.',
    keywords: ['private tanzania safari', 'private safari serengeti', 'tailor made safari tanzania', 'custom safari tanzania', 'private guided safari'],
    intro: [
      'On a private safari the vehicle and guide are yours alone. You choose when to start, how long to stay with a leopard, and when to stop for lunch. For families and photographers it makes the biggest difference of any upgrade.',
      'It costs more for two people than a shared trip, and little extra per person for groups of four or more.',
    ],
    sections: [
      {
        heading: 'Why go private',
        bullets: [
          'A window seat and roof space for everyone.',
          'Early starts and late returns at your choosing.',
          'A route built around your interests: birds, cats, photography.',
          'Easy changes when the herds move or the weather turns.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is a private safari much more expensive?',
        a: 'For a couple, often 20 to 40 percent more than sharing. For four or more people the difference per person is small.',
      },
      {
        q: 'Can a private safari be done on a budget?',
        a: 'Yes. Pair a private vehicle with camping or simple lodges.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ', tours: { style: 'private' } },
    guides: ['tanzania-safari-itinerary-5-7-10-days', 'how-to-choose-safari-operator'],
    related: ['luxury-tanzania-safari', 'tanzania-family-safari', 'group-joining-safari-tanzania'],
  },
  {
    slug: 'group-joining-safari-tanzania',
    group: 'styles',
    heading: 'Group joining safaris in Tanzania',
    shortLabel: 'Group joining safaris',
    metaTitle: 'Group Joining Safari Tanzania — Shared Tours for Solo Travellers',
    metaTitleFallback: 'Group Joining Safari Tanzania — Shared Tours for Solo Travellers',
    metaDescription:
      'Join a shared safari in Tanzania and split the vehicle cost. How group departures work, what solo travellers pay, and operators running shared tours.',
    keywords: ['group joining safari tanzania', 'shared safari tanzania', 'solo safari tanzania', 'join a safari group arusha', 'safari for solo travellers'],
    intro: [
      'Travelling alone does not mean paying for a whole vehicle. On a group joining safari you take one seat in a vehicle with up to five or six other travellers, and the biggest fixed costs — vehicle, guide and fuel — are shared.',
      'Shared safaris usually run three to six days on the northern circuit, starting and ending in Arusha.',
    ],
    sections: [
      {
        heading: 'Check before you pay',
        bullets: [
          'How many people will be in the vehicle. Six is the comfortable maximum.',
          'Whether the departure is confirmed or depends on more bookings.',
          'Exactly which fees are included.',
          'Who else is booked, roughly by age and nationality.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does a shared safari cost?',
        a: 'Roughly US$200 to US$350 per person per day on a camping or basic lodge safari.',
      },
      {
        q: 'Is there a single supplement?',
        a: 'Often in lodges. On camping safaris a tent of your own usually costs little or nothing extra.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ', tours: { style: 'shared' } },
    guides: ['solo-travel-group-joining-safari'],
    related: ['budget-tanzania-safari', 'safari-from-arusha', '3-day-tanzania-safari'],
  },
  {
    slug: 'tanzania-family-safari',
    group: 'styles',
    heading: 'Family safaris in Tanzania',
    shortLabel: 'Family safaris',
    metaTitle: 'Family Safari in Tanzania — Child-Friendly Tours & Lodges',
    metaTitleFallback: 'Family Safari in Tanzania — Child-Friendly Tours & Lodges',
    metaDescription:
      'Plan a Tanzania family safari: the best parks for children, age limits, malaria, short drives and family-friendly lodges. Compare operators.',
    keywords: ['family safari tanzania', 'tanzania safari with kids', 'child friendly safari', 'family safari packages', 'safari with children tanzania'],
    intro: [
      'Children often love safari more than adults: the animals are close, every drive is a treasure hunt, and the guide becomes a hero. The trick is short drives, a private vehicle and lodges with a pool.',
      'Tanzania works well for families from about age six, with Tarangire, Lake Manyara and Ngorongoro all within a few hours of Arusha.',
    ],
    sections: [
      {
        heading: 'Making it work with children',
        bullets: [
          'A private vehicle so you can stop when they need to.',
          'Two nights per place, never a new lodge every day.',
          'Lodges with a pool and family rooms.',
          'Check minimum ages: some camps and walking safaris set limits.',
          'Malaria tablets suitable for children, from a travel clinic.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What age is best for a safari?',
        a: 'From about six, when children can sit through a game drive and remember it. Many operators take younger children on private trips.',
      },
      {
        q: 'Which parks are best for families?',
        a: 'Lake Manyara, Tarangire and Ngorongoro, because drives are short and wildlife is dense. Add the Serengeti for older children.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ' },
    guides: ['safari-with-children', 'is-tanzania-safe-for-tourists'],
    related: ['private-tanzania-safari', 'lake-manyara-safari-tours', '5-day-tanzania-safari'],
  },
  {
    slug: 'tanzania-honeymoon-safari',
    group: 'styles',
    heading: 'Tanzania honeymoon safaris',
    shortLabel: 'Honeymoon safaris',
    metaTitle: 'Tanzania Honeymoon Safari & Zanzibar Beach Packages',
    metaTitleFallback: 'Tanzania Honeymoon Safari & Zanzibar Beach Packages',
    metaDescription:
      'Plan a Tanzania honeymoon: safari in the Serengeti, then the beach on Zanzibar, Pemba or Mafia. Routes, timing, budgets and honeymoon extras.',
    keywords: ['tanzania honeymoon', 'honeymoon safari tanzania', 'safari and beach honeymoon', 'zanzibar honeymoon packages', 'romantic safari'],
    intro: [
      'Few places let you watch lions at breakfast and swim in the Indian Ocean the same evening. A Tanzania honeymoon usually combines four or five nights on safari with five or six on the coast.',
      'Tell every lodge it is your honeymoon when you book. Many add an upgrade, a private dinner or a discount.',
    ],
    sections: [
      {
        heading: 'Three routes that work',
        bullets: [
          'Classic: Tarangire, Serengeti and Ngorongoro, then Zanzibar.',
          'Quiet: Ruaha or Nyerere, then Mafia or Pemba.',
          'Short: fly to the Serengeti for three nights, then four on Zanzibar.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does a Tanzania honeymoon cost?',
        a: 'For ten nights a comfortable mid-range trip costs roughly US$6,000 to US$9,000 per couple excluding international flights.',
      },
      {
        q: 'Safari or beach first?',
        a: 'Safari first. Early starts and dust are easier at the beginning, and you fly home rested.',
      },
    ],
    filters: { country: 'TZ', intent: 'combo' },
    guides: ['tanzania-honeymoon-safari-and-beach', 'safari-and-zanzibar-in-one-trip'],
    related: ['tanzania-safari-and-zanzibar', 'luxury-tanzania-safari', 'zanzibar-tours'],
  },

  // ---------------------------------------------------------------- lengths
  {
    slug: '3-day-tanzania-safari',
    group: 'lengths',
    heading: '3-day Tanzania safaris',
    shortLabel: '3-day safari',
    metaTitle: '3-Day Tanzania Safari — Tarangire, Ngorongoro & Manyara Tours',
    metaTitleFallback: '3-Day Tanzania Safari — Tarangire, Ngorongoro & Manyara Tours',
    metaDescription:
      'The best 3-day safari in Tanzania: Tarangire, Lake Manyara and the Ngorongoro Crater from Arusha. Itinerary, prices and operators to compare.',
    keywords: ['3 day safari tanzania', '3 day tanzania safari', '3 days safari from arusha', 'short safari tanzania', '2 day safari tanzania'],
    intro: [
      'Three days is enough for a real safari if you stay close to Arusha. The classic route is Tarangire on day one, Lake Manyara on day two, and the Ngorongoro Crater on day three, sleeping in Karatu or Mto wa Mbu.',
      'The Serengeti is too far for three days by road. To include it, fly in and out.',
    ],
    sections: [
      {
        heading: 'A tested 3-day route',
        bullets: [
          'Day 1: Arusha to Tarangire, full afternoon game drive.',
          'Day 2: Lake Manyara, then on to Karatu.',
          'Day 3: Ngorongoro Crater at dawn, back to Arusha by evening.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I see the Serengeti in 3 days?',
        a: 'Only by flying. By road, the Serengeti needs at least four or five days to be worth the drive.',
      },
      {
        q: 'How much does a 3-day safari cost?',
        a: 'Roughly US$650 to US$1,200 per person on a camping or simple lodge trip, more in better lodges.',
      },
    ],
    filters: { category: 'safaris', destination: 'arusha', tours: { minDays: 2, maxDays: 3 } },
    guides: ['tanzania-safari-itinerary-5-7-10-days', 'tarangire-or-lake-manyara'],
    related: ['5-day-tanzania-safari', 'ngorongoro-crater-tours', 'tarangire-safari-tours', 'day-trips-from-arusha'],
  },
  {
    slug: '5-day-tanzania-safari',
    group: 'lengths',
    heading: '5-day Tanzania safaris',
    shortLabel: '5-day safari',
    metaTitle: '5-Day Tanzania Safari — Serengeti & Ngorongoro Itineraries',
    metaTitleFallback: '5-Day Tanzania Safari — Serengeti & Ngorongoro Itineraries',
    metaDescription:
      '5-day Tanzania safari itineraries covering Tarangire, the Serengeti and Ngorongoro. Day-by-day route, prices and local operators to compare.',
    keywords: ['5 day safari tanzania', '5 day tanzania safari', '5 days serengeti safari', '5 day safari itinerary', '4 day safari tanzania'],
    intro: [
      'Five days is the shortest trip that includes the Serengeti without feeling rushed. It covers the northern circuit’s three highlights: Tarangire, the Serengeti and the Ngorongoro Crater.',
    ],
    sections: [
      {
        heading: 'A classic 5-day route',
        bullets: [
          'Day 1: Arusha to Tarangire.',
          'Day 2: Through the Ngorongoro highlands to the Serengeti.',
          'Day 3: Full day in the central Serengeti.',
          'Day 4: Morning in the Serengeti, then to the Ngorongoro rim or Karatu.',
          'Day 5: Crater descent at dawn, back to Arusha.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is 5 days enough for a safari in Tanzania?',
        a: 'Yes for a first safari. With four days, drop Tarangire. With seven, add Serengeti nights rather than more parks.',
      },
      {
        q: 'How much does a 5-day safari cost?',
        a: 'From roughly US$1,000 to US$1,500 per person camping, and US$1,800 to US$3,500 in mid-range lodges.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ', tours: { minDays: 4, maxDays: 5 } },
    guides: ['tanzania-safari-itinerary-5-7-10-days'],
    related: ['3-day-tanzania-safari', '7-day-tanzania-safari', 'serengeti-safari-tours'],
  },
  {
    slug: '7-day-tanzania-safari',
    group: 'lengths',
    heading: '7-day Tanzania safaris',
    shortLabel: '7-day safari',
    metaTitle: '7-Day Tanzania Safari — Itineraries, Prices & Operators',
    metaTitleFallback: '7-Day Tanzania Safari — Itineraries, Prices & Operators',
    metaDescription:
      'The most popular safari length: 7 days in Tanzania with three nights in the Serengeti. Day-by-day itinerary, prices and operators to compare.',
    keywords: ['7 day safari tanzania', '7 day tanzania safari', 'one week safari tanzania', '6 day safari tanzania', '7 day safari itinerary'],
    intro: [
      'A week is the most popular safari length for good reason. It allows three nights in the Serengeti, which is where you stop driving past things and start waiting for them, plus Tarangire and the Ngorongoro Crater.',
    ],
    sections: [
      {
        heading: 'A relaxed 7-day route',
        bullets: [
          'Day 1–2: Tarangire, sleeping in or near the park, then Karatu.',
          'Day 3–5: Three nights in the Serengeti, in the area where the herds are.',
          'Day 6: To Ngorongoro, stopping at Olduvai Gorge.',
          'Day 7: Crater descent, back to Arusha, or fly to Zanzibar.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the best 7-day safari in Tanzania?',
        a: 'For most people: Tarangire, three nights in the Serengeti matched to the season, and the Ngorongoro Crater.',
      },
      {
        q: 'Should I fly or drive on a 7-day safari?',
        a: 'Drive in and fly out of the Serengeti. It saves most of a day for the price of one flight.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ', tours: { minDays: 6, maxDays: 8 } },
    guides: ['tanzania-safari-itinerary-5-7-10-days', 'fly-in-or-drive-in-safari'],
    related: ['5-day-tanzania-safari', '10-day-tanzania-safari', 'tanzania-safari-tours'],
  },
  {
    slug: '10-day-tanzania-safari',
    group: 'lengths',
    heading: '10-day Tanzania safaris',
    shortLabel: '10-day safari',
    metaTitle: '10-Day Tanzania Safari — Migration, Parks & Beach Itineraries',
    metaTitleFallback: '10-Day Tanzania Safari — Migration, Parks & Beach Itineraries',
    metaDescription:
      '10-day Tanzania safari itineraries: the northern Serengeti crossings, southern calving, or safari and Zanzibar beach. Routes, prices and operators.',
    keywords: ['10 day safari tanzania', '10 day tanzania itinerary', 'two week safari tanzania', 'tanzania safari and beach 10 days', '14 day tanzania safari'],
    intro: [
      'With ten days you can add depth instead of distance: two regions of the Serengeti, a southern park, or a few days on the beach at the end.',
    ],
    sections: [
      {
        heading: 'Three ways to spend ten days',
        bullets: [
          'July to October: central and northern Serengeti for the river crossings, flying back to Arusha.',
          'January to March: three nights at Ndutu for calving, then the central Serengeti.',
          'Any month: seven days of safari, then three on Zanzibar.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is 10 days too long for a safari?',
        a: 'Not if you vary it. Most people prefer seven days of safari plus a few days on the beach, or a mix of driving and flying.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ', tours: { minDays: 9, maxDays: 14 } },
    guides: ['tanzania-safari-itinerary-5-7-10-days', 'great-migration-month-by-month'],
    related: ['7-day-tanzania-safari', 'tanzania-safari-and-zanzibar', 'great-migration-safari'],
  },

  // ---------------------------------------------------------------- from
  {
    slug: 'safari-from-arusha',
    group: 'from',
    heading: 'Safaris from Arusha',
    shortLabel: 'Safaris from Arusha',
    metaTitle: 'Safari from Arusha — {count} Arusha Tour Operators Compared',
    metaTitleFallback: 'Safari from Arusha — Arusha Tour Operators Compared',
    metaDescription:
      'Arusha is the starting point for Tanzania’s northern safari circuit. Compare Arusha safari companies, day trips and multi-day tours, and get free quotes.',
    keywords: ['safari from arusha', 'arusha safari', 'arusha tour operators', 'arusha safari companies', 'safari tours arusha tanzania'],
    intro: [
      'Arusha is Tanzania’s safari capital. Almost every northern circuit tour starts here, and most of the country’s safari companies have their office and vehicles in town.',
      'From Arusha, Tarangire is two and a half hours away, Lake Manyara two, the Ngorongoro Crater about four, and the Serengeti a full day’s drive or an hour’s flight.',
    ],
    sections: [
      {
        heading: 'Before you set off',
        bullets: [
          'Arrive a day early to protect your safari from a late flight or lost bag.',
          'Book with a licensed office, not with someone who approaches you in the street.',
          'Buy a local SIM card and withdraw cash here; ATMs are rare in the parks.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How far is the Serengeti from Arusha?',
        a: 'About 7 to 8 hours by road, usually split over two days with Tarangire or Ngorongoro on the way, or about an hour by light aircraft.',
      },
      {
        q: 'Which airport is closest to Arusha?',
        a: 'Kilimanjaro International Airport, about an hour away. Arusha’s small domestic airport handles flights to the parks.',
      },
    ],
    filters: { category: 'safaris', destination: 'arusha' },
    guides: ['things-to-do-in-arusha', 'how-to-choose-safari-operator'],
    related: ['day-trips-from-arusha', '3-day-tanzania-safari', 'tanzania-safari-companies'],
  },
  {
    slug: 'safari-from-zanzibar',
    group: 'from',
    heading: 'Safaris from Zanzibar',
    shortLabel: 'Safaris from Zanzibar',
    metaTitle: 'Safari from Zanzibar — Day Trips & Fly-in Safaris',
    metaTitleFallback: 'Safari from Zanzibar — Day Trips & Fly-in Safaris',
    metaDescription:
      'Safaris from Zanzibar: day trips and overnight flying safaris to Nyerere and Mikumi, and longer trips to the Serengeti. Compare operators on the island.',
    keywords: ['safari from zanzibar', 'zanzibar safari day trip', 'zanzibar to serengeti', 'zanzibar to selous safari', 'fly in safari from zanzibar'],
    intro: [
      'You do not need to leave Zanzibar for long to see lions. Light aircraft reach Nyerere National Park in under an hour, so a day trip or a one to two night safari is easy. The Serengeti is a longer flight and best for three nights or more.',
    ],
    sections: [
      {
        heading: 'Options from the island',
        bullets: [
          'Day trip: fly to Nyerere or Mikumi in the morning, game drive, fly back.',
          'Two to three nights in Nyerere with boat and walking safaris.',
          'Three or more nights in the Serengeti, flying both ways.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is a day safari from Zanzibar worth it?',
        a: 'It can be, but you spend much of the day travelling. One night or more is far better value.',
      },
    ],
    filters: { destination: 'zanzibar', intent: 'combo' },
    guides: ['safari-and-zanzibar-in-one-trip', 'fly-in-or-drive-in-safari'],
    related: ['nyerere-selous-safari', 'tanzania-safari-and-zanzibar', 'zanzibar-tours'],
  },
  {
    slug: 'safari-from-dar-es-salaam',
    group: 'from',
    heading: 'Safaris from Dar es Salaam',
    shortLabel: 'Safaris from Dar es Salaam',
    metaTitle: 'Safari from Dar es Salaam — Mikumi, Nyerere & Ruaha Tours',
    metaTitleFallback: 'Safari from Dar es Salaam — Mikumi, Nyerere & Ruaha Tours',
    metaDescription:
      'Safaris from Dar es Salaam to Mikumi, Nyerere (Selous) and Ruaha: by road, train or light aircraft. Compare Dar es Salaam tour operators.',
    keywords: ['safari from dar es salaam', 'dar es salaam safari', 'mikumi safari from dar', 'dar es salaam tour operators', 'weekend safari dar es salaam'],
    intro: [
      'Dar es Salaam is the gateway to the southern circuit. Mikumi is four to five hours by road, which makes it the most popular short safari from the city, and Nyerere and Ruaha are a short flight away.',
    ],
    sections: [
      {
        heading: 'From the city',
        bullets: [
          'Mikumi: two or three days by road, good for a weekend.',
          'Nyerere: fly in, or take the road and boat for an adventure.',
          'Ruaha: fly in for three nights or more.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the closest safari to Dar es Salaam?',
        a: 'Mikumi National Park, about four to five hours by road. Nyerere’s northern gates are a similar distance on rougher roads.',
      },
    ],
    filters: { category: 'safaris', destination: 'dar-es-salaam' },
    guides: ['northern-or-southern-circuit-tanzania'],
    related: ['nyerere-selous-safari', 'ruaha-safari-tours', 'safari-from-zanzibar'],
  },
  {
    slug: 'tanzania-safari-and-zanzibar',
    group: 'from',
    heading: 'Tanzania safari and Zanzibar beach holidays',
    shortLabel: 'Safari and Zanzibar',
    metaTitle: 'Tanzania Safari and Zanzibar Beach Holidays — {count} Operators',
    metaTitleFallback: 'Tanzania Safari and Zanzibar Beach Holidays',
    metaDescription:
      'Combine a Tanzania safari with a Zanzibar beach stay: which comes first, how to fly between them, how long to spend, and operators who arrange both.',
    keywords: ['tanzania safari and zanzibar', 'safari and beach tanzania', 'serengeti and zanzibar package', 'safari zanzibar combo', 'bush and beach tanzania'],
    intro: [
      'Safari then beach is the classic Tanzanian holiday. Direct flights link the Serengeti and Arusha with Zanzibar, so you can go from a game drive to the Indian Ocean in an afternoon.',
    ],
    sections: [
      {
        heading: 'How to split your time',
        bullets: [
          '10 days: five on safari, five on the beach.',
          '7 days: three or four on safari, three on the beach.',
          'Safari first, so the beach is where you rest.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How do you get from the Serengeti to Zanzibar?',
        a: 'By light aircraft, direct or via Arusha, in about two to three hours.',
      },
      {
        q: 'Do I need separate insurance for Zanzibar?',
        a: 'Yes. Zanzibar requires its own inbound travel insurance, bought online before arrival.',
      },
    ],
    filters: { country: 'TZ', intent: 'combo' },
    guides: ['safari-and-zanzibar-in-one-trip', 'zanzibar-which-beach-to-stay'],
    related: ['tanzania-honeymoon-safari', 'safari-from-zanzibar', '10-day-tanzania-safari'],
  },

  // ---------------------------------------------------------------- activities
  {
    slug: 'hot-air-balloon-safari-serengeti',
    group: 'activities',
    heading: 'Hot air balloon safaris in the Serengeti',
    shortLabel: 'Balloon safaris',
    metaTitle: 'Serengeti Hot Air Balloon Safari — Operators That Arrange It',
    metaTitleFallback: 'Serengeti Hot Air Balloon Safari',
    metaDescription:
      'A sunrise hot air balloon safari over the Serengeti: how it works, when to book, what it costs, and operators who include it in their tours.',
    keywords: ['serengeti balloon safari', 'hot air balloon safari tanzania', 'balloon safari serengeti price', 'tarangire balloon safari', 'sunrise balloon serengeti'],
    intro: [
      'A balloon flight lifts off at first light and drifts over the Serengeti for about an hour, low enough to see lion and the herds, high enough to understand the size of the plains. It ends with breakfast in the bush.',
      'Flights run from several areas of the Serengeti and from Tarangire. Places are limited, so book at the same time as your safari.',
    ],
    sections: [
      {
        heading: 'What to know',
        bullets: [
          'Pick-up is around 5 a.m. from your camp.',
          'The flight lasts about an hour; the morning lasts four.',
          'Weight limits and age limits apply, usually a minimum of seven years.',
          'It is weather dependent; a cancelled flight is refunded.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much is a balloon safari in the Serengeti?',
        a: 'Typically around US$500 to US$600 per person, including breakfast. Ask your operator for the current price.',
      },
      {
        q: 'Is a balloon safari worth it?',
        a: 'For many travellers it is the highlight of the trip, especially during the migration.',
      },
    ],
    filters: { activity: 'balloon' },
    guides: ['great-migration-month-by-month'],
    related: ['serengeti-safari-tours', 'luxury-tanzania-safari', 'tanzania-honeymoon-safari'],
  },
  {
    slug: 'walking-safari-tanzania',
    group: 'activities',
    heading: 'Walking safaris in Tanzania',
    shortLabel: 'Walking safaris',
    metaTitle: 'Walking Safari Tanzania — {count} Operators Offering Walks',
    metaTitleFallback: 'Walking Safari Tanzania',
    metaDescription:
      'Walking safaris in Tanzania with armed rangers: where you can walk, what it is like, how safe it is, and operators who offer bush walks and fly-camping.',
    keywords: ['walking safari tanzania', 'bush walk tanzania', 'walking safari ruaha', 'fly camping tanzania', 'foot safari'],
    intro: [
      'On foot you notice what a vehicle drives past: tracks, dung, birdsong, the smell of a recent kill. Walking safaris are offered in Ruaha, Nyerere, Tarangire, Arusha National Park, parts of the Serengeti and the Ngorongoro highlands.',
      'Every walk is led by a guide with an armed ranger, in small groups.',
    ],
    sections: [
      {
        heading: 'What to expect',
        bullets: [
          'Early starts while it is cool, two to four hours on foot.',
          'Single file, quiet, neutral colours.',
          'Large animals viewed from a respectful distance.',
          'Minimum ages, often 12 to 16.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Are walking safaris safe?',
        a: 'With a trained guide and ranger, incidents are very rare. Following instructions — especially never running — is what keeps it safe.',
      },
    ],
    filters: { activity: 'walking_safaris' },
    guides: ['walking-safaris-in-tanzania'],
    related: ['ruaha-safari-tours', 'nyerere-selous-safari', 'day-trips-from-arusha'],
  },
  {
    slug: 'zanzibar-diving-snorkelling',
    group: 'activities',
    heading: 'Diving and snorkelling in Zanzibar and Mafia',
    shortLabel: 'Diving & snorkelling',
    metaTitle: 'Zanzibar Diving & Snorkelling Trips — {count} Operators',
    metaTitleFallback: 'Zanzibar Diving & Snorkelling Trips',
    metaDescription:
      'Diving and snorkelling in Zanzibar, Pemba and Mafia: Mnemba Atoll, whale sharks, the best months, and dive centres and boat operators to compare.',
    keywords: ['zanzibar diving', 'zanzibar snorkeling', 'mnemba snorkeling', 'mafia island diving', 'pemba diving', 'whale shark mafia'],
    intro: [
      'Tanzania’s coast has some of the best reefs in East Africa. Mnemba Atoll off Zanzibar is the most visited; Pemba has dramatic wall dives; Mafia has healthy coral, turtles and, from October to March, whale sharks.',
    ],
    sections: [
      {
        heading: 'Where to go',
        bullets: [
          'Mnemba Atoll: easy snorkelling, dolphins, turtles.',
          'Pemba: deep walls and strong currents for experienced divers.',
          'Mafia Island: marine park reefs and whale sharks.',
        ],
      },
    ],
    faqs: [
      {
        q: 'When is the best time to dive in Zanzibar?',
        a: 'October to March has the clearest water. Avoid the long rains of April and May.',
      },
    ],
    filters: { activity: 'diving' },
    guides: ['mafia-island-whale-sharks', 'best-time-to-visit-zanzibar'],
    related: ['zanzibar-tours', 'tanzania-safari-and-zanzibar'],
  },
  {
    slug: 'day-trips-from-arusha',
    group: 'activities',
    heading: 'Day trips from Arusha',
    shortLabel: 'Day trips from Arusha',
    metaTitle: 'Day Trips from Arusha — Tarangire, Ngorongoro & More',
    metaTitleFallback: 'Day Trips from Arusha — Tarangire, Ngorongoro & More',
    metaDescription:
      'The best day trips from Arusha: Tarangire, Ngorongoro Crater, Arusha National Park, Chemka hot springs and coffee farms. Compare local operators.',
    keywords: ['day trips from arusha', 'arusha day tour', 'arusha national park day trip', 'chemka hot springs', 'materuni waterfalls'],
    intro: [
      'Arusha makes a good base for single-day trips, whether you have a spare day before your safari or only one day for wildlife.',
    ],
    sections: [
      {
        heading: 'Popular day trips',
        bullets: [
          'Tarangire National Park for elephants.',
          'Ngorongoro Crater, a long but rewarding day.',
          'Arusha National Park for walking and canoeing.',
          'Chemka hot springs for a swim.',
          'Coffee farms on the slopes of Mount Meru.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the best day trip from Arusha?',
        a: 'For wildlife, Tarangire. For variety and a walk, Arusha National Park. For relaxation, Chemka hot springs.',
      },
    ],
    filters: { destination: 'arusha', activity: 'day_trips' },
    guides: ['things-to-do-in-arusha'],
    related: ['safari-from-arusha', 'tarangire-safari-tours', 'ngorongoro-crater-tours'],
  },

  // ---------------------------------------------------------------- east africa
  {
    slug: 'kenya-safari-tours',
    group: 'east-africa',
    heading: 'Kenya safari tours',
    shortLabel: 'Kenya safaris',
    metaTitle: 'Kenya Safari Tours — Compare {count} Kenyan Operators',
    metaTitleFallback: 'Kenya Safari Tours — Compare Kenyan Operators',
    metaDescription:
      'Kenya safari tours from local operators: Masai Mara, Amboseli, Samburu and Tsavo. Compare Kenyan safari companies and combine with Tanzania.',
    keywords: ['kenya safari', 'kenya safari tours', 'kenya safari packages', 'kenya tour operators', 'nairobi safari companies', 'amboseli safari'],
    intro: [
      'Kenya pioneered the safari and still offers some of Africa’s best: the Masai Mara during the migration, elephants under Kilimanjaro in Amboseli, and the arid north in Samburu. Most trips start in Nairobi.',
      'Kenya and Tanzania combine easily, with road crossings at Namanga and flights between Nairobi and Kilimanjaro.',
    ],
    sections: [
      {
        heading: 'Kenya’s headline parks',
        bullets: [
          'Masai Mara: big cats all year, the migration from about August to October.',
          'Amboseli: elephant herds with Kilimanjaro behind.',
          'Samburu: rare northern species.',
          'Tsavo: vast, red-earth wilderness on the way to the coast.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Kenya or Tanzania for a first safari?',
        a: 'Both are excellent. Kenya is quicker to reach from Nairobi and has more conservancies; Tanzania has the Serengeti and Ngorongoro and fewer vehicles in the south.',
      },
    ],
    filters: { category: 'safaris', country: 'KE' },
    guides: ['masai-mara-or-serengeti', 'east-africa-tourist-visa'],
    related: ['masai-mara-safari', 'east-africa-safari', 'tanzania-safari-tours'],
  },
  {
    slug: 'masai-mara-safari',
    group: 'east-africa',
    heading: 'Masai Mara safaris',
    shortLabel: 'Masai Mara',
    metaTitle: 'Masai Mara Safari — Migration, Conservancies & Operators',
    metaTitleFallback: 'Masai Mara Safari — Migration, Conservancies & Operators',
    metaDescription:
      'Masai Mara safaris in Kenya: the migration river crossings, private conservancies, when to go, and how the Mara compares with the Serengeti.',
    keywords: ['masai mara safari', 'maasai mara tours', 'masai mara migration', 'masai mara from nairobi', 'masai mara conservancies'],
    intro: [
      'The Masai Mara is the Kenyan continuation of the Serengeti ecosystem. It is smaller and busier, with excellent big cat viewing all year and the migration herds from roughly August to October.',
      'Private conservancies bordering the reserve limit vehicle numbers and allow night drives and walking.',
    ],
    sections: [
      {
        heading: 'Mara or Serengeti?',
        paragraphs: [
          'The Mara is quicker to reach and more compact; the Serengeti is larger, quieter outside the peak areas, and hosts the herds for most of the year. Many travellers combine both.',
        ],
      },
    ],
    faqs: [
      {
        q: 'When is the migration in the Masai Mara?',
        a: 'Usually from late July or August to October, depending on rain.',
      },
    ],
    filters: { category: 'safaris', country: 'KE' },
    guides: ['masai-mara-or-serengeti', 'great-migration-month-by-month'],
    related: ['kenya-safari-tours', 'great-migration-safari', 'serengeti-safari-tours'],
  },
  {
    slug: 'gorilla-trekking-uganda',
    group: 'east-africa',
    heading: 'Gorilla trekking in Uganda',
    shortLabel: 'Gorillas in Uganda',
    metaTitle: 'Gorilla Trekking Uganda — Bwindi Tours & Ugandan Operators',
    metaTitleFallback: 'Gorilla Trekking Uganda — Bwindi Tours & Ugandan Operators',
    metaDescription:
      'Gorilla trekking in Uganda’s Bwindi and Mgahinga: permits, fitness, the best months and Ugandan safari operators who arrange the whole trip.',
    keywords: ['gorilla trekking uganda', 'bwindi gorilla trekking', 'uganda gorilla tours', 'uganda safari companies', 'gorilla permit uganda'],
    intro: [
      'About half the world’s mountain gorillas live in Uganda’s Bwindi Impenetrable Forest. A trek takes from one to several hours through steep forest, and ends with one hour in the company of a habituated family.',
      'Permits are limited and sell out months ahead in the dry seasons, so operators usually secure them as the first step.',
    ],
    sections: [
      {
        heading: 'Before you go',
        bullets: [
          'Book the permit first, then build the trip around it.',
          'Be ready to hike several hours on steep, muddy slopes.',
          'Minimum age is 15.',
          'Combine with chimpanzees in Kibale and a savannah safari in Queen Elizabeth.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is gorilla trekking cheaper in Uganda or Rwanda?',
        a: 'Uganda’s permit is considerably cheaper than Rwanda’s, though reaching Bwindi takes longer.',
      },
    ],
    filters: { category: 'safaris', country: 'UG' },
    guides: ['gorilla-trekking-uganda-or-rwanda', 'east-africa-tourist-visa'],
    related: ['gorilla-trekking-rwanda', 'east-africa-safari', 'kenya-safari-tours'],
  },
  {
    slug: 'gorilla-trekking-rwanda',
    group: 'east-africa',
    heading: 'Gorilla trekking in Rwanda',
    shortLabel: 'Gorillas in Rwanda',
    metaTitle: 'Gorilla Trekking Rwanda — Volcanoes National Park Tours',
    metaTitleFallback: 'Gorilla Trekking Rwanda — Volcanoes National Park Tours',
    metaDescription:
      'Gorilla trekking in Rwanda’s Volcanoes National Park, under three hours from Kigali: permits, short trips, luxury lodges and local operators.',
    keywords: ['gorilla trekking rwanda', 'volcanoes national park', 'rwanda gorilla tours', 'kigali tour operators', 'rwanda gorilla permit'],
    intro: [
      'Volcanoes National Park is under three hours by road from Kigali, which makes Rwanda the quickest place in the world to see mountain gorillas. Many visitors manage it in a two or three day trip.',
    ],
    sections: [
      {
        heading: 'Making a Rwanda trip',
        bullets: [
          'Fly into Kigali; treks start at Kinigi near Musanze.',
          'Add golden monkeys, a hike to Dian Fossey’s grave, or Nyungwe’s chimpanzees.',
          'Combine with a Tanzania safari via a short flight.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I do gorilla trekking from Kigali in a day?',
        a: 'It is possible with a very early start, but staying a night near the park is far more comfortable.',
      },
    ],
    filters: { destination: 'volcanoes-national-park' },
    guides: ['gorilla-trekking-uganda-or-rwanda'],
    related: ['gorilla-trekking-uganda', 'east-africa-safari'],
  },
  {
    slug: 'east-africa-safari',
    group: 'east-africa',
    heading: 'East Africa safaris',
    shortLabel: 'East Africa safaris',
    metaTitle: 'East Africa Safari — Tanzania, Kenya, Uganda & Rwanda Tours',
    metaTitleFallback: 'East Africa Safari — Tanzania, Kenya, Uganda & Rwanda Tours',
    metaDescription:
      'Plan an East Africa safari across Tanzania, Kenya, Uganda and Rwanda: combinations that work, visas, flights between countries and local operators.',
    keywords: ['east africa safari', 'east africa tours', 'kenya and tanzania safari', 'tanzania and rwanda safari', 'africa safari packages'],
    intro: [
      'Four countries share some of the best wildlife on earth: the Serengeti and Ngorongoro in Tanzania, the Masai Mara in Kenya, and the mountain gorillas of Uganda and Rwanda. Short flights link their capitals, so a two-country trip is easy.',
    ],
    sections: [
      {
        heading: 'Combinations that work',
        bullets: [
          'Kenya and Tanzania: the full migration ecosystem in one trip.',
          'Tanzania and Rwanda: savannah safari plus gorillas.',
          'Uganda: gorillas, chimpanzees and savannah in one country.',
        ],
      },
      {
        heading: 'Visas',
        paragraphs: [
          'The East Africa Tourist Visa covers Kenya, Uganda and Rwanda. Tanzania requires its own visa.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Which East African country is best for a safari?',
        a: 'Tanzania for variety and the Serengeti, Kenya for easy access and conservancies, Uganda and Rwanda for gorillas.',
      },
    ],
    filters: { category: 'safaris', intent: 'safari' },
    guides: ['east-africa-tourist-visa', 'masai-mara-or-serengeti', 'gorilla-trekking-uganda-or-rwanda'],
    related: ['tanzania-safari-tours', 'kenya-safari-tours', 'gorilla-trekking-rwanda', 'gorilla-trekking-uganda'],
  },
];
