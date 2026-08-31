/**
 * Annual events across the four countries.
 *
 * Every one of these carries a typical month and no confirmed dates, because
 * confirmed dates are not something to infer. Organisers announce a few months
 * out; until then "usually February" is the true answer and a specific date
 * would be a guess that sends somebody to an airport in the wrong week.
 *
 * When dates are announced, an admin sets next_start and next_end and the page
 * switches from the habitual month to the real thing. That is the whole point
 * of modelling them as one recurring row rather than a page per year.
 *
 * English first, per the agreed plan. The advice line is what a date listing
 * cannot carry: book early, expect closures, bring cash.
 */

export const EVENTS = [
  // ------------------------------------------------------------------ Tanzania
  {
    key: 'sauti-za-busara', country: 'TZ', destination: 'zanzibar',
    kind: 'music', month: 2,
    name: 'Sauti za Busara',
    summary: 'East Africa’s best-known music festival, held in the Old Fort in Stone Town.',
    advice: 'Stone Town books out and room rates roughly double for the weekend. Reserve months ahead, and stay walking distance from the Fort — taxis through those lanes are slower than feet.',
    website: 'https://www.busaramusic.org',
  },
  {
    key: 'ziff-zanzibar-film', country: 'TZ', destination: 'zanzibar',
    kind: 'film', month: 7,
    name: 'Zanzibar International Film Festival',
    summary: 'Screenings across Stone Town, including open-air nights in the Old Fort.',
    advice: 'Falls in the dry season and in European high season, so it stacks on top of already-high room rates. The open-air screenings are the ones worth planning around.',
  },
  {
    key: 'mwaka-kogwa', country: 'TZ', destination: 'zanzibar',
    kind: 'culture', month: 7,
    name: 'Mwaka Kogwa',
    summary: 'The Shirazi new year, marked at Makunduchi in the south of the island.',
    advice: 'A village festival rather than a tourist event — the ritual mock fighting is real and visitors watch rather than join. Go with someone local, and ask before photographing anyone.',
  },
  {
    key: 'kilimanjaro-marathon', country: 'TZ', destination: 'kilimanjaro',
    kind: 'sport', month: 3,
    name: 'Kilimanjaro Marathon',
    summary: 'A road marathon and half from Moshi, in the shadow of the mountain.',
    advice: 'Moshi sits at around 800m, so the altitude is not the problem — the heat is. Entries open months ahead and accommodation in Moshi is limited.',
  },
  {
    key: 'bagamoyo-arts-festival', country: 'TZ', destination: 'dar-es-salaam',
    kind: 'culture', month: 9,
    name: 'Bagamoyo Arts and Culture Festival',
    summary: 'Music, dance and theatre at the old slaving port north of Dar es Salaam.',
    advice: 'Bagamoyo is around two hours from Dar on a good day. Worth pairing with the ruins at Kaole rather than treating the festival as the only reason to go.',
  },
  {
    key: 'karibu-kilifair', country: 'TZ', destination: 'arusha',
    kind: 'trade', month: 6,
    name: 'Karibu-KiliFair',
    summary: 'The region’s largest tourism trade fair, held in Arusha.',
    advice: 'A trade event rather than a public one, but it is when most East African operators are in one place. If you are choosing between companies, this is the week they are all reachable.',
  },

  // --------------------------------------------------------------------- Kenya
  {
    key: 'lamu-cultural-festival', country: 'KE', destination: 'lamu',
    kind: 'culture', month: 11,
    name: 'Lamu Cultural Festival',
    summary: 'Dhow races, donkey races and Swahili poetry across Lamu town.',
    advice: 'There are no cars on Lamu and very few rooms. Book far ahead, and expect the island to be busier than at any other point in the year.',
  },
  {
    key: 'lamu-maulidi', country: 'KE', destination: 'lamu',
    kind: 'culture', month: 9,
    name: 'Maulidi Festival',
    summary: 'The Prophet’s birthday, marked in Lamu with processions and recitation.',
    advice: 'Dates follow the Islamic lunar calendar and move roughly eleven days earlier each year, so the month here is indicative only — check before booking. Dress modestly; this is a religious observance, not a spectacle.',
  },
  {
    key: 'rhino-charge', country: 'KE', destination: 'laikipia-and-ol-pejeta',
    kind: 'sport', month: 6,
    name: 'Rhino Charge',
    summary: 'An off-road motorsport fundraiser for Rhino Ark, at a location kept secret until shortly before.',
    advice: 'Spectator access is limited and the site is announced late by design. Follow the organisers rather than planning a trip around it.',
  },
  {
    key: 'maasai-mara-migration-season', country: 'KE', destination: 'maasai-mara',
    kind: 'wildlife', month: 8,
    name: 'Migration season in the Mara',
    summary: 'The months the herds are north of the Mara River, roughly July to October.',
    advice: 'Not an event with a date — the herds move on rain, not a calendar. Treat a river crossing as a possibility rather than an itinerary item, and give yourself three days in the north rather than one.',
  },

  // -------------------------------------------------------------------- Uganda
  {
    key: 'nyege-nyege', country: 'UG', destination: 'jinja-and-the-source-of-the-nile',
    kind: 'music', month: 11,
    name: 'Nyege Nyege Festival',
    summary: 'Four days of East African electronic and traditional music on the banks of the Nile.',
    advice: 'Camping on site is the intended experience and the reason people come back. Jinja’s hotels fill first; the festival’s own campsite is usually still available when they have gone.',
  },
  {
    key: 'uganda-martyrs-day', country: 'UG', destination: 'kampala',
    kind: 'culture', month: 6,
    name: 'Uganda Martyrs Day',
    summary: 'A national pilgrimage to Namugongo, drawing crowds from across the region.',
    advice: 'Held on 3 June. Roads into Kampala from the east are effectively closed to normal traffic that day — if you are transiting, move the day before or the day after.',
  },
  {
    key: 'kampala-city-festival', country: 'UG', destination: 'kampala',
    kind: 'culture', month: 10,
    name: 'Kampala City Festival',
    summary: 'A street festival that closes the city centre for a day of music and parades.',
    advice: 'The centre is genuinely shut to vehicles. Good if you are already in Kampala, awkward if you have a flight — Entebbe is an hour away on a normal day and longer on this one.',
  },

  // -------------------------------------------------------------------- Rwanda
  {
    key: 'kwita-izina', country: 'RW', destination: 'volcanoes-national-park',
    kind: 'wildlife', month: 9,
    name: 'Kwita Izina',
    summary: 'Rwanda’s gorilla naming ceremony, held at the foot of the Virungas in Kinigi.',
    advice: 'Attendance is by invitation for the ceremony itself, but the week around it has public events in Musanze and Kigali. Gorilla permits for that week go early.',
    website: 'https://www.kwitizina.rw',
  },
  {
    key: 'tour-du-rwanda', country: 'RW', destination: 'kigali',
    kind: 'sport', month: 2,
    name: 'Tour du Rwanda',
    summary: 'A UCI stage race through the hills, finishing in Kigali.',
    advice: 'Roads on the route close for hours around the peloton. If you are driving between Kigali and Musanze that week, check the stage map first.',
  },
  {
    key: 'rwanda-kigali-genocide-commemoration', country: 'RW', destination: 'kigali',
    kind: 'culture', month: 4,
    name: 'Kwibuka — Genocide Commemoration',
    summary: 'The national commemoration period beginning on 7 April.',
    advice: 'The first week is a period of official mourning. Music in public places is restricted, many businesses close or shorten hours, and the tone across the country is subdued. Travel is entirely possible; behaving as though it is an ordinary week is not.',
  },
];
