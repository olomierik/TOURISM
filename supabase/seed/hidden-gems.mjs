/**
 * Under-visited destinations, each pitched against the famous one a traveller
 * has already heard of.
 *
 * Two rules held throughout, and they are the whole reason this is not another
 * "hidden gems of Tanzania" post:
 *
 *   1. Every gem is a destination that already exists here, with its own page,
 *      seasonality, costs and operators. Nothing invented to pad the list.
 *   2. Every one names what it costs you. These places are quiet because
 *      reaching them is harder, or the lodges are fewer, or the animals are
 *      less obliging. A reader who finds that out at an airstrip does not come
 *      back, and the trade-off line is the reason they will.
 *
 * English first, per the agreed plan. One entry deliberately has no
 * instead_of: not everywhere is a substitute for somewhere.
 */

export const HIDDEN_GEMS = [
  // ------------------------------------------------------------------ Tanzania
  {
    destination: 'ruaha-national-park', insteadOf: 'serengeti', sort: 10,
    pitch: 'Tanzania’s largest park, with one of the biggest lion populations left in Africa and a fraction of the vehicles. On a good morning in Ruaha you will watch a pride without another car in sight — something the Seronera valley cannot offer in any month.',
    tradeOff: 'The southern circuit is a flight from Dar or a long day on the road, and there is no migration and no crater to pair it with. Lodges are few and several close in the long rains, so a three-day northern itinerary does not simply transplant here.',
  },
  {
    destination: 'nyerere', insteadOf: 'serengeti', sort: 20,
    pitch: 'The Rufiji river makes this the one major Tanzanian park where you can swap the vehicle for a boat, or walk with an armed ranger. Seeing elephant from water level is a different trip, not a cheaper version of the same one.',
    tradeOff: 'Hot and humid in a way the northern highlands are not, and much of it turns to mud in the long rains. Game is spread thinly compared with the Serengeti, so a two-night visit here can genuinely be a quiet one.',
  },
  {
    destination: 'mafia-island', insteadOf: 'zanzibar', sort: 30,
    pitch: 'A marine park with whale sharks off the south from roughly October to March, and reefs that were never dived hard enough to be damaged. The island has no crowd because it has never had the flights to build one.',
    tradeOff: 'There is no Stone Town here, almost nowhere to eat outside the lodges, and nothing that resembles nightlife. Access is a small plane from Dar, and a handful of lodges means the high season sells out early.',
  },
  {
    destination: 'pemba-island', insteadOf: 'zanzibar', sort: 40,
    pitch: 'Greener and steeper than Unguja, with wall diving on the Pemba Channel that experienced divers rate above anything further south, and clove plantations where the beach clubs would be.',
    tradeOff: 'Fewer flights, a short list of places to stay, and a more conservative island where beach dress belongs on the beach. If you want Stone Town’s history or a lively evening, you have picked the wrong island.',
  },
  {
    destination: 'lake-natron-and-ol-doinyo-lengai', insteadOf: 'kilimanjaro', sort: 50,
    pitch: 'An active volcano you climb overnight and come down from by breakfast, above a soda lake that turns pink with flamingo. No week of acclimatisation, no booking a year out, and the summit is a crater still building itself.',
    tradeOff: 'It is a brutal night on loose ash with a real gradient, and nobody hands you a certificate at the end. The road in is punishing on vehicles, and the flamingos follow the water rather than the calendar.',
  },
  {
    destination: 'mahale-mountains-national-park', insteadOf: 'kibale-national-park', sort: 60,
    pitch: 'Chimpanzees on a forested mountainside that runs straight into Lake Tanganyika, so the day ends on a beach with water clear enough to snorkel. There is no road in, which is exactly why it stays like this.',
    tradeOff: 'Getting here means a charter flight and then a boat, and it is among the most expensive places in this guide. It is also in a different country from Uganda’s chimp forests, so choosing between them means choosing between two trips, not two mornings.',
  },

  // --------------------------------------------------------------------- Kenya
  {
    destination: 'laikipia-and-ol-pejeta', insteadOf: 'maasai-mara', sort: 10,
    pitch: 'Private conservancies, where walking safaris and night drives are permitted and the number of vehicles at a sighting is capped. Rhino here are a near-certainty rather than a lucky morning.',
    tradeOff: 'Conservancy beds cost more per night than the equivalent inside a national reserve, and what you are buying is exclusivity rather than density. There is no migration, and big cats take more patience than they do in the Mara.',
  },
  {
    destination: 'samburu-national-reserve', insteadOf: 'maasai-mara', sort: 20,
    pitch: 'The northern species live here and nowhere south of it: Grevy’s zebra, reticulated giraffe, gerenuk standing on their hind legs to feed. On a second East African safari this is the list that is still unticked.',
    tradeOff: 'Hot, dry and much smaller than the Mara, with game concentrated along one river rather than spread across plains. No crossings, and in a bad drought year the reserve is hard going.',
  },
  {
    destination: 'lamu', insteadOf: 'diani-beach', sort: 30,
    pitch: 'A Swahili town with no cars in it, where the streets are the width of a donkey and the architecture has been continuously lived in for six centuries. It is the coast’s history rather than its resorts.',
    tradeOff: 'A flight, or a very long drive and then a boat. Travel advisories for the wider county have held visitor numbers down for years, so check yours before booking, and do not expect large resort hotels.',
  },
  {
    destination: 'tsavo-west-national-park', insteadOf: 'amboseli-national-park', sort: 40,
    pitch: 'Volcanic country with lava flows, the underwater hide at Mzima Springs, and elephants stained red by the dust. Vast enough that you can drive an hour without meeting another vehicle.',
    tradeOff: 'The bush is thick and the park is enormous, so game viewing is real work next to Amboseli’s open pans. Kilimanjaro shows itself here too, but less reliably and from further away.',
  },

  // -------------------------------------------------------------------- Uganda
  {
    destination: 'kidepo-valley-national-park', insteadOf: 'murchison-falls-national-park', sort: 10,
    pitch: 'Probably the emptiest major park in East Africa, in Karamoja against the South Sudan border, with lion, cheetah and ostrich on a plain ringed by mountains. Visitors are counted in the hundreds.',
    tradeOff: 'It is genuinely remote: a full day’s drive from Kampala on hard roads, or a charter that can cost more than the rest of the trip. Almost nobody comes because the journey is the price, and there is no way around it.',
  },
  {
    destination: 'mgahinga-gorilla-national-park', insteadOf: 'bwindi-impenetrable-national-park', sort: 20,
    pitch: 'Gorillas and golden monkeys on the same volcano slopes, with a fraction of Bwindi’s permit competition and open terrain far kinder to walk than the Impenetrable Forest’s name suggests.',
    tradeOff: 'One habituated family, which sometimes crosses into Rwanda or the DRC — when it does, trekking stops and permits are refunded rather than rescheduled. Plan it as a bonus, not as the reason for the trip.',
  },
  {
    destination: 'rwenzori-mountains-national-park', insteadOf: 'kilimanjaro', sort: 30,
    pitch: 'Glaciers on the equator, and a trek through giant lobelia and groundsel that looks like nowhere else on earth. Margherita Peak is a mountaineering objective rather than a long walk uphill.',
    tradeOff: 'Wet, cold and muddy for most of its length, harder than Kilimanjaro, and the summit needs rope and crampons. Success rates are far lower, and the line about Africa’s highest point belongs to the other mountain.',
  },
  {
    destination: 'lake-bunyonyi', insteadOf: null, sort: 40,
    pitch: 'A deep, bilharzia-free lake among terraced hills, with twenty-nine islands and nothing whatsoever to do. It is where people who have just trekked gorillas go to sit still for two days.',
    tradeOff: 'That is the entire offer. There is no game, no nightlife and very little beyond a canoe, so it works as the quiet end of a trip and does not work as the trip.',
  },
  {
    destination: 'ssese-islands', insteadOf: 'entebbe', sort: 50,
    pitch: 'Eighty-four islands in Lake Victoria a ferry ride from the mainland, with sand beaches, forest and no schedule. A better last night before a flight home than another hotel by the airport.',
    tradeOff: 'The ferry keeps its own timetable and weather delays it, which is a poor thing to discover the day before an international departure. Rooms are basic and power is not continuous everywhere.',
  },

  // -------------------------------------------------------------------- Rwanda
  {
    destination: 'akagera-national-park', insteadOf: 'maasai-mara', sort: 10,
    pitch: 'Savanna two and a half hours from Kigali on tarmac, with lion and rhino both reintroduced and now breeding. It turns a gorilla trip into a two-habitat trip without a second flight.',
    tradeOff: 'Small by regional standards and nothing like the Mara for density — this is a park you give two nights, not a week. There is no migration, and predators are still a matter of luck.',
  },
  {
    destination: 'nyungwe-forest-national-park', insteadOf: 'volcanoes-national-park', sort: 20,
    pitch: 'Montane rainforest with chimpanzees, thirteen primate species and a canopy walk suspended sixty metres above the valley floor. Permits cost a fraction of a gorilla permit.',
    tradeOff: 'Chimp tracking is nothing like gorilla trekking: the animals move fast and high, and plenty of groups come back having heard far more than they saw. It is a long drive from Kigali, and it rains.',
  },
];
