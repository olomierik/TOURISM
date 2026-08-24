/**
 * Rwanda's destinations.
 *
 * Rwanda was one of the four curated countries from the day the taxonomy went in
 * and had no destinations at all, which left the gorilla guide pointing at
 * Uganda's parks and nowhere in Rwanda — a guide comparing two countries with
 * only one of them on the site.
 *
 * Volcanoes leads because it is the reason Rwanda matters to this audience. The
 * other three are here so the country is not a single-entry listing: a directory
 * that covers exactly one place in a country tells a reader it does not really
 * cover that country.
 *
 * Seasonality is supplied for Volcanoes only. The month-by-month widget is worth
 * having where the answer genuinely changes by month — trekking conditions swing
 * hard between the dry and wet seasons — and is noise where it does not.
 */

export const rwandaDestinations = [
  {
    key: 'volcanoes-national-park',
    region: 'Northern Province',
    latitude: -1.4833,
    longitude: 29.5333,
    featured: true,
    sortOrder: 53,
    translations: {
      en: {
        name: 'Volcanoes National Park',
        slug: 'volcanoes-national-park',
        summary: 'Rwanda’s mountain gorillas, on the forested slopes of the Virunga volcanoes.',
        description:
          'Volcanoes National Park covers the Rwandan flank of the Virunga range, five extinct volcanoes rising above bamboo forest on the border with Uganda and the DRC. It is the park Dian Fossey worked in, and it remains the most straightforward place in the world to see mountain gorillas: Kigali is two to three hours away on good tarmac, which makes a gorilla trek feasible in a long weekend.\n\nTwelve habituated gorilla families are open to visitors, eight people per family per day. A permit costs US$1,500 for a foreign non-resident in 2026 — the highest anywhere, and a deliberate choice by Rwanda to keep visitor numbers low. Golden monkey tracking, the hike to Dian Fossey’s tomb and the climb up Mount Bisoke are all available at a fraction of that.\n\nThe trek itself is demanding rather than technical: steep, wet ground between 2,500 m and 3,000 m, and anywhere from half an hour to six hours of walking each way before you find the family.',
        bestTime:
          'June to September and December to February are the dry seasons and by far the easier walking — they are also when permits sell out first, often six months ahead. March to May is the long rains: the forest is at its most striking, the trails are hard work, and there is more availability.',
        travelTips:
          'Book the permit before anything else; everything in the trip arranges itself around the date you are allocated. Hire a porter at around US$20 — it is money going straight into the villages at the park edge, and the help on wet ground is worth it regardless. Bring gaiters, gloves and a waterproof: bamboo forest is wet even in the dry season. Trekking is not permitted for anyone under 15 or visibly unwell, and that second rule is enforced — gorillas catch human respiratory infections.',
      },
      de: {
        name: 'Vulkan-Nationalpark',
        slug: 'vulkan-nationalpark',
        summary: 'Ruandas Berggorillas an den bewaldeten Hängen der Virunga-Vulkane.',
        description:
          'Der Vulkan-Nationalpark umfasst die ruandische Flanke der Virunga-Kette: fünf erloschene Vulkane, die sich über Bambuswald an der Grenze zu Uganda und der DR Kongo erheben. Hier arbeitete Dian Fossey, und es ist bis heute der unkomplizierteste Ort der Welt, um Berggorillas zu sehen — Kigali liegt zwei bis drei Stunden entfernt auf guter Straße, sodass ein Gorilla-Trekking an einem langen Wochenende möglich ist.\n\nZwölf an Menschen gewöhnte Gorillafamilien stehen Besuchern offen, acht Personen pro Familie und Tag. Eine Genehmigung kostet Nicht-Ansässige 2026 1.500 US$ — der höchste Satz weltweit und eine bewusste Entscheidung Ruandas, die Besucherzahlen niedrig zu halten. Goldmeerkatzen-Tracking, die Wanderung zu Dian Fosseys Grab und der Aufstieg auf den Mount Bisoke kosten einen Bruchteil davon.\n\nDas Trekking ist fordernd, aber nicht technisch: steiles, nasses Gelände zwischen 2.500 m und 3.000 m und zwischen einer halben und sechs Stunden Fußweg je Richtung.',
        bestTime:
          'Juni bis September und Dezember bis Februar sind die Trockenzeiten und deutlich einfacher zu gehen — dann sind die Genehmigungen aber auch zuerst ausgebucht, oft ein halbes Jahr im Voraus. März bis Mai ist die große Regenzeit: der Wald ist am eindrucksvollsten, die Pfade sind Mühe, und es gibt mehr Verfügbarkeit.',
        travelTips:
          'Buchen Sie zuerst die Genehmigung; alles andere ordnet sich um das zugeteilte Datum. Nehmen Sie einen Träger für rund 20 US$ — das Geld fließt direkt in die Dörfer am Parkrand, und die Hilfe auf nassem Boden lohnt sich ohnehin. Gamaschen, Handschuhe und Regenkleidung mitnehmen: Bambuswald ist auch in der Trockenzeit feucht. Unter 15 Jahren und bei sichtbarer Erkrankung ist das Trekking nicht erlaubt — und diese zweite Regel wird durchgesetzt, denn Gorillas stecken sich mit menschlichen Atemwegsinfekten an.',
      },
      fr: {
        name: 'Parc national des Volcans',
        slug: 'parc-national-des-volcans',
        summary: 'Les gorilles de montagne du Rwanda, sur les pentes boisées des volcans Virunga.',
        description:
          'Le parc national des Volcans couvre le flanc rwandais de la chaîne des Virunga : cinq volcans éteints dominant une forêt de bambous, à la frontière de l’Ouganda et de la RDC. C’est le parc où travaillait Dian Fossey, et il reste l’endroit le plus simple au monde pour voir des gorilles de montagne : Kigali est à deux ou trois heures sur bon bitume, ce qui rend le trek possible en un long week-end.\n\nDouze familles habituées sont ouvertes aux visiteurs, huit personnes par famille et par jour. Le permis coûte 1 500 US$ pour un non-résident en 2026 — le plus cher au monde, et un choix délibéré du Rwanda pour limiter la fréquentation. Le pistage des singes dorés, la marche jusqu’à la tombe de Dian Fossey et l’ascension du mont Bisoke coûtent une fraction de ce prix.\n\nLe trek est exigeant sans être technique : terrain raide et mouillé entre 2 500 m et 3 000 m, et de trente minutes à six heures de marche dans chaque sens.',
        bestTime:
          'De juin à septembre et de décembre à février, les saisons sèches rendent la marche bien plus facile — ce sont aussi les périodes où les permis partent en premier, souvent six mois à l’avance. De mars à mai, la grande saison des pluies : la forêt est à son plus saisissant, les sentiers sont pénibles, et il reste de la disponibilité.',
        travelTips:
          'Réservez le permis avant tout le reste ; le voyage s’organise autour de la date attribuée. Prenez un porteur pour environ 20 US$ — cet argent va directement aux villages en lisière du parc, et l’aide sur terrain mouillé en vaut la peine de toute façon. Guêtres, gants et vêtement de pluie : la bambouseraie est humide même en saison sèche. Le trek est interdit aux moins de 15 ans et à toute personne visiblement malade — cette seconde règle est appliquée, les gorilles attrapant nos infections respiratoires.',
      },
      it: {
        name: 'Parco nazionale dei Vulcani',
        slug: 'parco-nazionale-dei-vulcani',
        summary: 'I gorilla di montagna del Ruanda, sui pendii boscosi dei vulcani Virunga.',
        description:
          'Il Parco nazionale dei Vulcani copre il versante ruandese della catena dei Virunga: cinque vulcani spenti che si alzano sopra la foresta di bambù, al confine con Uganda e RDC. È il parco in cui lavorò Dian Fossey, e resta il luogo più semplice al mondo per vedere i gorilla di montagna: Kigali dista due o tre ore su buon asfalto, il che rende il trekking possibile in un fine settimana lungo.\n\nDodici famiglie abituate sono aperte ai visitatori, otto persone per famiglia al giorno. Il permesso costa 1.500 US$ per un non residente nel 2026 — il più caro al mondo, e una scelta deliberata del Ruanda per tenere bassi i numeri. Il tracking delle scimmie dorate, la camminata alla tomba di Dian Fossey e la salita al monte Bisoke costano una frazione di quella cifra.\n\nIl trekking è impegnativo ma non tecnico: terreno ripido e bagnato fra 2.500 m e 3.000 m, e da mezz’ora a sei ore di cammino per tratta.',
        bestTime:
          'Da giugno a settembre e da dicembre a febbraio le stagioni secche rendono il cammino molto più facile — ma sono anche i periodi in cui i permessi si esauriscono per primi, spesso con sei mesi di anticipo. Da marzo a maggio c’è la grande stagione delle piogge: la foresta è al suo massimo, i sentieri sono faticosi e la disponibilità è maggiore.',
        travelTips:
          'Prenotate il permesso prima di ogni altra cosa; il viaggio si organizza attorno alla data assegnata. Prendete un portatore per circa 20 US$ — quel denaro va direttamente ai villaggi ai margini del parco, e l’aiuto sul terreno bagnato vale comunque la spesa. Ghette, guanti e giacca impermeabile: la bambù è umida anche in stagione secca. Il trekking è vietato sotto i 15 anni e a chiunque sia visibilmente malato — questa seconda regola viene fatta rispettare, perché i gorilla contraggono le nostre infezioni respiratorie.',
      },
    },
    /**
     * Trekking conditions swing hard between the dry and wet seasons here, so
     * the month-by-month widget has something real to say. Wildlife is rated
     * flat: the gorilla families do not migrate and are found every day of the
     * year, which is itself worth showing rather than implying a season.
     */
    seasonality: [
      { month: 1, wildlife: 5, weather: 4, crowd: 4, rain: 80, min: 10, max: 21, peak: true },
      { month: 2, wildlife: 5, weather: 4, crowd: 4, rain: 90, min: 10, max: 22, peak: true },
      { month: 3, wildlife: 5, weather: 2, crowd: 2, rain: 160, min: 10, max: 21, peak: false },
      { month: 4, wildlife: 5, weather: 1, crowd: 1, rain: 200, min: 11, max: 20, peak: false },
      { month: 5, wildlife: 5, weather: 2, crowd: 2, rain: 160, min: 11, max: 20, peak: false },
      { month: 6, wildlife: 5, weather: 5, crowd: 4, rain: 25, min: 9, max: 21, peak: true },
      { month: 7, wildlife: 5, weather: 5, crowd: 5, rain: 15, min: 9, max: 22, peak: true },
      { month: 8, wildlife: 5, weather: 5, crowd: 5, rain: 40, min: 9, max: 22, peak: true },
      { month: 9, wildlife: 5, weather: 4, crowd: 4, rain: 90, min: 10, max: 22, peak: true },
      { month: 10, wildlife: 5, weather: 2, crowd: 2, rain: 180, min: 10, max: 21, peak: false },
      { month: 11, wildlife: 5, weather: 2, crowd: 2, rain: 190, min: 10, max: 20, peak: false },
      { month: 12, wildlife: 5, weather: 4, crowd: 4, rain: 110, min: 10, max: 21, peak: true },
    ],
  },

  {
    key: 'nyungwe-forest-national-park',
    region: 'Western Province',
    latitude: -2.4833,
    longitude: 29.2,
    featured: false,
    sortOrder: 54,
    translations: {
      en: {
        name: 'Nyungwe Forest National Park',
        slug: 'nyungwe-forest-national-park',
        summary: 'One of Africa’s oldest rainforests, and the easiest place to track chimpanzees in Rwanda.',
        description:
          'Nyungwe is a montane rainforest in Rwanda’s south-west that survived the last ice age, which is why it holds species found nowhere else in the region. Around 1,000 chimpanzees live here alongside twelve other primate species, including large troops of Angola colobus that can number several hundred.\n\nThe canopy walkway — a suspension bridge 70 m above the forest floor — is the park’s signature and the reason many visitors come. Chimpanzee tracking starts before dawn and is genuinely uncertain: the animals move fast and high, and a sighting is never promised.\n\nIt pairs naturally with Volcanoes rather than competing with it. Gorillas in the north, chimpanzees and forest birds in the south, and a drive between them that takes most of a day through terraced hills.',
        bestTime:
          'June to September is driest and the trails are firmest. Chimpanzee tracking is often better in the wet months, when fruiting draws the troops lower and closer to the trails — the trade-off is mud and leeches.',
        travelTips:
          'Chimpanzee permits are far cheaper than gorilla permits and rarely sell out, so this does not need booking a year ahead. Start times are early, around 05:00, which means staying nearby the night before rather than driving in. The canopy walkway is not for anyone uneasy with heights or movement — it sways. Waterproof boots with grip matter more here than anywhere else in Rwanda.',
      },
      de: {
        name: 'Nyungwe-Nationalpark',
        slug: 'nyungwe-nationalpark',
        summary: 'Einer der ältesten Regenwälder Afrikas und der einfachste Ort für Schimpansen in Ruanda.',
        description:
          'Nyungwe ist ein Bergregenwald im Südwesten Ruandas, der die letzte Eiszeit überdauert hat — deshalb leben hier Arten, die es sonst nirgends in der Region gibt. Rund 1.000 Schimpansen teilen ihn sich mit zwölf weiteren Primatenarten, darunter große Gruppen von Angola-Stummelaffen, die mehrere hundert Tiere zählen können.\n\nDer Kronenpfad — eine Hängebrücke 70 m über dem Waldboden — ist das Wahrzeichen des Parks. Das Schimpansen-Tracking beginnt vor Sonnenaufgang und ist wirklich ungewiss: Die Tiere sind schnell und hoch oben, eine Sichtung wird nie zugesagt.\n\nNyungwe ergänzt den Vulkan-Nationalpark, statt mit ihm zu konkurrieren: Gorillas im Norden, Schimpansen und Waldvögel im Süden.',
        bestTime:
          'Juni bis September ist am trockensten und die Pfade sind am festesten. Das Schimpansen-Tracking gelingt oft in den feuchten Monaten besser, wenn Fruchtreife die Gruppen tiefer und näher an die Wege zieht — der Preis dafür sind Schlamm und Blutegel.',
        travelTips:
          'Schimpansen-Genehmigungen sind weit günstiger als Gorilla-Genehmigungen und selten ausgebucht. Die Startzeiten liegen gegen 05:00 Uhr, man sollte also in der Nähe übernachten. Der Kronenpfad ist nichts für Höhenempfindliche — er schwankt. Wasserdichte Schuhe mit Profil sind hier wichtiger als sonst irgendwo in Ruanda.',
      },
      fr: {
        name: 'Parc national de Nyungwe',
        slug: 'parc-national-de-nyungwe',
        summary: 'L’une des plus vieilles forêts d’Afrique, et le meilleur endroit du Rwanda pour les chimpanzés.',
        description:
          'Nyungwe est une forêt tropicale de montagne du sud-ouest rwandais qui a survécu à la dernière glaciation, d’où la présence d’espèces introuvables ailleurs dans la région. Environ 1 000 chimpanzés y vivent aux côtés de douze autres espèces de primates, dont de grandes troupes de colobes d’Angola pouvant compter plusieurs centaines d’individus.\n\nLa passerelle de canopée — un pont suspendu à 70 m au-dessus du sol — est la signature du parc. Le pistage des chimpanzés commence avant l’aube et reste incertain : les animaux se déplacent vite et haut, et aucune observation n’est garantie.\n\nNyungwe complète le parc des Volcans plutôt qu’il ne le concurrence : gorilles au nord, chimpanzés et oiseaux forestiers au sud.',
        bestTime:
          'De juin à septembre, c’est le plus sec et les sentiers sont les plus fermes. Le pistage des chimpanzés est souvent meilleur en saison humide, quand la fructification fait descendre les troupes plus près des sentiers — au prix de la boue et des sangsues.',
        travelTips:
          'Les permis chimpanzés sont bien moins chers que les permis gorilles et rarement complets. Les départs sont vers 05h00, il vaut donc mieux dormir à proximité. La passerelle n’est pas pour ceux que la hauteur dérange — elle oscille. Des chaussures imperméables à bonne adhérence comptent ici plus que partout ailleurs au Rwanda.',
      },
      it: {
        name: 'Parco nazionale di Nyungwe',
        slug: 'parco-nazionale-di-nyungwe',
        summary: 'Una delle foreste più antiche d’Africa e il posto migliore in Ruanda per gli scimpanzé.',
        description:
          'Nyungwe è una foresta pluviale montana nel sud-ovest del Ruanda sopravvissuta all’ultima glaciazione: per questo ospita specie che non si trovano altrove nella regione. Circa 1.000 scimpanzé la condividono con altre dodici specie di primati, fra cui grandi gruppi di colobo dell’Angola che possono contare diverse centinaia di individui.\n\nLa passerella sulla canopia — un ponte sospeso a 70 m dal suolo — è il simbolo del parco. Il tracking degli scimpanzé inizia prima dell’alba ed è davvero incerto: gli animali si muovono veloci e in alto, e l’avvistamento non è mai garantito.\n\nNyungwe completa il Parco dei Vulcani invece di farvi concorrenza: gorilla a nord, scimpanzé e uccelli di foresta a sud.',
        bestTime:
          'Da giugno a settembre è il periodo più asciutto e i sentieri sono più solidi. Il tracking degli scimpanzé riesce spesso meglio nei mesi umidi, quando la fruttificazione porta i gruppi più in basso e vicino ai sentieri — al prezzo di fango e sanguisughe.',
        travelTips:
          'I permessi per gli scimpanzé costano molto meno di quelli per i gorilla e raramente si esauriscono. Le partenze sono verso le 05:00, quindi conviene dormire nelle vicinanze. La passerella non fa per chi soffre l’altezza — oscilla. Scarponi impermeabili con buona presa contano qui più che altrove in Ruanda.',
      },
    },
  },

  {
    key: 'akagera-national-park',
    region: 'Eastern Province',
    latitude: -1.6833,
    longitude: 30.7167,
    featured: false,
    sortOrder: 55,
    translations: {
      en: {
        name: 'Akagera National Park',
        slug: 'akagera-national-park',
        summary: 'Rwanda’s savannah park, and a Big Five reserve rebuilt from near-total loss.',
        description:
          'Akagera sits on the Tanzanian border and is the only savannah in Rwanda — lakes, papyrus swamp and rolling grassland, entirely unlike the forested volcanoes most visitors associate with the country.\n\nIts recent history is the reason to come. The park lost most of its large mammals in the years after 1994, and lions and black rhino were absent altogether. Both have been reintroduced since 2015, and Akagera is a Big Five reserve again. It is one of the more convincing conservation recoveries on the continent and is now largely self-financing through tourism.\n\nGame density is lower than in the Serengeti or the Mara, and it would be misleading to suggest otherwise. What it offers is a genuinely different landscape two and a half hours from Kigali, and boat trips on Lake Ihema with some of the densest hippo populations in East Africa.',
        bestTime:
          'June to September is the dry season: animals concentrate at water and the grass is short, which makes spotting far easier. The wet months are green and quiet, with better birding — over 480 species have been recorded.',
        travelTips:
          'Two and a half hours from Kigali on tarmac, so an overnight trip works. A boat trip on Lake Ihema is the thing not to skip. Self-driving is permitted and the tracks are manageable in a 2WD in the dry season, but a guide finds far more. Do not come expecting Serengeti density — come for the landscape, the birds and the story of the place.',
      },
      de: {
        name: 'Akagera-Nationalpark',
        slug: 'akagera-nationalpark',
        summary: 'Ruandas Savannenpark und ein Big-Five-Reservat, aus fast völligem Verlust wieder aufgebaut.',
        description:
          'Akagera liegt an der tansanischen Grenze und ist die einzige Savanne Ruandas — Seen, Papyrussumpf und wellige Graslandschaft, ganz anders als die bewaldeten Vulkane, die man mit dem Land verbindet.\n\nSeine jüngere Geschichte ist der Grund herzukommen. Der Park verlor nach 1994 die meisten seiner Großsäuger; Löwen und Spitzmaulnashorn fehlten ganz. Beide wurden seit 2015 wieder angesiedelt, und Akagera ist erneut ein Big-Five-Reservat — eine der überzeugendsten Erholungsgeschichten des Kontinents, die sich heute weitgehend selbst trägt.\n\nDie Wilddichte ist geringer als in der Serengeti oder der Mara, und alles andere zu behaupten wäre irreführend. Geboten wird eine wirklich andere Landschaft zweieinhalb Stunden von Kigali und Bootsfahrten auf dem Ihema-See mit einer der dichtesten Flusspferdpopulationen Ostafrikas.',
        bestTime:
          'Juni bis September ist Trockenzeit: Die Tiere sammeln sich am Wasser und das Gras ist kurz, was das Aufspüren deutlich erleichtert. Die feuchten Monate sind grün und ruhig, mit besserer Vogelbeobachtung — über 480 Arten sind belegt.',
        travelTips:
          'Zweieinhalb Stunden von Kigali auf Asphalt, eine Übernachtungsreise genügt. Die Bootsfahrt auf dem Ihema-See sollte man nicht auslassen. Selbstfahren ist erlaubt und die Pisten sind in der Trockenzeit auch mit Zweiradantrieb machbar, ein Guide findet aber weit mehr. Erwarten Sie keine Serengeti-Dichte — kommen Sie für die Landschaft, die Vögel und die Geschichte des Ortes.',
      },
      fr: {
        name: 'Parc national de l’Akagera',
        slug: 'parc-national-de-l-akagera',
        summary: 'La savane du Rwanda, et une réserve Big Five reconstruite après une perte quasi totale.',
        description:
          'L’Akagera borde la Tanzanie et constitue la seule savane du Rwanda — lacs, marais à papyrus et prairies vallonnées, tout autre chose que les volcans boisés auxquels on associe le pays.\n\nSon histoire récente est la raison d’y aller. Le parc a perdu l’essentiel de ses grands mammifères après 1994, et lions comme rhinocéros noirs en avaient totalement disparu. Les deux ont été réintroduits depuis 2015, et l’Akagera est de nouveau une réserve Big Five — l’un des redressements de conservation les plus convaincants du continent, aujourd’hui largement autofinancé.\n\nLa densité animale y est plus faible qu’au Serengeti ou au Mara, et prétendre le contraire serait trompeur. Ce qu’il offre, c’est un paysage vraiment différent à deux heures et demie de Kigali, et des sorties en bateau sur le lac Ihema.',
        bestTime:
          'De juin à septembre, la saison sèche : les animaux se concentrent aux points d’eau et l’herbe est rase, ce qui facilite beaucoup l’observation. Les mois humides sont verts et calmes, avec une meilleure ornithologie — plus de 480 espèces recensées.',
        travelTips:
          'Deux heures et demie de Kigali sur bitume : un aller-retour avec une nuit suffit. La sortie en bateau sur le lac Ihema est à ne pas manquer. L’autoconduite est autorisée et les pistes passent en deux roues motrices en saison sèche, mais un guide trouve bien davantage. N’attendez pas une densité de type Serengeti — venez pour le paysage, les oiseaux et l’histoire du lieu.',
      },
      it: {
        name: 'Parco nazionale di Akagera',
        slug: 'parco-nazionale-di-akagera',
        summary: 'La savana del Ruanda, e una riserva Big Five ricostruita da una perdita quasi totale.',
        description:
          'Akagera confina con la Tanzania ed è l’unica savana del Ruanda — laghi, paludi di papiro e prateria ondulata, tutt’altra cosa rispetto ai vulcani boscosi che si associano al paese.\n\nLa sua storia recente è il motivo per andarci. Il parco perse gran parte dei grandi mammiferi dopo il 1994, e leoni e rinoceronti neri sparirono del tutto. Entrambi sono stati reintrodotti dal 2015 e Akagera è di nuovo una riserva Big Five — uno dei recuperi di conservazione più convincenti del continente, oggi in larga parte autofinanziato.\n\nLa densità di fauna è inferiore a quella del Serengeti o del Mara, e sostenere il contrario sarebbe fuorviante. Offre però un paesaggio davvero diverso a due ore e mezza da Kigali e gite in barca sul lago Ihema.',
        bestTime:
          'Da giugno a settembre è stagione secca: gli animali si concentrano all’acqua e l’erba è bassa, il che rende molto più facile avvistarli. I mesi umidi sono verdi e tranquilli, con birdwatching migliore — oltre 480 specie registrate.',
        travelTips:
          'Due ore e mezza da Kigali su asfalto: basta un viaggio con un pernottamento. La gita in barca sul lago Ihema è da non saltare. La guida autonoma è consentita e le piste sono percorribili anche a due ruote motrici in stagione secca, ma una guida trova molto di più. Non aspettatevi densità da Serengeti — venite per il paesaggio, gli uccelli e la storia del posto.',
      },
    },
  },

  {
    key: 'kigali',
    region: 'Kigali',
    latitude: -1.9441,
    longitude: 30.0619,
    featured: false,
    sortOrder: 56,
    translations: {
      en: {
        name: 'Kigali',
        slug: 'kigali',
        summary: 'Rwanda’s capital and the arrival point for every trip into the country.',
        description:
          'Almost every visit to Rwanda begins and ends in Kigali. The airport sits fifteen minutes from the centre, the roads out to Volcanoes and Akagera are good, and most itineraries spend at least one night here at either end.\n\nIt is worth more than a transit stop. The Kigali Genocide Memorial is the single most important place to visit in the country and the context for everything else a traveller will see; most people find half a day is the right amount of time. Beyond it, the city has a serious coffee culture, a growing restaurant scene and craft markets in Nyamirambo.\n\nKigali is also unusually easy to move around. It is widely considered among the cleanest and safest capitals in Africa, and walking in the central districts is normal in a way it is not in most cities of comparable size.',
        bestTime:
          'Year-round. Kigali sits at 1,567 m, so it stays mild — rarely above 27 °C or below 15 °C. The long rains from March to May bring afternoon downpours that pass quickly rather than settling in.',
        travelTips:
          'Allow half a day for the Genocide Memorial and do not schedule anything demanding straight afterwards. Plastic bags are banned nationwide and confiscated at the airport, so repack before you fly. Moto-taxis are the fastest way across town and metered through apps; helmets are provided and required. Most visitors need a visa, available on arrival for many nationalities — check yours before travelling.',
      },
      de: {
        name: 'Kigali',
        slug: 'kigali',
        summary: 'Ruandas Hauptstadt und Ankunftspunkt jeder Reise ins Land.',
        description:
          'Fast jeder Besuch in Ruanda beginnt und endet in Kigali. Der Flughafen liegt fünfzehn Minuten vom Zentrum entfernt, die Straßen zum Vulkan-Nationalpark und nach Akagera sind gut, und die meisten Reisen verbringen hier mindestens eine Nacht.\n\nDie Stadt ist mehr als ein Transitstopp. Die Genozid-Gedenkstätte Kigali ist der wichtigste Ort des Landes und der Kontext für alles Weitere; ein halber Tag ist für die meisten das richtige Maß. Darüber hinaus gibt es eine ernsthafte Kaffeekultur, eine wachsende Restaurantszene und Kunsthandwerksmärkte in Nyamirambo.\n\nKigali lässt sich zudem ungewöhnlich leicht erkunden und gilt weithin als eine der saubersten und sichersten Hauptstädte Afrikas.',
        bestTime:
          'Ganzjährig. Kigali liegt auf 1.567 m und bleibt mild — selten über 27 °C oder unter 15 °C. Die große Regenzeit von März bis Mai bringt Nachmittagsgüsse, die rasch vorüberziehen.',
        travelTips:
          'Planen Sie einen halben Tag für die Gedenkstätte ein und danach nichts Anspruchsvolles. Plastiktüten sind landesweit verboten und werden am Flughafen einbehalten — vorher umpacken. Moto-Taxis sind der schnellste Weg durch die Stadt und per App abrechenbar; Helme werden gestellt und sind Pflicht. Die meisten Besucher brauchen ein Visum, für viele Nationalitäten bei Ankunft erhältlich — vorab prüfen.',
      },
      fr: {
        name: 'Kigali',
        slug: 'kigali',
        summary: 'La capitale du Rwanda et le point d’arrivée de tout voyage dans le pays.',
        description:
          'Presque toute visite au Rwanda commence et se termine à Kigali. L’aéroport est à quinze minutes du centre, les routes vers les Volcans et l’Akagera sont bonnes, et la plupart des itinéraires y passent au moins une nuit.\n\nLa ville vaut mieux qu’une simple escale. Le Mémorial du génocide est le lieu le plus important du pays et le contexte de tout ce qu’un voyageur verra ensuite ; une demi-journée est la bonne durée pour la plupart. Au-delà, Kigali a une véritable culture du café, une scène culinaire en plein essor et des marchés d’artisanat à Nyamirambo.\n\nElle est aussi remarquablement facile à parcourir, et considérée parmi les capitales les plus propres et les plus sûres d’Afrique.',
        bestTime:
          'Toute l’année. Kigali est à 1 567 m et reste douce — rarement au-dessus de 27 °C ni en dessous de 15 °C. La grande saison des pluies, de mars à mai, apporte des averses d’après-midi qui passent vite.',
        travelTips:
          'Comptez une demi-journée pour le Mémorial et ne prévoyez rien d’exigeant juste après. Les sacs plastique sont interdits dans tout le pays et confisqués à l’aéroport : refaites vos bagages avant de partir. Les moto-taxis sont le moyen le plus rapide et se commandent via des applications ; le casque est fourni et obligatoire. La plupart des visiteurs ont besoin d’un visa, délivré à l’arrivée pour de nombreuses nationalités — vérifiez la vôtre.',
      },
      it: {
        name: 'Kigali',
        slug: 'kigali',
        summary: 'La capitale del Ruanda e il punto di arrivo di ogni viaggio nel paese.',
        description:
          'Quasi ogni visita in Ruanda comincia e finisce a Kigali. L’aeroporto dista quindici minuti dal centro, le strade verso i Vulcani e Akagera sono buone, e la maggior parte degli itinerari vi passa almeno una notte.\n\nLa città vale più di una sosta di transito. Il Memoriale del genocidio è il luogo più importante del paese e il contesto di tutto ciò che un viaggiatore vedrà dopo; mezza giornata è la durata giusta per la maggior parte delle persone. Oltre a questo, Kigali ha una seria cultura del caffè, una scena gastronomica in crescita e mercati artigianali a Nyamirambo.\n\nÈ anche insolitamente facile da girare, ed è considerata fra le capitali più pulite e sicure d’Africa.',
        bestTime:
          'Tutto l’anno. Kigali sta a 1.567 m e resta mite — raramente sopra i 27 °C o sotto i 15 °C. La grande stagione delle piogge, da marzo a maggio, porta acquazzoni pomeridiani che passano in fretta.',
        travelTips:
          'Prevedete mezza giornata per il Memoriale e non programmate nulla di impegnativo subito dopo. I sacchetti di plastica sono vietati in tutto il paese e vengono ritirati in aeroporto: rifate i bagagli prima di partire. I moto-taxi sono il modo più rapido di attraversare la città e si prenotano via app; il casco è fornito e obbligatorio. Quasi tutti i visitatori hanno bisogno del visto, rilasciato all’arrivo per molte nazionalità — verificate il vostro.',
      },
    },
  },
];
