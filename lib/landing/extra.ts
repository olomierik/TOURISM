import type { LandingFaq, LandingSection } from './types.ts';

/**
 * Further sections and questions, merged onto the pages by slug. Kept apart
 * so the main files stay readable; every page must clear 200 words of its own
 * (tests/landing-pages.test.mjs) before the live listings are counted.
 */
export const LANDING_EXTRA: Record<string, { sections?: LandingSection[]; faqs?: LandingFaq[] }> = {
  'tarangire-safari-tours': {
    faqs: [
      {
        q: 'Where should I stay for Tarangire?',
        a: 'Lodges and tented camps inside the park give the best early-morning game viewing. Cheaper lodges in Mto wa Mbu and Karatu are about an hour away and convenient for Manyara and Ngorongoro.',
      },
    ],
  },
  'lake-manyara-safari-tours': {
    sections: [
      {
        heading: 'Fitting Manyara into a trip',
        paragraphs: [
          'Manyara sits on the road between Arusha and the Ngorongoro Crater, so it rarely costs a detour. A morning game drive here followed by an afternoon transfer to Karatu sets you up for an early crater descent the next day.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Are the tree-climbing lions always there?',
        a: 'No. The lions are present, but seeing one lying in a tree depends on luck and season. Choose Manyara for the forest, birds and scenery rather than for that sighting alone.',
      },
    ],
  },
  'nyerere-selous-safari': {
    faqs: [
      {
        q: 'How many days do I need in Nyerere?',
        a: 'Three nights lets you combine game drives, a boat safari and a walk. Two nights works if you are flying in from the beach.',
      },
    ],
  },
  'ruaha-safari-tours': {
    sections: [
      {
        heading: 'Combining Ruaha',
        paragraphs: [
          'Light aircraft link Ruaha with Nyerere, Zanzibar, Arusha and the remote western parks of Katavi and Mahale. A popular southern circuit spends three nights in Ruaha, three in Nyerere and finishes on the coast.',
        ],
      },
    ],
    faqs: [
      {
        q: 'When is Ruaha closed?',
        a: 'The park stays open, but many camps close from about March to May during the heavy rains, when tracks become impassable.',
      },
    ],
  },
  'zanzibar-tours': {
    faqs: [
      {
        q: 'How much do Zanzibar tours cost?',
        a: 'Half-day trips such as a spice tour or Prison Island are usually inexpensive; snorkelling trips to Mnemba cost more because of the boat and marine fees. Ask whether lunch, entry fees and hotel transfers are included.',
      },
    ],
  },
  'luxury-tanzania-safari': {
    faqs: [
      {
        q: 'Which parks are best for a luxury safari?',
        a: 'The northern Serengeti in migration season, private concessions bordering the Serengeti, the Ngorongoro rim, and the southern parks of Ruaha and Nyerere, where camps are small and remote.',
      },
    ],
  },
  'private-tanzania-safari': {
    sections: [
      {
        heading: 'Tailoring the route',
        paragraphs: [
          'Because nobody else shares the vehicle, a private safari can change from day to day. If the herds have moved, your guide can follow them; if a child is tired, you can return to camp early. Ask operators how they handle changes and whether lodges can be swapped once booked.',
        ],
      },
    ],
  },
  'group-joining-safari-tanzania': {
    sections: [
      {
        heading: 'Is a shared safari for you?',
        paragraphs: [
          'Shared safaris suit sociable travellers and anyone on a budget. The compromises are the pace and the route, which the group decides together. Serious photographers and birders usually prefer a private vehicle, even on a short trip.',
        ],
      },
    ],
  },
  'tanzania-family-safari': {
    faqs: [
      {
        q: 'Is Tanzania safe for a family safari?',
        a: 'Yes. On safari you are with your guide almost all the time, and camps escort guests after dark. Take normal precautions in towns, use child-suitable malaria prevention and carry travel insurance.',
      },
    ],
  },
  'tanzania-honeymoon-safari': {
    sections: [
      {
        heading: 'Small touches that matter',
        bullets: [
          'A tented camp rather than a large lodge.',
          'A sundowner on a hill or a private bush dinner.',
          'A hot air balloon flight over the Serengeti at sunrise.',
          'A night in Stone Town for a rooftop dinner before the beach.',
        ],
      },
    ],
    faqs: [
      {
        q: 'When is the best time for a Tanzania honeymoon?',
        a: 'June to October for dry weather on safari and on the coast, or January and February for calving season and hot beach days.',
      },
    ],
  },
  '3-day-tanzania-safari': {
    sections: [
      {
        heading: 'Making three days count',
        paragraphs: [
          'With only three days, a private vehicle and an early start each morning matter more than the choice of lodge. Sleeping inside or close to the parks saves an hour of driving every day.',
        ],
      },
    ],
  },
  '5-day-tanzania-safari': {
    sections: [
      {
        heading: 'Matching the route to the season',
        paragraphs: [
          'From January to March, ask to stay in the southern Serengeti near Ndutu for the calving. From July to October, the central Serengeti is best on a five-day trip; the northern crossings are too far without flying.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I add Zanzibar to a 5-day safari?',
        a: 'Yes. Fly from the Serengeti or Arusha to Zanzibar at the end, rather than returning by road.',
      },
    ],
  },
  '7-day-tanzania-safari': {
    sections: [
      {
        heading: 'Variations',
        paragraphs: [
          'Swap Tarangire for Lake Manyara in the green season, add a night at Lake Natron for flamingos and the Ol Doinyo Lengai volcano, or spend the extra days in the northern Serengeti between July and October.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does a 7-day Tanzania safari cost?',
        a: 'Roughly US$1,500 to US$2,100 per person camping, US$2,500 to US$4,900 in mid-range lodges, and more in luxury camps.',
      },
    ],
  },
  '10-day-tanzania-safari': {
    sections: [
      {
        heading: 'Adding the south',
        paragraphs: [
          'A ten-day trip can also combine both circuits: four nights in the Serengeti, then a flight to Ruaha or Nyerere for three nights each. It costs more in flights but shows two very different sides of Tanzania.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does a 10-day safari cost?',
        a: 'It depends heavily on lodges and flights. As a guide, mid-range trips cost roughly US$3,500 to US$7,000 per person, excluding international flights.',
      },
    ],
  },
  'safari-from-arusha': {
    faqs: [
      {
        q: 'Can I book a safari when I arrive in Arusha?',
        a: 'Yes, especially outside July and August, but booking ahead lets you compare quotes calmly and avoid street touts. Always visit the office and get a written itinerary before paying.',
      },
    ],
  },
  'safari-from-zanzibar': {
    sections: [
      {
        heading: 'Flights and luggage',
        paragraphs: [
          'Small aircraft usually allow about 15 kilograms per person in soft bags. Most hotels on Zanzibar will store the rest of your luggage while you are on safari. Flights leave from Zanzibar airport, 15 minutes from Stone Town.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How much does a safari from Zanzibar cost?',
        a: 'The return flight is a large part of the price, so an overnight trip is much better value than a day trip. Ask operators to quote flights, park fees and lodge together.',
      },
    ],
  },
  'safari-from-dar-es-salaam': {
    sections: [
      {
        heading: 'Road, rail or air',
        paragraphs: [
          'The road to Mikumi is paved and busy with trucks. The standard-gauge railway now links Dar es Salaam with Morogoro, close to Mikumi. For Nyerere and Ruaha, scheduled light aircraft save a long drive on rough roads.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Is Mikumi worth visiting?',
        a: 'Yes for a short trip. It has elephants, lion, giraffe and buffalo on open plains, and is the easiest safari from the city. For a longer trip, Nyerere and Ruaha are wilder.',
      },
    ],
  },
  'tanzania-safari-and-zanzibar': {
    sections: [
      {
        heading: 'Choosing a beach after safari',
        paragraphs: [
          'The north of Zanzibar (Nungwi, Kendwa) has swimming at any tide. The east coast is quieter but the sea retreats far at low tide. Stone Town makes a good first or last night. For more privacy, Pemba and Mafia are short flights away.',
        ],
      },
    ],
    faqs: [
      {
        q: 'What is the best time for safari and Zanzibar?',
        a: 'June to October suits both. January and February are also excellent: calving in the Serengeti and hot, dry days on the coast.',
      },
    ],
  },
  'hot-air-balloon-safari-serengeti': {
    faqs: [
      {
        q: 'Where do Serengeti balloon flights take off?',
        a: 'From launch sites in the central Serengeti, the south and the west, chosen to follow the season. Your camp should be within reach of the launch site, so mention the balloon when you book.',
      },
    ],
  },
  'walking-safari-tanzania': {
    sections: [
      {
        heading: 'Where to walk',
        bullets: [
          'Ruaha: the finest walking in the country, including fly-camping.',
          'Nyerere: walks combined with boat safaris.',
          'Arusha National Park: gentle walks with no lions.',
          'Ngorongoro highlands: Empakaai and Olmoti craters.',
        ],
      },
    ],
    faqs: [
      {
        q: 'When is the best time for a walking safari?',
        a: 'June to October, when the grass is short and the ground is dry. Many operators stop walking in the wet season.',
      },
    ],
  },
  'zanzibar-diving-snorkelling': {
    sections: [
      {
        heading: 'Choosing a dive centre',
        bullets: [
          'PADI or SSI accreditation and well-maintained equipment.',
          'Small groups with an instructor in the water.',
          'A briefing on marine park rules: no touching coral or wildlife.',
          'Clear prices including marine park fees.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can beginners dive in Zanzibar?',
        a: 'Yes. Many centres run try-dives and open-water courses in sheltered water, especially around Mnemba and Kendwa.',
      },
      {
        q: 'When can I swim with whale sharks?',
        a: 'Off Mafia Island from roughly October to March, with the best chances from November to February.',
      },
    ],
  },
  'day-trips-from-arusha': {
    sections: [
      {
        heading: 'Planning a day trip',
        paragraphs: [
          'Start early: park gates open at about 6 a.m., and the first hours give the best game viewing. Ask whether the price includes park fees, lunch and drinking water, and how many people will share the vehicle.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I see the Big Five on a day trip from Arusha?',
        a: 'The Ngorongoro Crater is the best chance, with lion, elephant, buffalo and black rhino on the crater floor. Leopard are rarely seen there.',
      },
      {
        q: 'How much does a day safari from Arusha cost?',
        a: 'It depends on the park and group size, because park fees are per person and the vehicle cost is shared. Ngorongoro costs most because of the crater fee per vehicle.',
      },
    ],
  },
  'kenya-safari-tours': {
    sections: [
      {
        heading: 'Combining Kenya and Tanzania',
        paragraphs: [
          'A classic two-country trip spends three nights in the Masai Mara, crosses to Tanzania at Isebania or flies to Kilimanjaro, then continues to the Serengeti and Ngorongoro. Remember that the East Africa Tourist Visa does not include Tanzania.',
        ],
      },
    ],
    faqs: [
      {
        q: 'When is the best time for a Kenya safari?',
        a: 'July to October for the migration in the Masai Mara, and January to February for dry weather across the country.',
      },
    ],
  },
  'masai-mara-safari': {
    sections: [
      {
        heading: 'Reserve or conservancy?',
        paragraphs: [
          'The national reserve has the famous river crossing points and is open to all vehicles. The private conservancies around it cap the number of vehicles, allow off-road driving, night drives and walks, and pay rent directly to Maasai landowners.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How many days in the Masai Mara?',
        a: 'Three nights is ideal. Most trips drive from Nairobi in five to six hours or fly in under an hour.',
      },
    ],
  },
  'gorilla-trekking-uganda': {
    sections: [
      {
        heading: 'Uganda beyond gorillas',
        paragraphs: [
          'Uganda packs a lot into one country: chimpanzees in Kibale Forest, tree-climbing lions in the Ishasha sector of Queen Elizabeth National Park, boat trips on the Kazinga Channel, and the Nile thundering through Murchison Falls.',
        ],
      },
    ],
    faqs: [
      {
        q: 'When is the best time for gorilla trekking in Uganda?',
        a: 'June to August and December to February are the drier months, with easier trails. Trekking runs all year.',
      },
    ],
  },
  'gorilla-trekking-rwanda': {
    sections: [
      {
        heading: 'What a trek is like',
        paragraphs: [
          'Trekkers are briefed at park headquarters at dawn and assigned to a gorilla family. Hikes range from under an hour to several hours through bamboo and forest on the slopes of the Virunga volcanoes, followed by one hour with the gorillas.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Why is gorilla trekking in Rwanda expensive?',
        a: 'Rwanda deliberately keeps permit prices high to limit visitor numbers and fund conservation and local communities. It is the shortest and most comfortable way to see gorillas.',
      },
    ],
  },
  'east-africa-safari': {
    sections: [
      {
        heading: 'Getting between countries',
        paragraphs: [
          'Nairobi, Kilimanjaro, Kigali and Entebbe are linked by regular flights of one to two hours. The Namanga border between Kenya and Tanzania is a common road crossing on the way between Amboseli or Nairobi and Arusha.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How long should an East Africa safari be?',
        a: 'Ten to fourteen days for two countries. Trying to see all four in under two weeks spends too much of the trip in airports.',
      },
    ],
  },
};

/** Second round of questions, for the pages that were still short. */
export const LANDING_EXTRA_FAQS: Record<string, LandingFaq[]> = {
  'private-tanzania-safari': [
    { q: 'Do I need a private safari for photography?', a: 'It helps a great deal. You choose where the vehicle stops, how long you stay, and you have space to move between windows and the roof without disturbing anyone.' },
  ],
  'group-joining-safari-tanzania': [
    { q: 'How do I find a shared safari for my dates?', a: 'Ask several Arusha operators which departures already have bookings, and be flexible by a day or two. Send a request here and operators running shared trips can reply with dates.' },
  ],
  'tanzania-family-safari': [
    { q: 'How long should a family safari be?', a: 'Four to six days is enough for most children, ideally followed by a few days on the beach on Zanzibar.' },
  ],
  'tanzania-honeymoon-safari': [
    { q: 'Do lodges really offer honeymoon extras?', a: 'Many do, from a room upgrade to a private dinner. They usually ask for a marriage certificate dated within the past six to twelve months.' },
  ],
  '3-day-tanzania-safari': [
    { q: 'Where do you sleep on a 3-day safari?', a: 'Usually in or near Tarangire on the first night and in Karatu or Mto wa Mbu on the second, close to the Ngorongoro gate for an early start.' },
    { q: 'Is a 3-day safari worth it?', a: 'Yes, if you have limited time. You will see a wide range of animals, though not the Serengeti or the migration.' },
  ],
  '5-day-tanzania-safari': [
    { q: 'Camping or lodges on a 5-day safari?', a: 'Both work. Camping keeps the price down; lodges are more comfortable after long drives. Many travellers mix the two.' },
  ],
  '7-day-tanzania-safari': [
    { q: 'Can a 7-day safari include the Great Migration?', a: 'Yes, if you match the Serengeti nights to the season: the south from January to March, the north from July to October.' },
  ],
  '10-day-tanzania-safari': [
    { q: 'Is it better to fly between parks on a 10-day trip?', a: 'Flying one or two legs saves whole days on long trips, especially to the northern Serengeti or the southern parks. Driving keeps costs down and shows more of the country.' },
    { q: 'When should I book a 10-day safari?', a: 'Six to nine months ahead for July to October, when popular camps fill early.' },
  ],
  'safari-from-arusha': [
    { q: 'How many days do I need for a safari from Arusha?', a: 'Three days covers Tarangire, Manyara and Ngorongoro. Five or more days lets you include the Serengeti.' },
  ],
  'safari-from-zanzibar': [
    { q: 'Which park is closest to Zanzibar?', a: 'Nyerere National Park and Mikumi are the closest by air, both under an hour on a light aircraft.' },
  ],
  'safari-from-dar-es-salaam': [
    { q: 'Can I do a weekend safari from Dar es Salaam?', a: 'Yes. A two or three day trip to Mikumi by road is the most common weekend safari from the city.' },
    { q: 'Do Dar es Salaam operators also run northern safaris?', a: 'Some do, usually with a flight to Arusha or Kilimanjaro. Ask whether they run the trip themselves or pass it to a partner.' },
  ],
  'tanzania-safari-and-zanzibar': [
    { q: 'How much does a safari and Zanzibar trip cost?', a: 'It depends on lodges and flights. A ten-day mid-range trip typically costs from about US$3,500 per person excluding international flights.' },
  ],
  'hot-air-balloon-safari-serengeti': [
    { q: 'Can children go on a balloon safari?', a: 'Most operators set a minimum age of about seven, and children must be tall enough to see over the basket.' },
  ],
  'walking-safari-tanzania': [
    { q: 'How fit do I need to be?', a: 'Most walks are two to four hours at a gentle pace on fairly flat ground. Multi-day walking safaris need more stamina.' },
    { q: 'Can I walk in the Serengeti?', a: 'Only in designated zones and with camps licensed to offer walks. Ask your operator which camps can arrange it.' },
  ],
  'zanzibar-diving-snorkelling': [
    { q: 'Where is the best diving in Tanzania?', a: 'Pemba for dramatic walls and big fish, Mafia Island Marine Park for healthy coral and whale sharks, and Mnemba Atoll for easy reef dives close to Zanzibar.' },
    { q: 'Is Mnemba good for snorkelling?', a: 'Yes. The shallow reefs around Mnemba Atoll have clear water, turtles and plenty of fish, and dolphins are often seen on the way.' },
  ],
  'day-trips-from-arusha': [
    { q: 'Are there walking day trips from Arusha?', a: 'Yes. Arusha National Park offers guided walks with an armed ranger, and the villages on the slopes of Mount Meru have waterfall and coffee walks.' },
  ],
  'kenya-safari-tours': [
    { q: 'How much does a Kenya safari cost?', a: 'Broadly similar to Tanzania: from about US$200 per person per day on a budget trip to well over US$1,000 in luxury conservancy camps.' },
  ],
  'masai-mara-safari': [
    { q: 'Can I combine the Masai Mara and the Serengeti?', a: 'Yes, though there is no public border crossing between the two parks. Most trips fly, or drive via the Isebania or Namanga border.' },
    { q: 'Is the Masai Mara good outside migration season?', a: 'Yes. Resident lion, leopard and cheetah populations make the Mara rewarding all year, and the green season is quieter and cheaper.' },
  ],
  'gorilla-trekking-uganda': [
    { q: 'How fit do I need to be for gorilla trekking?', a: 'Reasonably fit. Treks can take from one to several hours on steep, muddy slopes at altitude. Porters can be hired to carry your bag and help on difficult sections.' },
  ],
  'gorilla-trekking-rwanda': [
    { q: 'How do I get a gorilla permit in Rwanda?', a: 'Permits are sold by the Rwanda Development Board, usually booked through a tour operator. They sell out months ahead for the dry seasons.' },
    { q: 'Can I combine Rwanda with a Tanzania safari?', a: 'Yes. Kigali and Kilimanjaro are linked by short flights, so gorillas and the Serengeti fit into one trip of ten days or more.' },
  ],
  'east-africa-safari': [
    { q: 'What is the best time for an East Africa safari?', a: 'June to October is dry across the region and good for the migration in both Tanzania and Kenya, and for gorilla trekking in Uganda and Rwanda.' },
    { q: 'Do I need separate visas for each country?', a: 'The East Africa Tourist Visa covers Kenya, Uganda and Rwanda together. Tanzania requires its own visa.' },
  ],
};
