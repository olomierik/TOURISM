import type { LandingPage } from './types.ts';

/** Tanzania-wide pages and the national parks. */
export const tanzaniaPages: LandingPage[] = [
  {
    slug: 'tanzania-safari-tours',
    group: 'tanzania',
    heading: 'Tanzania safari tours',
    shortLabel: 'Tanzania safari tours',
    metaTitle: 'Tanzania Safari Tours — Compare {count} Local Operators',
    metaTitleFallback: 'Tanzania Safari Tours — Compare Local Operators',
    metaDescription:
      'Compare Tanzania safari tours from local operators in Arusha, Moshi and Zanzibar. Serengeti, Ngorongoro, Tarangire and more. Free quotes, no booking fees.',
    keywords: [
      'tanzania safari',
      'tanzania safari tours',
      'tanzania safari packages',
      'tanzania safari holidays',
      'safari in tanzania',
      'tanzania safari prices',
      'book tanzania safari',
    ],
    intro: [
      'Tanzania is the safari country most people picture: the Serengeti plains, the Ngorongoro Crater, elephants under baobabs in Tarangire, and the Great Migration moving through all of it. It is also one of the easiest places in Africa to plan a safari, because hundreds of licensed operators are based in Arusha, the gateway town an hour from Kilimanjaro airport.',
      'This page lists those operators, not resellers. Send one request and up to several local companies reply with their own route and price, so you can compare like with like and book directly with the people who will drive you.',
    ],
    facts: [
      { label: 'Gateway', value: 'Kilimanjaro International Airport, then Arusha' },
      { label: 'Best months', value: 'June to October; January to February for calving' },
      { label: 'Typical length', value: '4 to 10 days' },
      { label: 'Typical price', value: 'From about US$200 per person per day camping, US$400+ in lodges' },
    ],
    sections: [
      {
        heading: 'The northern circuit',
        paragraphs: [
          'Most first safaris follow the northern circuit: Tarangire or Lake Manyara, the Serengeti, and the Ngorongoro Crater, linked by road from Arusha. Five days covers the essentials; seven lets you spend three nights in the Serengeti, which is where the best sightings happen.',
        ],
      },
      {
        heading: 'The southern circuit',
        paragraphs: [
          'Nyerere (formerly Selous) and Ruaha are bigger, wilder and far quieter, with boat and walking safaris. They are reached mostly by light aircraft from Dar es Salaam or Zanzibar, and suit a second safari or travellers who dislike crowds.',
        ],
      },
      {
        heading: 'How to choose a tour',
        bullets: [
          'Fewer parks, more nights: driving between parks takes half a day each time.',
          'A private vehicle with a pop-up roof and a window seat for everyone.',
          'All park fees, the crater fee and drinking water written into the quote.',
          'A licensed operator who will tell you where you sleep each night.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does a Tanzania safari cost?',
        a: 'Roughly US$200 to US$300 per person per day on a camping safari, US$350 to US$700 in mid-range lodges and tented camps, and more for luxury camps. Park fees are a large fixed part of every price.',
      },
      {
        q: 'What is the best time for a safari in Tanzania?',
        a: 'June to October is dry and the most reliable for wildlife. January and February are excellent in the southern Serengeti during the calving season. April and May are the long rains, with the lowest prices.',
      },
      {
        q: 'How many days do I need?',
        a: 'Five days is the shortest trip that includes the Serengeti without rushing. Seven days is the most popular length. Ten days lets you add the northern Serengeti or finish on Zanzibar.',
      },
      {
        q: 'Is it cheaper to book with a local operator?',
        a: 'Usually, because there is no overseas agent in the middle. Check that the company is licensed, ask for a written itinerary, and pay a deposit rather than the full amount up front.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ' },
    guides: ['tanzania-safari-cost', 'how-to-choose-safari-operator', 'tanzania-safari-itinerary-5-7-10-days', 'best-time-to-visit-serengeti'],
    related: ['serengeti-safari-tours', 'budget-tanzania-safari', 'luxury-tanzania-safari', 'tanzania-safari-companies', '7-day-tanzania-safari', 'tanzania-safari-and-zanzibar'],
  },
  {
    slug: 'tanzania-safari-companies',
    group: 'tanzania',
    heading: 'Tanzania safari companies and tour operators',
    shortLabel: 'Safari companies',
    metaTitle: 'Tanzania Safari Companies — {count} Tour Operators Compared',
    metaTitleFallback: 'Tanzania Safari Companies and Tour Operators',
    metaDescription:
      'Find a Tanzania safari company you can trust. Compare licensed tour operators by reviews, response time and where they work, then ask several for a quote.',
    keywords: [
      'tanzania safari companies',
      'tanzania tour operators',
      'best safari companies in tanzania',
      'safari operators arusha',
      'tanzania safari company reviews',
      'local safari company tanzania',
    ],
    intro: [
      'There are several hundred safari companies in Tanzania, from one-vehicle family businesses to firms with fleets of fifty Land Cruisers. Most are based in Arusha. Good ones are easy to find once you know what to look for; poor ones are just as easy to avoid.',
      'Every company below is listed with the parks it works in, how quickly it replies, and its reviews where it has them. Verified operators have confirmed they control the business email or website on their listing.',
    ],
    sections: [
      {
        heading: 'What separates a good operator',
        bullets: [
          'A tourism licence from the Tanzania Tourist Board, which they will show you when asked.',
          'Their own vehicles and employed guides, rather than subcontracting everything.',
          'A clear quote: which lodge each night, what is included, what is not.',
          'Straight answers about guide wages and what happens if the vehicle breaks down.',
        ],
      },
      {
        heading: 'Warning signs',
        bullets: [
          'A price far below every other quote for the same route.',
          'Pressure to pay the full amount immediately, or in cash to a personal account.',
          'Vague answers about park fees or "extras".',
          'Touts approaching you in the street in Arusha.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How do I check a safari company is legitimate?',
        a: 'Ask for its tourism licence number, look for reviews on more than one site, and confirm the company has a physical office. A legitimate operator gives a written itinerary and invoice before taking a deposit.',
      },
      {
        q: 'Should I book with a big company or a small one?',
        a: 'Both can be excellent. Larger companies have more backup vehicles; small owner-run companies often give more personal attention. What matters is the guide you get, so ask who it will be.',
      },
      {
        q: 'Is it safe to pay a Tanzanian operator directly?',
        a: 'Yes, when you pay a company account by card or bank transfer after receiving a written booking. Pay a deposit, typically 20 to 30 percent, and the balance shortly before travel.',
      },
    ],
    filters: { category: 'safaris', country: 'TZ' },
    guides: ['how-to-choose-safari-operator', 'book-direct-or-through-an-agency'],
    related: ['tanzania-safari-tours', 'safari-from-arusha', 'private-tanzania-safari', 'budget-tanzania-safari'],
  },
  {
    slug: 'serengeti-safari-tours',
    group: 'parks',
    heading: 'Serengeti safari tours',
    shortLabel: 'Serengeti safaris',
    metaTitle: 'Serengeti Safari Tours — Compare {count} Operators & Prices',
    metaTitleFallback: 'Serengeti Safari Tours — Compare Operators & Prices',
    metaDescription:
      'Serengeti safari tours from local operators: where the migration is each month, how many days to spend, lodges or camping, and free quotes to compare.',
    keywords: [
      'serengeti safari',
      'serengeti safari tours',
      'serengeti safari packages',
      'serengeti national park tours',
      'serengeti safari cost',
      'serengeti tour operators',
    ],
    intro: [
      'The Serengeti is 14,750 square kilometres of grassland and kopjes in northern Tanzania, home to the largest land migration on earth and some of the densest populations of lion, cheetah and leopard in Africa. It deserves at least three nights.',
      'The park is big enough that where you sleep matters more than which company you book. Central Serengeti has resident game all year; the south hosts the calving from January to March; the north has the Mara River crossings from July to October.',
    ],
    facts: [
      { label: 'From Arusha', value: '7 to 8 hours by road, or about 1 hour by air' },
      { label: 'Nights needed', value: '3 or more' },
      { label: 'Calving', value: 'January to March, southern plains' },
      { label: 'River crossings', value: 'July to October, northern Serengeti' },
    ],
    sections: [
      {
        heading: 'Which part of the Serengeti, and when',
        bullets: [
          'December to March: Ndutu and the southern plains, for calving and big cats.',
          'April to May: central Serengeti; green, quiet and cheap.',
          'June: the western corridor and the Grumeti River.',
          'July to October: the far north around Kogatende for the crossings.',
          'November: the centre and east as the herds move south.',
        ],
      },
      {
        heading: 'Getting there',
        paragraphs: [
          'Most tours drive in from Arusha through Tarangire and the Ngorongoro highlands, making the journey part of the safari. Flying back from a Serengeti airstrip saves most of a day and is the most useful upgrade on any trip of a week or more.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How many days do you need in the Serengeti?',
        a: 'Three nights is the minimum to see it properly; one night is mostly driving. With four or more nights you can split your stay between two regions.',
      },
      {
        q: 'When is the best time to visit the Serengeti?',
        a: 'For the migration river crossings, July to October in the north. For calving, January to February in the south. The central Serengeti is good all year.',
      },
      {
        q: 'Can I do a Serengeti safari from Zanzibar?',
        a: 'Yes. There are daily flights from Zanzibar to Serengeti airstrips, so a two or three night fly-in safari works well from the coast.',
      },
    ],
    filters: { category: 'safaris', destination: 'serengeti' },
    guides: ['great-migration-month-by-month', 'best-time-to-visit-serengeti', 'masai-mara-or-serengeti'],
    related: ['great-migration-safari', 'hot-air-balloon-safari-serengeti', 'ngorongoro-crater-tours', 'tanzania-safari-tours'],
  },
  {
    slug: 'great-migration-safari',
    group: 'parks',
    heading: 'Great Migration safaris',
    shortLabel: 'Great Migration',
    metaTitle: 'Great Migration Safari — Where the Herds Are, Month by Month',
    metaTitleFallback: 'Great Migration Safari — Where the Herds Are, Month by Month',
    metaDescription:
      'Plan a Great Migration safari in Tanzania: calving season, river crossings, the best camps for each month, and local operators who follow the herds.',
    keywords: [
      'great migration safari',
      'wildebeest migration tanzania',
      'serengeti migration safari',
      'mara river crossing safari',
      'calving season safari',
      'best time to see the great migration',
    ],
    intro: [
      'Around one and a half million wildebeest, with zebra and gazelle, circle the Serengeti and Kenya’s Masai Mara every year following the rain. It is not one event but a year-round loop, so the question is never whether the migration is on, but where it is in the month you travel.',
      'Operators who specialise in the migration move their guests, and sometimes their whole camp, to stay close to the herds. Tell them your dates and ask where they will put you.',
    ],
    facts: [
      { label: 'Calving', value: 'January to March, southern Serengeti' },
      { label: 'River crossings', value: 'July to October, northern Serengeti' },
      { label: 'Recommended stay', value: '3 nights or more in the right area' },
    ],
    sections: [
      {
        heading: 'Crossings or calving?',
        paragraphs: [
          'The Mara River crossings are the famous footage: herds plunging into crocodile water. Nobody can schedule one, and three nights near the river gives a fair chance. Calving is calmer and arguably better wildlife viewing, with half a million calves born in a few weeks and predators hunting in open country.',
        ],
      },
      {
        heading: 'Mobile camps',
        paragraphs: [
          'Seasonal tented camps relocate twice a year to follow the herds. They cost more than fixed lodges but put you where the action is rather than hours away.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What month is best to see the Great Migration?',
        a: 'February for calving in the southern Serengeti, and August to September for river crossings in the north. Both depend on rain, which shifts timings by a few weeks each year.',
      },
      {
        q: 'Is the migration better in Tanzania or Kenya?',
        a: 'The herds spend most of the year in Tanzania. Kenya’s Masai Mara has them roughly from August to October. The crossings happen on both sides of the border.',
      },
      {
        q: 'Are river crossings guaranteed?',
        a: 'No. Herds can gather on a bank for days. Staying several nights close to the river, with a patient guide, is the best way to improve your odds.',
      },
    ],
    filters: { category: 'safaris', destination: 'serengeti' },
    guides: ['great-migration-month-by-month', 'best-time-to-visit-serengeti', 'masai-mara-or-serengeti'],
    related: ['serengeti-safari-tours', 'masai-mara-safari', 'luxury-tanzania-safari', '10-day-tanzania-safari'],
  },
  {
    slug: 'ngorongoro-crater-tours',
    group: 'parks',
    heading: 'Ngorongoro Crater tours',
    shortLabel: 'Ngorongoro Crater',
    metaTitle: 'Ngorongoro Crater Tours — {count} Operators, Day Trips & Safaris',
    metaTitleFallback: 'Ngorongoro Crater Tours — Day Trips & Safaris',
    metaDescription:
      'Ngorongoro Crater tours and day trips from Arusha and Karatu: what the crater fee covers, when to descend, where to stay, and local operators to compare.',
    keywords: [
      'ngorongoro crater tour',
      'ngorongoro crater safari',
      'ngorongoro day trip',
      'ngorongoro crater day trip from arusha',
      'ngorongoro conservation area tours',
      'black rhino tanzania',
    ],
    intro: [
      'The Ngorongoro Crater is a collapsed volcano about 19 kilometres across, with some 25,000 large animals living on its floor. Because nothing has far to go, it is the most reliable place in Tanzania to see lion, elephant, buffalo and black rhino in a single morning.',
      'Most safaris include one crater descent of about six hours. It also works as a long day trip from Arusha, leaving before dawn.',
    ],
    facts: [
      { label: 'From Arusha', value: '3.5 to 4 hours by road' },
      { label: 'Time on the floor', value: 'About 6 hours per descent' },
      { label: 'Fees', value: 'Conservation area entry per person, plus a crater service fee per vehicle' },
    ],
    sections: [
      {
        heading: 'Getting the most from a descent',
        bullets: [
          'Be at the gate when it opens: the first two hours have the best light and fewest vehicles.',
          'Stay on the rim or in Karatu the night before.',
          'Bring a warm layer; the rim is at about 2,300 metres.',
          'Keep lunch inside the vehicle at the picnic site — the kites are bold.',
        ],
      },
      {
        heading: 'Beyond the crater',
        paragraphs: [
          'The conservation area also includes Empakaai Crater, with a walk down to a flamingo lake, the Olmoti waterfall, and Olduvai Gorge, one of the most important fossil sites in human history.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I visit Ngorongoro Crater as a day trip?',
        a: 'Yes. From Arusha it is a long day of about 12 hours including six on the crater floor. From Karatu or Mto wa Mbu it is far more relaxed.',
      },
      {
        q: 'Is Ngorongoro Crater worth the cost?',
        a: 'For most first-time visitors, yes. The crater fee is charged per vehicle, so it is much better value for groups of four or more than for couples.',
      },
      {
        q: 'Will I see rhino in Ngorongoro?',
        a: 'It is the best chance in northern Tanzania. A small population of black rhino lives on the crater floor, usually seen at a distance through binoculars.',
      },
    ],
    filters: { category: 'safaris', destination: 'ngorongoro' },
    guides: ['ngorongoro-crater-is-it-worth-it'],
    related: ['serengeti-safari-tours', 'tarangire-safari-tours', 'safari-from-arusha', '3-day-tanzania-safari'],
  },
  {
    slug: 'tarangire-safari-tours',
    group: 'parks',
    heading: 'Tarangire National Park safaris',
    shortLabel: 'Tarangire',
    metaTitle: 'Tarangire Safari Tours — {count} Operators, Day Trips from Arusha',
    metaTitleFallback: 'Tarangire Safari Tours — Day Trips from Arusha',
    metaDescription:
      'Tarangire National Park safaris and day trips from Arusha: elephant herds, baobabs, the best months and local operators to compare.',
    keywords: [
      'tarangire national park',
      'tarangire safari',
      'tarangire day trip',
      'tarangire day trip from arusha',
      'tarangire elephants',
    ],
    intro: [
      'Tarangire is two and a half hours from Arusha and, from June to October, one of the best elephant parks in Africa. As the land around it dries, herds walk in from a huge area to the Tarangire River, the only permanent water.',
      'Ancient baobabs stand over the grass, and the park holds species rarer elsewhere on the northern circuit, such as fringe-eared oryx and lesser kudu.',
    ],
    facts: [
      { label: 'From Arusha', value: 'About 2.5 hours' },
      { label: 'Best months', value: 'June to October' },
      { label: 'Time needed', value: 'A full day, ideally one night' },
    ],
    sections: [
      {
        heading: 'Day trip or overnight?',
        paragraphs: [
          'A day trip from Arusha gives about five hours of game viewing. Sleeping inside or beside the park lets you be out at first light, when the animals are most active and the light is best for photographs.',
        ],
      },
      {
        heading: 'Good to know',
        bullets: [
          'Tsetse flies live in the wooded areas; wear neutral colours, not dark blue or black.',
          'In the wet season the herds disperse and the grass grows tall.',
          'Tarangire pairs naturally with Lake Manyara and Ngorongoro on a three-day trip.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is Tarangire worth visiting?',
        a: 'Yes, especially from June to October when elephant numbers are extraordinary. It is often the first park on a northern circuit safari.',
      },
      {
        q: 'Tarangire or Lake Manyara?',
        a: 'Tarangire in the dry season for big herds; Lake Manyara in the green season for birds and scenery. They are an hour apart, so many trips include both.',
      },
    ],
    filters: { category: 'safaris', destination: 'tarangire-national-park' },
    guides: ['tarangire-or-lake-manyara'],
    related: ['lake-manyara-safari-tours', 'ngorongoro-crater-tours', 'day-trips-from-arusha', '3-day-tanzania-safari'],
  },
  {
    slug: 'lake-manyara-safari-tours',
    group: 'parks',
    heading: 'Lake Manyara safaris',
    shortLabel: 'Lake Manyara',
    metaTitle: 'Lake Manyara Safari Tours — {count} Operators to Compare',
    metaTitleFallback: 'Lake Manyara Safari Tours',
    metaDescription:
      'Lake Manyara National Park safaris: groundwater forest, flamingos, tree-climbing lions and the canopy walkway, with local operators to compare.',
    keywords: [
      'lake manyara national park',
      'lake manyara safari',
      'lake manyara day trip',
      'tree climbing lions tanzania',
      'lake manyara tours',
    ],
    intro: [
      'Lake Manyara is a compact park under the wall of the Rift Valley, about two hours from Arusha. In a single drive you pass through tall groundwater forest full of baboons and blue monkeys, open floodplain, and the edge of a shallow soda lake.',
      'It is one of the best birding parks in Tanzania, and its tree-climbing lions are famous, though seeing one in a tree is a matter of luck.',
    ],
    facts: [
      { label: 'From Arusha', value: 'About 2 hours' },
      { label: 'Best months', value: 'November to May for birds; open all year' },
      { label: 'Time needed', value: 'Half a day' },
    ],
    sections: [
      {
        heading: 'What Manyara offers that other parks do not',
        bullets: [
          'A treetop canopy walkway through the forest.',
          'Night game drives with some operators.',
          'Canoeing when the lake is high enough.',
          'Flamingos and pelicans in large numbers when water levels are right.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How long do you need in Lake Manyara?',
        a: 'Half a day covers the main circuit. It is usually combined with Tarangire or Ngorongoro on the same trip.',
      },
      {
        q: 'Is Lake Manyara good for children?',
        a: 'Very. The drive from Arusha is short and the monkeys in the forest are close and entertaining.',
      },
    ],
    filters: { category: 'safaris', destination: 'lake-manyara-national-park' },
    guides: ['tarangire-or-lake-manyara', 'safari-with-children'],
    related: ['tarangire-safari-tours', 'ngorongoro-crater-tours', 'tanzania-family-safari', '3-day-tanzania-safari'],
  },
  {
    slug: 'nyerere-selous-safari',
    group: 'parks',
    heading: 'Nyerere National Park (Selous) safaris',
    shortLabel: 'Nyerere (Selous)',
    metaTitle: 'Nyerere (Selous) Safari Tours — Boat & Walking Safaris',
    metaTitleFallback: 'Nyerere (Selous) Safari Tours — Boat & Walking Safaris',
    metaDescription:
      'Safaris in Nyerere National Park, formerly the Selous Game Reserve: boat safaris on the Rufiji, walking with rangers, wild dog, and flights from Dar or Zanzibar.',
    keywords: [
      'selous safari',
      'nyerere national park safari',
      'selous game reserve tours',
      'boat safari tanzania',
      'safari from dar es salaam to selous',
      'southern tanzania safari',
    ],
    intro: [
      'Nyerere National Park, carved from the old Selous Game Reserve, is Tanzania’s largest park. The Rufiji River and its lakes run through it, so a day can start on foot with an armed ranger and end in a boat beside hippos and elephants drinking at the bank.',
      'It is a short flight from Dar es Salaam or Zanzibar, which makes it the easiest wilderness to add to a beach holiday.',
    ],
    facts: [
      { label: 'Access', value: 'Light aircraft from Dar es Salaam or Zanzibar; road or train for the adventurous' },
      { label: 'Best months', value: 'June to October' },
      { label: 'Known for', value: 'Boat safaris, walking safaris, wild dog' },
    ],
    sections: [
      {
        heading: 'Why travellers choose the south',
        paragraphs: [
          'Camps are small, vehicles are open-sided, and you can drive for hours without seeing another car. Nyerere is also one of the better places in Africa to look for African wild dog.',
        ],
      },
      {
        heading: 'Seasons',
        paragraphs: [
          'This is a dry-season park. From roughly March to May heavy rain closes roads and most camps shut. June to October is prime time.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is Selous the same as Nyerere National Park?',
        a: 'Nyerere National Park was created from the northern part of the Selous Game Reserve in 2019. Most safaris that say "Selous" now take place in Nyerere.',
      },
      {
        q: 'Can I visit Nyerere from Zanzibar?',
        a: 'Yes. Scheduled light aircraft fly from Zanzibar in under an hour, so a two or three night safari from the beach is straightforward.',
      },
    ],
    filters: { category: 'safaris', destination: 'nyerere' },
    guides: ['northern-or-southern-circuit-tanzania', 'walking-safaris-in-tanzania'],
    related: ['ruaha-safari-tours', 'safari-from-dar-es-salaam', 'safari-from-zanzibar', 'walking-safari-tanzania'],
  },
  {
    slug: 'ruaha-safari-tours',
    group: 'parks',
    heading: 'Ruaha National Park safaris',
    shortLabel: 'Ruaha',
    metaTitle: 'Ruaha National Park Safaris — {count} Operators to Compare',
    metaTitleFallback: 'Ruaha National Park Safaris',
    metaDescription:
      'Ruaha National Park safaris in southern Tanzania: big lion prides, kudu, baobab hills, walking safaris and very few vehicles. Compare operators and camps.',
    keywords: ['ruaha national park', 'ruaha safari', 'ruaha tours', 'southern circuit safari tanzania', 'remote safari tanzania'],
    intro: [
      'Ruaha is remote, dry and dramatic: baobab-covered hills, a wide sand river, large lion prides, big buffalo herds, and both greater and lesser kudu. Many people who have been on several safaris name it their favourite park in Tanzania.',
      'Few visitors make it here, so sightings are usually yours alone.',
    ],
    facts: [
      { label: 'Access', value: 'Light aircraft from Dar es Salaam, Zanzibar or Arusha' },
      { label: 'Best months', value: 'June to October' },
      { label: 'Nights needed', value: '3 or more' },
    ],
    sections: [
      {
        heading: 'Walking and fly-camping',
        paragraphs: [
          'Ruaha is the country’s finest walking park. Some camps offer a night out in a dry riverbed under a mosquito-net tent, which many guests remember as the best night of the trip.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is Ruaha better than the Serengeti?',
        a: 'It is different. The Serengeti has the migration and more variety in a short trip; Ruaha has wilderness and solitude. Ruaha suits a second safari or travellers who dislike crowds.',
      },
      {
        q: 'How do you get to Ruaha?',
        a: 'Most visitors fly in on a light aircraft. Driving from Dar es Salaam takes a full day or more.',
      },
    ],
    filters: { category: 'safaris', destination: 'ruaha-national-park' },
    guides: ['northern-or-southern-circuit-tanzania', 'walking-safaris-in-tanzania'],
    related: ['nyerere-selous-safari', 'walking-safari-tanzania', 'luxury-tanzania-safari'],
  },
  {
    slug: 'kilimanjaro-climbing-tours',
    group: 'activities',
    heading: 'Kilimanjaro climbing tours',
    shortLabel: 'Climb Kilimanjaro',
    metaTitle: 'Kilimanjaro Climbing Tours — Compare {count} Licensed Operators',
    metaTitleFallback: 'Kilimanjaro Climbing Tours — Compare Licensed Operators',
    metaDescription:
      'Climb Kilimanjaro with a licensed local operator. Compare routes (Machame, Lemosho, Marangu, Rongai), prices and summit success, and get free quotes.',
    keywords: [
      'climb kilimanjaro',
      'kilimanjaro climbing tours',
      'kilimanjaro trek',
      'kilimanjaro tour operators',
      'kilimanjaro climb cost',
      'machame route',
      'lemosho route',
      'marangu route',
    ],
    intro: [
      'At 5,895 metres, Kilimanjaro is the highest mountain in Africa and the highest you can walk up without technical climbing. Every climber must go with a licensed guide, so choosing the operator is the most important decision you make.',
      'The companies below are based in Moshi and Arusha. Ask each one for the same route and number of days, and compare what they include rather than the headline price.',
    ],
    facts: [
      { label: 'Height', value: '5,895 m (Uhuru Peak)' },
      { label: 'Recommended length', value: '7 days or more' },
      { label: 'Best months', value: 'January to early March; June to October' },
      { label: 'Typical price', value: 'About US$2,000 to US$3,500 for a well-run 7-day climb' },
    ],
    sections: [
      {
        heading: 'Choosing a route',
        bullets: [
          'Machame: scenic and popular, six to seven days, tents.',
          'Lemosho: quieter start, excellent acclimatisation, seven to eight days.',
          'Marangu: huts instead of tents, but shorter and lower success.',
          'Rongai: from the drier north side, good in the rainy months.',
          'Northern Circuit: the longest and highest success rate.',
        ],
      },
      {
        heading: 'Why cheap climbs cost more',
        paragraphs: [
          'Park fees alone are close to US$1,000 per person on a seven-day climb. A quote far below US$1,800 leaves little for porters’ wages, food or safety equipment. Ask what a porter earns and whether oxygen and a pulse oximeter are carried.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does it cost to climb Kilimanjaro?',
        a: 'Expect US$2,000 to US$3,500 per person for a well-run seven-day climb, plus around US$250 in crew tips. Premium climbs cost more.',
      },
      {
        q: 'How many days does it take?',
        a: 'Between six and nine. Seven days or more gives your body time to acclimatise, which is the biggest factor in reaching the summit.',
      },
      {
        q: 'Do I need climbing experience?',
        a: 'No technical experience is needed, but you should be fit enough to walk six to eight hours a day for a week, and the altitude affects everyone.',
      },
    ],
    filters: { destination: 'kilimanjaro', intent: 'mountain' },
    guides: ['kilimanjaro-routes-compared', 'kilimanjaro-climb-cost', 'best-time-to-climb-kilimanjaro', 'kilimanjaro-training-for-working-people'],
    related: ['tanzania-safari-tours', 'safari-from-arusha', 'zanzibar-tours'],
  },
  {
    slug: 'zanzibar-tours',
    group: 'activities',
    heading: 'Zanzibar tours and excursions',
    shortLabel: 'Zanzibar tours',
    metaTitle: 'Zanzibar Tours & Excursions — {count} Local Operators',
    metaTitleFallback: 'Zanzibar Tours & Excursions — Local Operators',
    metaDescription:
      'Zanzibar tours from local operators: Stone Town walks, spice farms, Prison Island, Mnemba snorkelling, dhow cruises and safari flights. Compare and enquire free.',
    keywords: [
      'zanzibar tours',
      'zanzibar excursions',
      'things to do in zanzibar',
      'stone town tour',
      'zanzibar spice tour',
      'prison island tour',
      'mnemba snorkeling',
      'zanzibar tour operators',
    ],
    intro: [
      'Zanzibar is more than beaches. Stone Town is a UNESCO-listed maze of carved doors and markets; the spice farms explain why the island was once the centre of the clove trade; and the reefs around Mnemba Atoll are the best snorkelling on the coast.',
      'Local operators run all of these as half-day or day trips from any hotel on the island, and many also arrange short flying safaris to the mainland.',
    ],
    sections: [
      {
        heading: 'The most popular Zanzibar trips',
        bullets: [
          'Stone Town walking tour, including the former slave market.',
          'Spice farm tour with fruit tasting and lunch.',
          'Prison Island and its giant tortoises.',
          'Mnemba Atoll snorkelling, with dolphins on many mornings.',
          'Sunset dhow cruise from Stone Town or Nungwi.',
          'Jozani Forest for red colobus monkeys.',
        ],
      },
      {
        heading: 'Booking safely',
        paragraphs: [
          'Book boats through your hotel or a registered company rather than beach touts. Check that boats carry life jackets and that turtle and dolphin trips follow a no-touching rule.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the best tour in Zanzibar?',
        a: 'For most first-time visitors, a Stone Town walking tour combined with a spice farm, plus one snorkelling trip to Mnemba.',
      },
      {
        q: 'Can I do a safari from Zanzibar?',
        a: 'Yes. Day and overnight flying safaris go to Nyerere and Mikumi, and longer trips to the Serengeti.',
      },
    ],
    filters: { destination: 'zanzibar', category: 'activities' },
    guides: ['zanzibar-which-beach-to-stay', 'best-time-to-visit-zanzibar', 'stone-town-in-a-day'],
    related: ['safari-from-zanzibar', 'tanzania-safari-and-zanzibar', 'zanzibar-diving-snorkelling'],
  },
];
