/**
 * Destinations and categories — the SEO backbone.
 *
 * Slugs are genuinely localized, not transliterated: Germans search
 * "Kilimandscharo" and "Sansibar", Italians "Kilimangiaro". Matching the query
 * in the URL is a large part of why running four locales is worth the cost.
 *
 * `key` is the stable machine identifier used by every other seed file, so
 * nothing depends on a slug that might later be edited for SEO reasons.
 */

export const destinations = [
  {
    key: 'serengeti',
    latitude: -2.333333,
    longitude: 34.833333,
    sortOrder: 1,
    isFeatured: true,
    translations: {
      en: {
        name: 'Serengeti',
        slug: 'serengeti',
        summary: 'Endless plains and the greatest wildlife spectacle on earth.',
        description:
          'The Serengeti is Tanzania’s flagship national park: 14,750 square kilometres of open grassland, acacia woodland and granite kopjes. It hosts the Great Migration, in which roughly two million wildebeest, zebra and gazelle move in a continuous loop between the southern calving grounds and the Mara River. Big cat densities here are among the highest anywhere.',
        travelTips:
          'Where you stay matters more than when you go. The herds move constantly, so match your camp to the month rather than booking a fixed lodge and hoping.',
        bestTime: 'January to March for calving; June to October for river crossings and dry-season game viewing.',
        seoTitle: 'Serengeti Safari Operators, Lodges & Tours',
        seoDescription:
          'Compare verified Serengeti safari operators and lodges. Great Migration timing, park fees and real quotes from the people who run the trips.',
      },
      de: {
        name: 'Serengeti',
        slug: 'serengeti',
        summary: 'Endlose Ebenen und das größte Naturschauspiel der Erde.',
        description:
          'Die Serengeti ist Tansanias bekanntester Nationalpark: 14.750 Quadratkilometer Grasland, Akazienwälder und Granitfelsen. Hier findet die Große Tierwanderung statt, bei der rund zwei Millionen Gnus, Zebras und Gazellen zwischen den südlichen Kalbungsgebieten und dem Mara-Fluss ziehen. Die Dichte an Großkatzen gehört zu den höchsten weltweit.',
        travelTips:
          'Der Standort Ihres Camps ist wichtiger als die Reisezeit. Die Herden ziehen ständig weiter — wählen Sie die Unterkunft passend zum Monat.',
        bestTime: 'Januar bis März zur Kalbungszeit; Juni bis Oktober für Flussdurchquerungen und Trockenzeit.',
        seoTitle: 'Serengeti Safari-Veranstalter, Lodges & Touren',
        seoDescription:
          'Vergleichen Sie geprüfte Serengeti-Safarianbieter und Lodges. Zeitpunkt der Großen Tierwanderung, Parkgebühren und echte Angebote.',
      },
      fr: {
        name: 'Serengeti',
        slug: 'serengeti',
        summary: 'Des plaines infinies et le plus grand spectacle animalier au monde.',
        description:
          'Le Serengeti est le parc national emblématique de la Tanzanie : 14 750 kilomètres carrés de savane, de bois d’acacias et de kopjes granitiques. Il accueille la Grande Migration, au cours de laquelle près de deux millions de gnous, zèbres et gazelles circulent entre les zones de mise bas du sud et la rivière Mara. La densité de grands félins y est parmi les plus élevées au monde.',
        travelTips:
          'L’emplacement de votre camp compte plus que la saison. Les troupeaux se déplacent en permanence : choisissez votre hébergement en fonction du mois.',
        bestTime: 'Janvier à mars pour la mise bas ; juin à octobre pour les traversées de rivière.',
        seoTitle: 'Serengeti : opérateurs de safari, lodges et circuits',
        seoDescription:
          'Comparez des opérateurs de safari et lodges vérifiés au Serengeti. Calendrier de la Grande Migration, droits d’entrée et devis réels.',
      },
      it: {
        name: 'Serengeti',
        slug: 'serengeti',
        summary: 'Pianure infinite e il più grande spettacolo naturale della Terra.',
        description:
          'Il Serengeti è il parco nazionale simbolo della Tanzania: 14.750 chilometri quadrati di savana, boschi di acacie e kopjes granitici. Ospita la Grande Migrazione, durante la quale circa due milioni di gnu, zebre e gazzelle si spostano tra le aree di parto meridionali e il fiume Mara. La densità di grandi felini è tra le più alte al mondo.',
        travelTips:
          'La posizione del campo conta più del periodo. Le mandrie si spostano di continuo: scegli l’alloggio in base al mese.',
        bestTime: 'Da gennaio a marzo per i parti; da giugno a ottobre per gli attraversamenti del fiume.',
        seoTitle: 'Serengeti: operatori safari, lodge e tour',
        seoDescription:
          'Confronta operatori safari e lodge verificati nel Serengeti. Calendario della Grande Migrazione, tariffe del parco e preventivi reali.',
      },
    },
  },

  {
    key: 'ngorongoro',
    latitude: -3.2,
    longitude: 35.5,
    sortOrder: 2,
    isFeatured: true,
    translations: {
      en: {
        name: 'Ngorongoro',
        slug: 'ngorongoro',
        summary: 'A collapsed volcano holding one of Africa’s densest wildlife populations.',
        description:
          'The Ngorongoro Crater is the world’s largest intact volcanic caldera, roughly 260 square kilometres enclosed by 600-metre walls. Around 25,000 large animals live inside year-round, including one of Tanzania’s last viable black rhino populations. The conservation area around it is also home to Maasai communities who graze livestock alongside the wildlife.',
        travelTips:
          'Descend at dawn. The crater floor fills with vehicles by mid-morning, and the cats hunt early.',
        bestTime: 'Year-round. June to October is driest; the green season brings fewer vehicles.',
        seoTitle: 'Ngorongoro Crater Safaris, Lodges & Day Trips',
        seoDescription:
          'Compare verified Ngorongoro Crater operators and lodges. Crater fees, timing and quotes direct from Tanzanian safari companies.',
      },
      de: {
        name: 'Ngorongoro',
        slug: 'ngorongoro-krater',
        summary: 'Ein eingestürzter Vulkan mit einer der dichtesten Tierpopulationen Afrikas.',
        description:
          'Der Ngorongoro-Krater ist die größte intakte Vulkancaldera der Welt — rund 260 Quadratkilometer, umschlossen von 600 Meter hohen Wänden. Etwa 25.000 Großtiere leben ganzjährig darin, darunter eine der letzten überlebensfähigen Spitzmaulnashorn-Populationen Tansanias. Im umliegenden Schutzgebiet leben Massai-Gemeinschaften mit ihrem Vieh.',
        travelTips:
          'Fahren Sie im Morgengrauen hinunter. Ab dem Vormittag füllt sich der Kraterboden mit Fahrzeugen, und die Raubkatzen jagen früh.',
        bestTime: 'Ganzjährig. Juni bis Oktober am trockensten; in der Grünzeit weniger Fahrzeuge.',
        seoTitle: 'Ngorongoro-Krater: Safaris, Lodges & Tagestouren',
        seoDescription:
          'Vergleichen Sie geprüfte Anbieter am Ngorongoro-Krater. Kratergebühren, beste Reisezeit und Angebote direkt von tansanischen Veranstaltern.',
      },
      fr: {
        name: 'Ngorongoro',
        slug: 'ngorongoro',
        summary: 'Un volcan effondré abritant l’une des faunes les plus denses d’Afrique.',
        description:
          'Le cratère du Ngorongoro est la plus grande caldeira volcanique intacte au monde : environ 260 kilomètres carrés ceints de parois de 600 mètres. Quelque 25 000 grands animaux y vivent toute l’année, dont l’une des dernières populations viables de rhinocéros noirs de Tanzanie. L’aire de conservation environnante abrite aussi des communautés massaï.',
        travelTips:
          'Descendez à l’aube. Le fond du cratère se remplit de véhicules en milieu de matinée, et les félins chassent tôt.',
        bestTime: 'Toute l’année. Juin à octobre est le plus sec ; la saison verte attire moins de monde.',
        seoTitle: 'Cratère du Ngorongoro : safaris, lodges et excursions',
        seoDescription:
          'Comparez des opérateurs vérifiés au cratère du Ngorongoro. Droits d’entrée, périodes et devis directs.',
      },
      it: {
        name: 'Ngorongoro',
        slug: 'cratere-ngorongoro',
        summary: 'Un vulcano collassato con una delle fauna più dense dell’Africa.',
        description:
          'Il cratere di Ngorongoro è la più grande caldera vulcanica intatta al mondo: circa 260 chilometri quadrati racchiusi da pareti di 600 metri. Vi vivono tutto l’anno circa 25.000 grandi animali, inclusa una delle ultime popolazioni vitali di rinoceronte nero della Tanzania. L’area di conservazione circostante ospita anche comunità Maasai.',
        travelTips:
          'Scendi all’alba. Il fondo del cratere si riempie di veicoli a metà mattina e i felini cacciano presto.',
        bestTime: 'Tutto l’anno. Da giugno a ottobre è più secco; nella stagione verde ci sono meno veicoli.',
        seoTitle: 'Cratere di Ngorongoro: safari, lodge ed escursioni',
        seoDescription:
          'Confronta operatori verificati al cratere di Ngorongoro. Tariffe, periodi migliori e preventivi diretti.',
      },
    },
  },

  {
    key: 'kilimanjaro',
    latitude: -3.067,
    longitude: 37.355,
    sortOrder: 3,
    isFeatured: true,
    translations: {
      en: {
        name: 'Kilimanjaro',
        slug: 'kilimanjaro',
        summary: 'Africa’s highest peak, and the only one you can walk up.',
        description:
          'At 5,895 metres, Kilimanjaro is the highest free-standing mountain in the world and the highest point in Africa. No technical climbing is required on any of the seven established routes, which is why it draws around 35,000 trekkers a year. Success rates vary enormously by route and itinerary length — the difference between five days and eight is the difference between roughly half and over ninety percent.',
        travelTips:
          'Pay for the extra days. Summit success correlates with acclimatisation time far more than with fitness, and the cheapest itineraries are the shortest ones.',
        bestTime: 'January to mid-March and June to October. Avoid the long rains in April and May.',
        seoTitle: 'Kilimanjaro Trekking Operators & Route Comparison',
        seoDescription:
          'Compare licensed Kilimanjaro operators. Route success rates, what is included, porter welfare and real quotes.',
      },
      de: {
        name: 'Kilimandscharo',
        slug: 'kilimandscharo',
        summary: 'Afrikas höchster Gipfel — und der einzige, den man erwandern kann.',
        description:
          'Mit 5.895 Metern ist der Kilimandscharo der höchste freistehende Berg der Welt und der höchste Punkt Afrikas. Keine der sieben etablierten Routen erfordert Klettertechnik, weshalb jährlich rund 35.000 Trekker kommen. Die Erfolgsquoten unterscheiden sich stark je nach Route und Dauer — zwischen fünf und acht Tagen liegen etwa 50 gegenüber über 90 Prozent.',
        travelTips:
          'Investieren Sie in zusätzliche Tage. Der Gipfelerfolg hängt weit mehr von der Akklimatisierung ab als von der Fitness — und die billigsten Angebote sind die kürzesten.',
        bestTime: 'Januar bis Mitte März und Juni bis Oktober. Die große Regenzeit im April und Mai meiden.',
        seoTitle: 'Kilimandscharo: Trekking-Veranstalter & Routenvergleich',
        seoDescription:
          'Vergleichen Sie lizenzierte Kilimandscharo-Veranstalter. Erfolgsquoten der Routen, Leistungen, Trägerwohl und echte Angebote.',
      },
      fr: {
        name: 'Kilimandjaro',
        slug: 'kilimandjaro',
        summary: 'Le plus haut sommet d’Afrique, et le seul qui se gravit à pied.',
        description:
          'Culminant à 5 895 mètres, le Kilimandjaro est la plus haute montagne isolée du monde et le point culminant de l’Afrique. Aucune des sept voies établies ne demande d’escalade technique, ce qui attire environ 35 000 randonneurs par an. Les taux de réussite varient énormément selon la voie et la durée : entre cinq et huit jours, on passe d’environ la moitié à plus de quatre-vingt-dix pour cent.',
        travelTips:
          'Payez les jours supplémentaires. La réussite dépend bien plus de l’acclimatation que de la condition physique, et les circuits les moins chers sont les plus courts.',
        bestTime: 'Janvier à mi-mars et juin à octobre. Évitez les grandes pluies d’avril et mai.',
        seoTitle: 'Kilimandjaro : opérateurs de trek et comparatif des voies',
        seoDescription:
          'Comparez des opérateurs agréés du Kilimandjaro. Taux de réussite, prestations incluses, conditions des porteurs et devis réels.',
      },
      it: {
        name: 'Kilimangiaro',
        slug: 'kilimangiaro',
        summary: 'La vetta più alta d’Africa, e l’unica che si sale camminando.',
        description:
          'Con i suoi 5.895 metri, il Kilimangiaro è la montagna isolata più alta del mondo e il punto più elevato dell’Africa. Nessuna delle sette vie classiche richiede arrampicata tecnica, motivo per cui attira circa 35.000 trekker l’anno. I tassi di successo variano molto per via e durata: tra cinque e otto giorni si passa da circa metà a oltre il novanta per cento.',
        travelTips:
          'Paga i giorni in più. Il successo in vetta dipende dall’acclimatamento molto più che dalla forma fisica, e gli itinerari più economici sono i più brevi.',
        bestTime: 'Da gennaio a metà marzo e da giugno a ottobre. Evita le grandi piogge di aprile e maggio.',
        seoTitle: 'Kilimangiaro: operatori di trekking e confronto vie',
        seoDescription:
          'Confronta operatori autorizzati del Kilimangiaro. Tassi di successo, cosa è incluso, tutela dei portatori e preventivi reali.',
      },
    },
  },

  {
    key: 'zanzibar',
    latitude: -6.165,
    longitude: 39.2,
    sortOrder: 4,
    isFeatured: true,
    translations: {
      en: {
        name: 'Zanzibar',
        slug: 'zanzibar',
        summary: 'Spice islands, Swahili history and the Indian Ocean.',
        description:
          'Zanzibar is a semi-autonomous archipelago 25 kilometres off the Tanzanian coast. Stone Town, its UNESCO-listed old quarter, is a dense maze of coral-stone buildings reflecting Omani, Indian and Swahili influence. Beyond it lie the beaches most visitors come for, plus spice farms, Jozani Forest and some of the best diving in East Africa.',
        travelTips:
          'The east coast has dramatic tides that leave the beach dry for hours. If you want to swim on demand, choose the north.',
        bestTime: 'June to October and December to February. March to May is the wettest.',
        seoTitle: 'Zanzibar Hotels, Beach Resorts & Tours',
        seoDescription:
          'Compare verified Zanzibar hotels, resorts and tour operators. Stone Town, beaches, diving and quotes direct from local businesses.',
      },
      de: {
        name: 'Sansibar',
        slug: 'sansibar',
        summary: 'Gewürzinseln, Suaheli-Geschichte und der Indische Ozean.',
        description:
          'Sansibar ist ein halbautonomer Archipel 25 Kilometer vor der tansanischen Küste. Stone Town, die zum UNESCO-Welterbe gehörende Altstadt, ist ein dichtes Labyrinth aus Korallensteinhäusern mit omanischen, indischen und Suaheli-Einflüssen. Dahinter liegen die Strände, Gewürzfarmen, der Jozani-Wald und einige der besten Tauchgründe Ostafrikas.',
        travelTips:
          'An der Ostküste zieht sich das Wasser bei Ebbe stundenlang zurück. Wer jederzeit schwimmen möchte, wählt den Norden.',
        bestTime: 'Juni bis Oktober und Dezember bis Februar. März bis Mai ist am nassesten.',
        seoTitle: 'Sansibar: Hotels, Strandresorts & Touren',
        seoDescription:
          'Vergleichen Sie geprüfte Hotels, Resorts und Veranstalter auf Sansibar. Stone Town, Strände, Tauchen — Angebote direkt von lokalen Betrieben.',
      },
      fr: {
        name: 'Zanzibar',
        slug: 'zanzibar',
        summary: 'Les îles aux épices, l’histoire swahilie et l’océan Indien.',
        description:
          'Zanzibar est un archipel semi-autonome situé à 25 kilomètres des côtes tanzaniennes. Stone Town, sa vieille ville classée à l’UNESCO, est un dédale de bâtisses en pierre de corail mêlant influences omanaise, indienne et swahilie. Au-delà s’étendent les plages, les plantations d’épices, la forêt de Jozani et certains des meilleurs sites de plongée d’Afrique de l’Est.',
        travelTips:
          'La côte est connaît des marées spectaculaires qui découvrent la plage pendant des heures. Pour nager à toute heure, choisissez le nord.',
        bestTime: 'Juin à octobre et décembre à février. Mars à mai est la période la plus humide.',
        seoTitle: 'Zanzibar : hôtels, resorts de plage et excursions',
        seoDescription:
          'Comparez hôtels, resorts et opérateurs vérifiés à Zanzibar. Stone Town, plages, plongée et devis directs.',
      },
      it: {
        name: 'Zanzibar',
        slug: 'zanzibar',
        summary: 'Isole delle spezie, storia swahili e Oceano Indiano.',
        description:
          'Zanzibar è un arcipelago semi-autonomo a 25 chilometri dalla costa tanzaniana. Stone Town, il centro storico patrimonio UNESCO, è un labirinto di edifici in pietra corallina che riflettono influenze omanite, indiane e swahili. Oltre si trovano le spiagge, le piantagioni di spezie, la foresta di Jozani e alcuni dei migliori siti di immersione dell’Africa orientale.',
        travelTips:
          'La costa orientale ha maree marcate che lasciano la spiaggia asciutta per ore. Per nuotare a qualsiasi ora, scegli il nord.',
        bestTime: 'Da giugno a ottobre e da dicembre a febbraio. Da marzo a maggio è il periodo più piovoso.',
        seoTitle: 'Zanzibar: hotel, resort sulla spiaggia e tour',
        seoDescription:
          'Confronta hotel, resort e operatori verificati a Zanzibar. Stone Town, spiagge, immersioni e preventivi diretti.',
      },
    },
  },

  {
    key: 'arusha',
    latitude: -3.386925,
    longitude: 36.682995,
    sortOrder: 5,
    translations: {
      en: {
        name: 'Arusha',
        slug: 'arusha',
        summary: 'The safari capital, and where almost every northern circuit begins.',
        description:
          'Arusha sits below Mount Meru and functions as the operational base for the northern safari circuit. Most operators, vehicle fleets and guides are headquartered here, and Kilimanjaro International Airport is 50 kilometres away. Arusha National Park itself is underrated — walking safaris, giraffe, colobus and the Momella lakes, all within an hour of town.',
        travelTips:
          'Meet your operator in person before you pay. Arusha is where the good companies and the brass-plate ones sit side by side.',
        bestTime: 'Year-round; June to October aligns with the northern circuit dry season.',
        seoTitle: 'Arusha Safari Operators, Hotels & Day Trips',
        seoDescription:
          'Compare verified safari operators, hotels and transport in Arusha — the base for Serengeti, Ngorongoro and Kilimanjaro trips.',
      },
      de: {
        name: 'Arusha',
        slug: 'arusha',
        summary: 'Die Safari-Hauptstadt — Ausgangspunkt fast aller nördlichen Routen.',
        description:
          'Arusha liegt am Fuße des Mount Meru und ist die Basis für den nördlichen Safari-Circuit. Die meisten Veranstalter, Fuhrparks und Guides sind hier ansässig, der Kilimanjaro International Airport liegt 50 Kilometer entfernt. Der Arusha-Nationalpark selbst wird unterschätzt: Wandersafaris, Giraffen, Colobus-Affen und die Momella-Seen, alles binnen einer Stunde.',
        travelTips:
          'Treffen Sie Ihren Veranstalter persönlich, bevor Sie zahlen. In Arusha sitzen seriöse Firmen und Briefkastenfirmen nebeneinander.',
        bestTime: 'Ganzjährig; Juni bis Oktober entspricht der Trockenzeit im Norden.',
        seoTitle: 'Arusha: Safari-Veranstalter, Hotels & Tagestouren',
        seoDescription:
          'Vergleichen Sie geprüfte Veranstalter, Hotels und Transportanbieter in Arusha — Basis für Serengeti, Ngorongoro und Kilimandscharo.',
      },
      fr: {
        name: 'Arusha',
        slug: 'arusha',
        summary: 'La capitale du safari, point de départ de presque tous les circuits nord.',
        description:
          'Arusha s’étend au pied du mont Meru et sert de base opérationnelle au circuit nord. La plupart des opérateurs, flottes de véhicules et guides y sont basés, et l’aéroport international du Kilimandjaro est à 50 kilomètres. Le parc national d’Arusha lui-même est sous-estimé : safaris à pied, girafes, colobes et lacs Momella, à une heure de la ville.',
        travelTips:
          'Rencontrez votre opérateur avant de payer. À Arusha, les bonnes maisons et les boîtes aux lettres se côtoient.',
        bestTime: 'Toute l’année ; juin à octobre correspond à la saison sèche du nord.',
        seoTitle: 'Arusha : opérateurs de safari, hôtels et excursions',
        seoDescription:
          'Comparez opérateurs, hôtels et transporteurs vérifiés à Arusha — base pour le Serengeti, le Ngorongoro et le Kilimandjaro.',
      },
      it: {
        name: 'Arusha',
        slug: 'arusha',
        summary: 'La capitale dei safari, punto di partenza di quasi tutti i circuiti nord.',
        description:
          'Arusha sorge ai piedi del monte Meru ed è la base operativa del circuito safari settentrionale. Qui hanno sede la maggior parte degli operatori, delle flotte e delle guide, e l’aeroporto internazionale del Kilimangiaro dista 50 chilometri. Il parco nazionale di Arusha è sottovalutato: safari a piedi, giraffe, colobi e i laghi Momella, tutto entro un’ora dalla città.',
        travelTips:
          'Incontra l’operatore di persona prima di pagare. Ad Arusha le aziende serie e quelle di facciata convivono.',
        bestTime: 'Tutto l’anno; da giugno a ottobre coincide con la stagione secca del nord.',
        seoTitle: 'Arusha: operatori safari, hotel ed escursioni',
        seoDescription:
          'Confronta operatori, hotel e trasporti verificati ad Arusha — base per Serengeti, Ngorongoro e Kilimangiaro.',
      },
    },
  },

  {
    key: 'nyerere',
    latitude: -7.8,
    longitude: 37.8,
    sortOrder: 6,
    translations: {
      en: {
        name: 'Nyerere National Park',
        slug: 'nyerere-national-park',
        summary: 'Tanzania’s vast southern wilderness, and its quietest big park.',
        description:
          'Carved from the former Selous Game Reserve in 2019, Nyerere is one of the largest national parks in Africa at over 30,000 square kilometres. The Rufiji River runs through it, making boat safaris possible — a genuinely different experience from the northern circuit. Visitor numbers are a fraction of the Serengeti’s, so sightings are rarely shared.',
        travelTips:
          'Fly in. The road from Dar es Salaam is long and rough, and the flight is often cheaper than the vehicle days it saves.',
        bestTime: 'June to October. Many camps close during the March to May rains.',
        seoTitle: 'Nyerere National Park Safaris & Boat Trips',
        seoDescription:
          'Compare operators for Nyerere National Park, formerly the Selous. Boat safaris, fly-in camps and quotes from southern-circuit specialists.',
      },
      de: {
        name: 'Nyerere-Nationalpark',
        slug: 'nyerere-nationalpark',
        summary: 'Tansanias weite südliche Wildnis — der ruhigste große Park.',
        description:
          'Der 2019 aus dem früheren Selous-Wildreservat hervorgegangene Nyerere-Nationalpark ist mit über 30.000 Quadratkilometern einer der größten Afrikas. Der Rufiji-Fluss durchquert ihn und ermöglicht Bootssafaris — eine echte Abwechslung zum nördlichen Circuit. Die Besucherzahlen betragen einen Bruchteil der Serengeti.',
        travelTips:
          'Fliegen Sie hin. Die Straße von Daressalam ist lang und schlecht; der Flug ist oft günstiger als die eingesparten Fahrtage.',
        bestTime: 'Juni bis Oktober. Viele Camps schließen während der Regenzeit von März bis Mai.',
        seoTitle: 'Nyerere-Nationalpark: Safaris & Bootstouren',
        seoDescription:
          'Vergleichen Sie Veranstalter für den Nyerere-Nationalpark (früher Selous). Bootssafaris, Fly-in-Camps und Angebote von Spezialisten.',
      },
      fr: {
        name: 'Parc national de Nyerere',
        slug: 'parc-national-de-nyerere',
        summary: 'L’immense nature sauvage du sud tanzanien, et son grand parc le plus calme.',
        description:
          'Créé en 2019 à partir de l’ancienne réserve de Selous, Nyerere est l’un des plus vastes parcs nationaux d’Afrique avec plus de 30 000 kilomètres carrés. Le fleuve Rufiji le traverse et rend possibles les safaris en bateau, expérience véritablement différente du circuit nord. La fréquentation représente une fraction de celle du Serengeti.',
        travelTips:
          'Prenez l’avion. La route depuis Dar es Salaam est longue et mauvaise ; le vol coûte souvent moins que les journées de véhicule économisées.',
        bestTime: 'Juin à octobre. De nombreux camps ferment pendant les pluies de mars à mai.',
        seoTitle: 'Parc national de Nyerere : safaris et sorties en bateau',
        seoDescription:
          'Comparez les opérateurs du parc national de Nyerere, ancien Selous. Safaris en bateau, camps fly-in et devis de spécialistes.',
      },
      it: {
        name: 'Parco nazionale di Nyerere',
        slug: 'parco-nazionale-nyerere',
        summary: 'La vasta natura selvaggia del sud, il grande parco più tranquillo.',
        description:
          'Ricavato nel 2019 dall’ex riserva di Selous, Nyerere è uno dei parchi nazionali più grandi d’Africa con oltre 30.000 chilometri quadrati. Il fiume Rufiji lo attraversa e rende possibili i safari in barca, un’esperienza davvero diversa dal circuito nord. I visitatori sono una frazione di quelli del Serengeti.',
        travelTips:
          'Arriva in aereo. La strada da Dar es Salaam è lunga e dissestata; il volo costa spesso meno delle giornate di veicolo risparmiate.',
        bestTime: 'Da giugno a ottobre. Molti campi chiudono durante le piogge da marzo a maggio.',
        seoTitle: 'Parco nazionale di Nyerere: safari e gite in barca',
        seoDescription:
          'Confronta operatori per il parco nazionale di Nyerere, ex Selous. Safari in barca, campi fly-in e preventivi da specialisti.',
      },
    },
  },

  {
    key: 'dar-es-salaam',
    latitude: -6.792354,
    longitude: 39.208328,
    sortOrder: 7,
    translations: {
      en: {
        name: 'Dar es Salaam',
        slug: 'dar-es-salaam',
        summary: 'Tanzania’s largest city and the gateway to the south and the coast.',
        description:
          'Dar es Salaam is the commercial heart of Tanzania and the main international arrival point for the southern circuit and the coast. Most travelers pass through rather than stay, but the National Museum, the fish market at Kivukoni and the beaches north at Kunduchi reward a day. Ferries to Zanzibar leave from the central harbour throughout the day.',
        travelTips:
          'Traffic is severe. Allow two hours to the airport at peak times, or take the ferry and skip the road entirely.',
        bestTime: 'June to October is driest and least humid.',
        seoTitle: 'Dar es Salaam Hotels, Transport & Tours',
        seoDescription:
          'Compare hotels, airport transfers and tour operators in Dar es Salaam — the gateway to Zanzibar and southern Tanzania.',
      },
      de: {
        name: 'Daressalam',
        slug: 'daressalam',
        summary: 'Tansanias größte Stadt und Tor zum Süden und zur Küste.',
        description:
          'Daressalam ist das wirtschaftliche Zentrum Tansanias und der wichtigste internationale Ankunftsort für den südlichen Circuit und die Küste. Die meisten Reisenden sind nur auf der Durchreise, doch das Nationalmuseum, der Fischmarkt in Kivukoni und die Strände bei Kunduchi lohnen einen Tag. Fähren nach Sansibar fahren ganztägig vom zentralen Hafen.',
        travelTips:
          'Der Verkehr ist stark. Planen Sie zu Stoßzeiten zwei Stunden zum Flughafen ein — oder nehmen Sie die Fähre.',
        bestTime: 'Juni bis Oktober ist am trockensten und am wenigsten schwül.',
        seoTitle: 'Daressalam: Hotels, Transport & Touren',
        seoDescription:
          'Vergleichen Sie Hotels, Flughafentransfers und Veranstalter in Daressalam — Tor nach Sansibar und Südtansania.',
      },
      fr: {
        name: 'Dar es Salaam',
        slug: 'dar-es-salaam',
        summary: 'La plus grande ville de Tanzanie, porte du sud et de la côte.',
        description:
          'Dar es Salaam est le cœur commercial de la Tanzanie et le principal point d’arrivée international pour le circuit sud et la côte. La plupart des voyageurs ne font qu’y transiter, mais le musée national, le marché aux poissons de Kivukoni et les plages de Kunduchi valent une journée. Les ferries pour Zanzibar partent du port central toute la journée.',
        travelTips:
          'La circulation est difficile. Comptez deux heures pour l’aéroport aux heures de pointe, ou prenez le ferry.',
        bestTime: 'Juin à octobre : le plus sec et le moins humide.',
        seoTitle: 'Dar es Salaam : hôtels, transports et excursions',
        seoDescription:
          'Comparez hôtels, transferts et opérateurs à Dar es Salaam — porte d’entrée vers Zanzibar et le sud de la Tanzanie.',
      },
      it: {
        name: 'Dar es Salaam',
        slug: 'dar-es-salaam',
        summary: 'La città più grande della Tanzania, porta verso sud e costa.',
        description:
          'Dar es Salaam è il cuore commerciale della Tanzania e il principale punto di arrivo internazionale per il circuito meridionale e la costa. La maggior parte dei viaggiatori vi transita soltanto, ma il Museo Nazionale, il mercato del pesce di Kivukoni e le spiagge di Kunduchi meritano una giornata. I traghetti per Zanzibar partono dal porto centrale tutto il giorno.',
        travelTips:
          'Il traffico è intenso. Calcola due ore per l’aeroporto nelle ore di punta, oppure prendi il traghetto.',
        bestTime: 'Da giugno a ottobre è il periodo più secco e meno umido.',
        seoTitle: 'Dar es Salaam: hotel, trasporti e tour',
        seoDescription:
          'Confronta hotel, transfer e operatori a Dar es Salaam — porta d’accesso a Zanzibar e alla Tanzania meridionale.',
      },
    },
  },

  {
    key: 'tanga',
    latitude: -5.0689,
    longitude: 39.0988,
    sortOrder: 8,
    translations: {
      en: {
        name: 'Tanga',
        slug: 'tanga',
        summary: 'A quiet colonial port, coral caves and the Usambara foothills.',
        description:
          'Tanga is Tanzania’s northern coastal city, largely bypassed by tourism and better for it. The Amboni Caves are the largest limestone cave system in East Africa, the Usambara Mountains rise an hour inland with excellent hiking, and Pangani to the south offers empty beaches and dhow trips without Zanzibar’s prices.',
        travelTips:
          'Combine Tanga with the Usambaras rather than treating it as a beach stop on its own — the mountains are the real draw.',
        bestTime: 'June to October and January to February.',
        seoTitle: 'Tanga Hotels, Tours & Usambara Trips',
        seoDescription:
          'Compare accommodation and tour operators in Tanga and the Usambara Mountains — Tanzania’s uncrowded northern coast.',
      },
      de: {
        name: 'Tanga',
        slug: 'tanga',
        summary: 'Ein ruhiger Kolonialhafen, Korallenhöhlen und die Usambara-Vorberge.',
        description:
          'Tanga ist Tansanias nördliche Küstenstadt, weitgehend vom Tourismus verschont — zu ihrem Vorteil. Die Amboni-Höhlen bilden das größte Kalksteinhöhlensystem Ostafrikas, die Usambara-Berge liegen eine Stunde im Landesinneren und bieten hervorragende Wanderungen, und Pangani im Süden hat leere Strände und Dhau-Fahrten ohne Sansibars Preise.',
        travelTips:
          'Verbinden Sie Tanga mit den Usambara-Bergen, statt es als reines Strandziel zu sehen — die Berge sind der eigentliche Grund.',
        bestTime: 'Juni bis Oktober und Januar bis Februar.',
        seoTitle: 'Tanga: Hotels, Touren & Usambara-Ausflüge',
        seoDescription:
          'Vergleichen Sie Unterkünfte und Veranstalter in Tanga und den Usambara-Bergen — Tansanias ruhige Nordküste.',
      },
      fr: {
        name: 'Tanga',
        slug: 'tanga',
        summary: 'Un port colonial tranquille, des grottes coralliennes et les contreforts des Usambara.',
        description:
          'Tanga est la ville côtière du nord de la Tanzanie, largement épargnée par le tourisme — et elle y gagne. Les grottes d’Amboni forment le plus grand réseau calcaire d’Afrique de l’Est, les monts Usambara s’élèvent à une heure dans les terres avec d’excellentes randonnées, et Pangani au sud offre des plages vides et des sorties en boutre sans les prix de Zanzibar.',
        travelTips:
          'Associez Tanga aux Usambara plutôt que d’en faire une simple étape balnéaire — les montagnes sont le vrai attrait.',
        bestTime: 'Juin à octobre et janvier à février.',
        seoTitle: 'Tanga : hôtels, excursions et monts Usambara',
        seoDescription:
          'Comparez hébergements et opérateurs à Tanga et dans les monts Usambara — la côte nord préservée de la Tanzanie.',
      },
      it: {
        name: 'Tanga',
        slug: 'tanga',
        summary: 'Un porto coloniale tranquillo, grotte coralline e le pendici degli Usambara.',
        description:
          'Tanga è la città costiera settentrionale della Tanzania, in gran parte ignorata dal turismo — e ne guadagna. Le grotte di Amboni sono il più grande sistema calcareo dell’Africa orientale, i monti Usambara si elevano a un’ora nell’entroterra con ottimi percorsi, e Pangani a sud offre spiagge deserte e gite in dhow senza i prezzi di Zanzibar.',
        travelTips:
          'Abbina Tanga agli Usambara invece di considerarla solo una tappa balneare: le montagne sono la vera attrattiva.',
        bestTime: 'Da giugno a ottobre e da gennaio a febbraio.',
        seoTitle: 'Tanga: hotel, tour ed escursioni sugli Usambara',
        seoDescription:
          'Confronta alloggi e operatori a Tanga e sui monti Usambara — la costa settentrionale non affollata della Tanzania.',
      },
    },
  },
];

export const categories = [
  {
    key: 'safaris',
    icon: 'Binoculars',
    sortOrder: 1,
    translations: {
      en: { name: 'Safaris & Tour Operators', nameSingular: 'safari operator', slug: 'safaris', summary: 'Game drives, fly-in camps and multi-day circuits.', comboHeading: 'Safari operators in {destination}' },
      de: { name: 'Safaris & Reiseveranstalter', nameSingular: 'Safari-Veranstalter', slug: 'safaris', summary: 'Pirschfahrten, Fly-in-Camps und mehrtägige Routen.', comboHeading: 'Safari-Veranstalter in {destination}' },
      fr: { name: 'Safaris et voyagistes', nameSingular: 'opérateur de safari', slug: 'safaris', summary: 'Safaris en 4x4, camps fly-in et circuits de plusieurs jours.', comboHeading: 'Opérateurs de safari à {destination}' },
      it: { name: 'Safari e tour operator', nameSingular: 'operatore safari', slug: 'safari', summary: 'Game drive, campi fly-in e circuiti di più giorni.', comboHeading: 'Operatori safari a {destination}' },
    },
  },
  {
    key: 'hotels',
    icon: 'BedDouble',
    sortOrder: 2,
    translations: {
      en: { name: 'Hotels & Accommodation', nameSingular: 'hotel', slug: 'hotels', summary: 'Lodges, tented camps, resorts and city hotels.', comboHeading: 'Hotels and lodges in {destination}' },
      de: { name: 'Hotels & Unterkünfte', nameSingular: 'Hotel', slug: 'hotels', summary: 'Lodges, Zeltcamps, Resorts und Stadthotels.', comboHeading: 'Hotels und Lodges in {destination}' },
      fr: { name: 'Hôtels et hébergements', nameSingular: 'hôtel', slug: 'hotels', summary: 'Lodges, camps de toile, resorts et hôtels de ville.', comboHeading: 'Hôtels et lodges à {destination}' },
      it: { name: 'Hotel e alloggi', nameSingular: 'hotel', slug: 'hotel', summary: 'Lodge, campi tendati, resort e hotel cittadini.', comboHeading: 'Hotel e lodge a {destination}' },
    },
  },
  {
    key: 'activities',
    icon: 'Mountain',
    sortOrder: 3,
    translations: {
      en: { name: 'Activities & Experiences', nameSingular: 'activity provider', slug: 'activities', summary: 'Trekking, diving, cultural visits and day tours.', comboHeading: 'Things to do in {destination}' },
      de: { name: 'Aktivitäten & Erlebnisse', nameSingular: 'Anbieter', slug: 'aktivitaeten', summary: 'Trekking, Tauchen, Kulturbesuche und Tagestouren.', comboHeading: 'Aktivitäten in {destination}' },
      fr: { name: 'Activités et expériences', nameSingular: 'prestataire', slug: 'activites', summary: 'Trek, plongée, visites culturelles et excursions.', comboHeading: 'Que faire à {destination}' },
      it: { name: 'Attività ed esperienze', nameSingular: 'operatore', slug: 'attivita', summary: 'Trekking, immersioni, visite culturali ed escursioni.', comboHeading: 'Cosa fare a {destination}' },
    },
  },
  {
    key: 'car-rental',
    icon: 'Car',
    sortOrder: 4,
    translations: {
      en: { name: 'Car Rental & Transport', nameSingular: 'transport provider', slug: 'car-rental', summary: 'Self-drive, 4x4 hire, transfers and private drivers.', comboHeading: 'Car rental and transport in {destination}' },
      de: { name: 'Mietwagen & Transport', nameSingular: 'Transportanbieter', slug: 'mietwagen', summary: 'Selbstfahrer, 4x4-Miete, Transfers und private Fahrer.', comboHeading: 'Mietwagen und Transport in {destination}' },
      fr: { name: 'Location de voiture et transport', nameSingular: 'transporteur', slug: 'location-de-voiture', summary: 'Location 4x4, transferts et chauffeurs privés.', comboHeading: 'Location de voiture et transport à {destination}' },
      it: { name: 'Noleggio auto e trasporti', nameSingular: 'operatore di trasporto', slug: 'noleggio-auto', summary: 'Noleggio 4x4, transfer e autisti privati.', comboHeading: 'Noleggio auto e trasporti a {destination}' },
    },
  },
  {
    key: 'tour-guides',
    icon: 'Compass',
    sortOrder: 5,
    translations: {
      en: { name: 'Tour Guides', nameSingular: 'guide', slug: 'tour-guides', summary: 'Licensed independent guides, by language and speciality.', comboHeading: 'Tour guides in {destination}' },
      de: { name: 'Reiseleiter', nameSingular: 'Reiseleiter', slug: 'reiseleiter', summary: 'Lizenzierte unabhängige Guides nach Sprache und Fachgebiet.', comboHeading: 'Reiseleiter in {destination}' },
      fr: { name: 'Guides touristiques', nameSingular: 'guide', slug: 'guides-touristiques', summary: 'Guides indépendants agréés, par langue et spécialité.', comboHeading: 'Guides touristiques à {destination}' },
      it: { name: 'Guide turistiche', nameSingular: 'guida', slug: 'guide-turistiche', summary: 'Guide indipendenti autorizzate, per lingua e specialità.', comboHeading: 'Guide turistiche a {destination}' },
    },
  },
  {
    key: 'restaurants',
    icon: 'UtensilsCrossed',
    sortOrder: 6,
    translations: {
      en: { name: 'Restaurants & Food Experiences', nameSingular: 'restaurant', slug: 'restaurants', summary: 'Swahili cooking, seafood, street food tours.', comboHeading: 'Where to eat in {destination}' },
      de: { name: 'Restaurants & Kulinarik', nameSingular: 'Restaurant', slug: 'restaurants', summary: 'Suaheli-Küche, Meeresfrüchte, Street-Food-Touren.', comboHeading: 'Essen und Trinken in {destination}' },
      fr: { name: 'Restaurants et expériences culinaires', nameSingular: 'restaurant', slug: 'restaurants', summary: 'Cuisine swahilie, fruits de mer, tours de street food.', comboHeading: 'Où manger à {destination}' },
      it: { name: 'Ristoranti ed esperienze gastronomiche', nameSingular: 'ristorante', slug: 'ristoranti', summary: 'Cucina swahili, pesce, tour di street food.', comboHeading: 'Dove mangiare a {destination}' },
    },
  },
];

/**
 * Month-by-month conditions. The Serengeti rows encode the Great Migration
 * calendar, which is the single most searched planning question in this niche
 * and the reason the seasonality widget earns its place.
 */
export const seasonality = {
  serengeti: [
    { month: 1, wildlife: 5, weather: 4, crowd: 3, rainfall: 60, tempMin: 15, tempMax: 28, peak: false, highlightKey: 'calving', highlight: { en: 'Calving season begins', de: 'Beginn der Kalbungszeit', fr: 'Début de la mise bas', it: 'Inizio della stagione dei parti' } },
    { month: 2, wildlife: 5, weather: 4, crowd: 4, rainfall: 55, tempMin: 15, tempMax: 28, peak: true, highlightKey: 'calving', highlight: { en: 'Peak calving — predator action at its best', de: 'Höhepunkt der Kalbung — beste Raubtierbeobachtung', fr: 'Pic de mise bas — prédateurs très actifs', it: 'Picco dei parti — massima attività dei predatori' } },
    { month: 3, wildlife: 4, weather: 3, crowd: 2, rainfall: 110, tempMin: 15, tempMax: 27, peak: false, highlightKey: null, highlight: { en: 'Herds start moving north-west', de: 'Herden ziehen nach Nordwesten', fr: 'Les troupeaux partent vers le nord-ouest', it: 'Le mandrie si spostano a nord-ovest' } },
    { month: 4, wildlife: 3, weather: 2, crowd: 1, rainfall: 200, tempMin: 15, tempMax: 26, peak: false, highlightKey: 'long_rains', highlight: { en: 'Long rains — lowest prices', de: 'Große Regenzeit — niedrigste Preise', fr: 'Grandes pluies — prix les plus bas', it: 'Grandi piogge — prezzi più bassi' } },
    { month: 5, wildlife: 3, weather: 2, crowd: 1, rainfall: 150, tempMin: 14, tempMax: 26, peak: false, highlightKey: 'long_rains', highlight: { en: 'Rains ease; grass is high', de: 'Regen lässt nach, hohes Gras', fr: 'Les pluies faiblissent, herbe haute', it: 'Le piogge diminuiscono, erba alta' } },
    { month: 6, wildlife: 4, weather: 5, crowd: 3, rainfall: 30, tempMin: 13, tempMax: 26, peak: false, highlightKey: 'rut', highlight: { en: 'Rutting season in the Western Corridor', de: 'Brunftzeit im westlichen Korridor', fr: 'Saison du rut dans le couloir ouest', it: 'Stagione degli accoppiamenti nel corridoio occidentale' } },
    { month: 7, wildlife: 5, weather: 5, crowd: 5, rainfall: 10, tempMin: 13, tempMax: 25, peak: true, highlightKey: 'river_crossing', highlight: { en: 'Grumeti and Mara river crossings begin', de: 'Flussdurchquerungen am Grumeti und Mara beginnen', fr: 'Début des traversées du Grumeti et de la Mara', it: 'Iniziano gli attraversamenti di Grumeti e Mara' } },
    { month: 8, wildlife: 5, weather: 5, crowd: 5, rainfall: 10, tempMin: 13, tempMax: 25, peak: true, highlightKey: 'river_crossing', highlight: { en: 'Peak Mara River crossings', de: 'Höhepunkt der Mara-Flussdurchquerungen', fr: 'Pic des traversées de la Mara', it: 'Picco degli attraversamenti del Mara' } },
    { month: 9, wildlife: 5, weather: 5, crowd: 4, rainfall: 15, tempMin: 14, tempMax: 27, peak: true, highlightKey: 'river_crossing', highlight: { en: 'Crossings continue in the north', de: 'Durchquerungen im Norden dauern an', fr: 'Les traversées continuent au nord', it: 'Gli attraversamenti continuano a nord' } },
    { month: 10, wildlife: 4, weather: 4, crowd: 3, rainfall: 40, tempMin: 15, tempMax: 28, peak: false, highlightKey: null, highlight: { en: 'Herds begin the return south', de: 'Herden beginnen die Rückkehr nach Süden', fr: 'Les troupeaux amorcent le retour au sud', it: 'Le mandrie iniziano il ritorno a sud' } },
    { month: 11, wildlife: 4, weather: 3, crowd: 2, rainfall: 105, tempMin: 15, tempMax: 27, peak: false, highlightKey: 'short_rains', highlight: { en: 'Short rains; green landscapes', de: 'Kurze Regenzeit, grüne Landschaft', fr: 'Petites pluies, paysages verts', it: 'Piogge brevi, paesaggi verdi' } },
    { month: 12, wildlife: 5, weather: 4, crowd: 4, rainfall: 90, tempMin: 15, tempMax: 28, peak: false, highlightKey: null, highlight: { en: 'Herds back on the southern plains', de: 'Herden zurück in den südlichen Ebenen', fr: 'Troupeaux de retour dans les plaines du sud', it: 'Mandrie di nuovo nelle pianure meridionali' } },
  ],
};
