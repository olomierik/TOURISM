/**
 * Things to do, seeded per destination.
 *
 * English only, per the decision to publish in English first and translate what
 * earns traffic. The translation table takes a slug per locale, so a German
 * version is a row rather than a migration when the time comes.
 *
 * The `tip` on each is the point. A name and a category is a label on a map;
 * what makes the row worth publishing is the thing a visitor would not work out
 * for themselves — that the crater descent is a per-vehicle fee, that Kilimanjaro
 * summit night starts at midnight, that Nyungwe's canopy walk closes in high wind.
 *
 * Deliberately not exhaustive. A short list of things that are genuinely worth
 * a traveller's morning beats forty entries padded to look complete, and the
 * product brief is explicit that a page has to earn its place.
 */

export const ATTRACTIONS = [
  // ----------------------------------------------------------------- Serengeti
  { key: 'serengeti-mara-crossings', destination: 'serengeti', kind: 'wildlife',
    lat: -1.9500, lng: 35.1000, isFree: null, minutes: 300, sort: 10,
    name: 'Mara River crossings',
    summary: 'The wildebeest crossing points in the far north, active roughly July to October.',
    tip: 'Crossings happen on the herds’ schedule, not yours — plan two or three full days in the north rather than one, and stay north of Kogatende to avoid a four-hour drive at dawn.' },
  { key: 'serengeti-seronera-valley', destination: 'serengeti', kind: 'wildlife',
    lat: -2.4333, lng: 34.8333, isFree: null, minutes: 240, sort: 20,
    name: 'Seronera Valley',
    summary: 'The central river valley, with resident lion, leopard and cheetah year-round.',
    tip: 'The one part of the Serengeti that rewards a visit in any month, because the river holds game when the plains empty. It is also the busiest — go at first light.' },
  { key: 'serengeti-hot-air-balloon', destination: 'serengeti', kind: 'active',
    lat: -2.3333, lng: 34.8333, isFree: false, minutes: 240, sort: 30,
    name: 'Balloon safari over the plains',
    summary: 'A dawn flight, landing to a breakfast on the grass.',
    tip: 'Around US$600 per person and booked out weeks ahead in high season. Take-off is before sunrise, so it only works if you are already sleeping in the park.' },

  // ---------------------------------------------------------------- Ngorongoro
  { key: 'ngorongoro-crater-floor', destination: 'ngorongoro', kind: 'wildlife',
    lat: -3.1717, lng: 35.5875, isFree: false, minutes: 360, sort: 10,
    name: 'The crater floor',
    summary: 'Six hundred metres down, roughly 25,000 large animals inside twenty kilometres of caldera wall.',
    tip: 'The descent is charged per vehicle, not per person, and the permit is for six hours — so a full car costs each of you less, and the clock starts at the gate rather than at the bottom.' },
  { key: 'ngorongoro-olduvai-gorge', destination: 'ngorongoro', kind: 'historic',
    lat: -2.9930, lng: 35.3520, isFree: false, minutes: 90, sort: 20,
    name: 'Olduvai Gorge',
    summary: 'Where the Leakeys found the fossils that moved human origins to East Africa.',
    tip: 'It sits on the road between Ngorongoro and the Serengeti, so it costs an hour rather than a day if you time it as a stop rather than a detour.' },
  { key: 'ngorongoro-empakaai-crater', destination: 'ngorongoro', kind: 'landscape',
    lat: -2.9333, lng: 35.8333, isFree: false, minutes: 300, sort: 30,
    name: 'Empakaai Crater walk',
    summary: 'A steep descent to a soda lake inside a smaller, greener caldera.',
    tip: 'One of the few places in the conservation area you may walk, with a ranger. On a clear morning Ol Doinyo Lengai and Kilimanjaro are both visible from the rim.' },

  // ----------------------------------------------------------------- Kilimanjaro
  { key: 'kilimanjaro-uhuru-peak', destination: 'kilimanjaro', kind: 'active',
    lat: -3.0674, lng: 37.3556, isFree: false, minutes: 10080, sort: 10,
    name: 'The summit climb',
    summary: 'Africa’s highest point at 5,895m, reachable on foot without ropes.',
    tip: 'Summit night starts around midnight so you reach the crater rim at sunrise. Route length matters far more than fitness: eight days succeeds around 85% of the time, five days under half.' },
  { key: 'kilimanjaro-shira-plateau', destination: 'kilimanjaro', kind: 'landscape',
    lat: -3.0500, lng: 37.2167, isFree: false, minutes: 1440, sort: 20,
    name: 'Shira Plateau',
    summary: 'A high moorland on the western approach, above the forest and below the scree.',
    tip: 'The Lemosho and Shira routes cross it, which is part of why they acclimatise better — you spend a day near 3,800m instead of climbing straight through.' },
  { key: 'kilimanjaro-materuni-falls', destination: 'kilimanjaro', kind: 'water',
    lat: -3.2333, lng: 37.3167, isFree: false, minutes: 300, sort: 30,
    name: 'Materuni Falls and coffee walk',
    summary: 'A waterfall on the lower slopes, usually combined with a Chagga coffee farm.',
    tip: 'The standard rest-day trip from Moshi, and the best thing to do on the day before a climb when you should not be exerting yourself at altitude.' },

  // -------------------------------------------------------------------- Arusha
  { key: 'arusha-maasai-market', destination: 'arusha', kind: 'cultural',
    lat: -3.3689, lng: 36.6830, isFree: true, minutes: 90, sort: 10,
    name: 'Maasai Market',
    summary: 'The craft market in the centre of town.',
    tip: 'Prices open at three to four times what things sell for. That is expected, not an insult — haggling is the transaction, and walking away is part of it.' },
  { key: 'arusha-national-park-walk', destination: 'arusha', kind: 'wildlife',
    lat: -3.2500, lng: 36.8333, isFree: false, minutes: 300, sort: 20,
    name: 'Walking safari in Arusha National Park',
    summary: 'Giraffe, colobus and buffalo on foot, with Mount Meru above.',
    tip: 'No lion or elephant, which is exactly why walking is allowed. The best first day of a trip: it is forty minutes from town and it acclimatises you to the altitude.' },
  { key: 'arusha-coffee-estate', destination: 'arusha', kind: 'cultural',
    lat: -3.4000, lng: 36.6167, isFree: false, minutes: 180, sort: 30,
    name: 'Coffee estate tour',
    summary: 'Picking, pulping, drying and roasting on the slopes south of town.',
    tip: 'Harvest runs July to December; outside it you see the process explained rather than happening.' },

  // ------------------------------------------------------------------ Zanzibar
  { key: 'zanzibar-stone-town', destination: 'zanzibar', kind: 'historic',
    lat: -6.1622, lng: 39.1922, isFree: true, minutes: 240, sort: 10,
    name: 'Stone Town',
    summary: 'The old trading quarter, a UNESCO site of coral-rag houses and carved doors.',
    tip: 'Getting lost is the intended experience — the lanes are too narrow for cars and every route eventually reaches the seafront. Go late afternoon, when the heat drops and the food market sets up at Forodhani.' },
  { key: 'zanzibar-jozani-forest', destination: 'zanzibar', kind: 'wildlife',
    lat: -6.2667, lng: 39.4167, isFree: false, minutes: 120, sort: 20,
    name: 'Jozani Forest',
    summary: 'The last stand of the Zanzibar red colobus, found nowhere else on earth.',
    tip: 'The troops are habituated and close to the path, so this is the rare wildlife stop that works with small children and needs no luck.' },
  { key: 'zanzibar-spice-farm', destination: 'zanzibar', kind: 'cultural',
    lat: -6.1000, lng: 39.2833, isFree: false, minutes: 180, sort: 30,
    name: 'Spice farm tour',
    summary: 'Clove, nutmeg, cinnamon and vanilla, in the ground rather than in a jar.',
    tip: 'The islands’ whole colonial history runs through these crops, and a good guide tells that rather than just naming plants. Ask before booking which farm you are actually visiting.' },
  { key: 'zanzibar-prison-island', destination: 'zanzibar', kind: 'historic',
    lat: -6.1167, lng: 39.1667, isFree: false, minutes: 180, sort: 40,
    name: 'Prison Island',
    summary: 'A short boat from Stone Town, with giant Aldabra tortoises and a quarantine ruin.',
    tip: 'The prison was never used as one. The oldest tortoises are on record as over a century old, and the snorkelling off the sandbank is better than the island itself.' },

  // ---------------------------------------------------------------- Maasai Mara
  { key: 'mara-river-crossing-points', destination: 'maasai-mara', kind: 'wildlife',
    lat: -1.5000, lng: 35.0500, isFree: null, minutes: 300, sort: 10,
    name: 'Mara River crossing points',
    summary: 'Where the herds cross between July and October.',
    tip: 'Vehicles gather hours in advance and the herds may still not cross. Treat a crossing as a possibility rather than an itinerary item, and the days you do see one are extraordinary.' },
  { key: 'mara-balloon', destination: 'maasai-mara', kind: 'active',
    lat: -1.4931, lng: 35.1439, isFree: false, minutes: 240, sort: 20,
    name: 'Balloon over the Mara',
    summary: 'Dawn flight across the reserve, landing for breakfast.',
    tip: 'Cheaper than the Serengeti equivalent and over denser game. Book from a camp inside the reserve — the launch is at first light and conservancy gates open later.' },
  { key: 'mara-maasai-village', destination: 'maasai-mara', kind: 'cultural',
    lat: -1.4000, lng: 35.2000, isFree: false, minutes: 90, sort: 30,
    name: 'Maasai village visit',
    summary: 'A manyatta visit arranged through a camp or conservancy.',
    tip: 'Quality varies enormously. Ones arranged through a conservancy usually return money to the community that owns the land; ones sold at the gate often do not. Ask which before you agree.' },

  // ------------------------------------------------------------------ Amboseli
  { key: 'amboseli-observation-hill', destination: 'amboseli-national-park', kind: 'landscape',
    lat: -2.6800, lng: 37.2500, isFree: null, minutes: 60, sort: 10,
    name: 'Observation Hill',
    summary: 'The one place in the park you may leave the vehicle, overlooking the swamps.',
    tip: 'Late afternoon, when Kilimanjaro most often clears. The mountain is hidden by cloud most of the middle of the day, all year.' },
  { key: 'amboseli-elephant-swamps', destination: 'amboseli-national-park', kind: 'wildlife',
    lat: -2.6527, lng: 37.2606, isFree: null, minutes: 180, sort: 20,
    name: 'The swamp elephant herds',
    summary: 'Enkongo Narok and Olokenya, where the big families feed.',
    tip: 'Amboseli’s elephants are among the most studied on earth and unusually relaxed around vehicles, which is why the photographs from here look the way they do.' },

  // -------------------------------------------------------------------- Bwindi
  { key: 'bwindi-gorilla-trek', destination: 'bwindi-impenetrable-national-park', kind: 'wildlife',
    lat: -1.0500, lng: 29.6667, isFree: false, minutes: 480, sort: 10,
    name: 'Gorilla trekking',
    summary: 'One habituated family, one hour with them, permits limited daily.',
    tip: 'The permit is US$800 and the walk can be anything from one hour to seven — the gorillas move overnight. Hire a porter: it costs about US$20, makes the climb far easier, and is the main local income from the park.' },
  { key: 'bwindi-batwa-experience', destination: 'bwindi-impenetrable-national-park', kind: 'cultural',
    lat: -1.0800, lng: 29.6300, isFree: false, minutes: 180, sort: 20,
    name: 'Batwa cultural experience',
    summary: 'Forest skills and history from the people displaced when the park was gazetted.',
    tip: 'Worth knowing the context: the Batwa lived in this forest and were moved out in 1991 when it became a national park, with no land granted in exchange.' },

  // ----------------------------------------------------------------- Volcanoes
  { key: 'volcanoes-gorilla-trek', destination: 'volcanoes-national-park', kind: 'wildlife',
    lat: -1.4833, lng: 29.5333, isFree: false, minutes: 420, sort: 10,
    name: 'Gorilla trekking',
    summary: 'Ten habituated families on the Rwandan side of the Virungas.',
    tip: 'US$1,500 a permit, roughly twice Uganda’s, for shorter walks at gentler gradients and a two-hour drive from Kigali rather than a day. Which is better value depends entirely on how much walking you want to do.' },
  { key: 'volcanoes-golden-monkeys', destination: 'volcanoes-national-park', kind: 'wildlife',
    lat: -1.4500, lng: 29.5000, isFree: false, minutes: 240, sort: 20,
    name: 'Golden monkey tracking',
    summary: 'Bamboo-forest monkeys found only in the Virungas and Nyungwe.',
    tip: 'A fifth of the gorilla permit price and an easier walk. Often done on the day after a gorilla trek, when legs are still recovering.' },
  { key: 'volcanoes-dian-fossey-tomb', destination: 'volcanoes-national-park', kind: 'historic',
    lat: -1.4667, lng: 29.4833, isFree: false, minutes: 300, sort: 30,
    name: 'Dian Fossey tomb hike',
    summary: 'The walk to Karisoke, where she worked and is buried beside Digit.',
    tip: 'Three to four hours of steep, muddy climbing and no gorillas guaranteed. Go for the history, not the wildlife.' },

  // ------------------------------------------------------------------- Kigali
  { key: 'kigali-genocide-memorial', destination: 'kigali', kind: 'museum',
    lat: -1.9306, lng: 30.0589, isFree: true, minutes: 150, sort: 10,
    name: 'Kigali Genocide Memorial',
    summary: 'The memorial and museum at Gisozi, where over 250,000 people are buried.',
    tip: 'Entry is free and the audio guide is worth the fee. Allow more time than you think and do not schedule anything demanding afterwards.' },
  { key: 'kigali-nyamirambo-walk', destination: 'kigali', kind: 'cultural',
    lat: -1.9700, lng: 30.0450, isFree: false, minutes: 180, sort: 20,
    name: 'Nyamirambo walking tour',
    summary: 'The city’s oldest and liveliest quarter, walked with a local guide.',
    tip: 'Run by a women’s cooperative, and the closest thing Kigali has to an unvarnished street-level tour.' },

  // ------------------------------------------------------------------ Nyungwe
  { key: 'nyungwe-canopy-walk', destination: 'nyungwe-forest-national-park', kind: 'active',
    lat: -2.4833, lng: 29.2000, isFree: false, minutes: 150, sort: 10,
    name: 'Canopy walkway',
    summary: 'A 160-metre suspension bridge, 70 metres above the forest floor.',
    tip: 'It closes in high wind, which is a real risk in the wet months — go in the morning, when it is calmer and the mist has usually lifted.' },
  { key: 'nyungwe-chimp-tracking', destination: 'nyungwe-forest-national-park', kind: 'wildlife',
    lat: -2.4500, lng: 29.1500, isFree: false, minutes: 300, sort: 20,
    name: 'Chimpanzee tracking',
    summary: 'Two habituated communities in one of Africa’s oldest montane forests.',
    tip: 'A 5am start, because the chimps move at dawn and the trackers need daylight to find where they nested.' },

  // ------------------------------------------------------- Queen Elizabeth NP
  { key: 'qenp-kazinga-channel', destination: 'queen-elizabeth-national-park', kind: 'water',
    lat: -0.1833, lng: 29.9000, isFree: false, minutes: 120, sort: 10,
    name: 'Kazinga Channel boat trip',
    summary: 'The channel between Lakes Edward and George, lined with hippo, buffalo and birds.',
    tip: 'Two hours, in the afternoon when animals come down to drink. Consistently the best value single activity in the park.' },
  { key: 'qenp-ishasha-lions', destination: 'queen-elizabeth-national-park', kind: 'wildlife',
    lat: -0.6167, lng: 29.6833, isFree: null, minutes: 240, sort: 20,
    name: 'Ishasha tree-climbing lions',
    summary: 'The southern sector, where lions rest in fig trees.',
    tip: 'Not guaranteed, and a two-hour drive from the main sector. Worth building into a route toward Bwindi rather than making a separate trip.' },

  // ----------------------------------------------------------------- Murchison
  { key: 'murchison-top-of-falls', destination: 'murchison-falls-national-park', kind: 'water',
    lat: 2.2783, lng: 31.6817, isFree: null, minutes: 120, sort: 10,
    name: 'Top of the Falls',
    summary: 'Where the Nile forces through a seven-metre gap and drops 43 metres.',
    tip: 'The boat goes to the base; the walk goes to the top. Do both in one afternoon — boat up, then climb out and be driven back.' },

  // ---------------------------------------------------------------------- Jinja
  { key: 'jinja-nile-rafting', destination: 'jinja-and-the-source-of-the-nile', kind: 'active',
    lat: 0.4244, lng: 33.2041, isFree: false, minutes: 480, sort: 10,
    name: 'White water rafting',
    summary: 'Grade 5 rapids on the White Nile below the source.',
    tip: 'Runs year round, and you do not need experience — the commercial trips are guided and swimming the rapids is part of the day rather than a failure.' },

  // -------------------------------------------------------------- Mafia Island
  { key: 'mafia-whale-sharks', destination: 'mafia-island', kind: 'water',
    lat: -7.9167, lng: 39.6667, isFree: false, minutes: 240, sort: 10,
    name: 'Swimming with whale sharks',
    summary: 'Kilindoni bay, roughly October to March.',
    tip: 'These are feeding animals in open water, not a penned attraction. Boats find them by spotting, so an early start and a calm day matter more than the operator you pick.' },

  // ------------------------------------------------------------------ Tarangire
  { key: 'tarangire-baobab-river', destination: 'tarangire-national-park', kind: 'wildlife',
    lat: -3.8333, lng: 36.0000, isFree: null, minutes: 300, sort: 10,
    name: 'The Tarangire River circuit',
    summary: 'The river and its baobabs, where the elephants concentrate in the dry season.',
    tip: 'Between July and October this is the only water for a long way, which is why the park holds elephant densities the Serengeti does not.' },

  // ------------------------------------------------------------ Lake Manyara
  { key: 'manyara-treetop-walkway', destination: 'lake-manyara-national-park', kind: 'active',
    lat: -3.5000, lng: 35.8167, isFree: false, minutes: 90, sort: 10,
    name: 'Treetop walkway',
    summary: 'A canopy bridge through the groundwater forest at the park entrance.',
    tip: 'Short, and a good way to break the drive between Ngorongoro and Arusha without committing to a game drive.' },
];
