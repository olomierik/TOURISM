/**
 * Per-destination seasonality, January first in every array.
 *
 * `wildlife: null` where the question does not apply — Kigali, Kampala, Dar es
 * Salaam and the mountains are not places you go to count animals, and inventing
 * a game-viewing score for a capital city would be filling a column rather than
 * answering anything. The renderer shows a dash.
 *
 * `peak` lists the months priced as high season. It is not the same as "best":
 * Bwindi's gorillas are there in April, they are simply harder to walk to and
 * cheaper to visit, which is exactly the trade-off a reader wants stated.
 *
 * `highlights` override the profile default for months where the destination has
 * something specific to say — a migration, a breeding season, a climbing window.
 * Everything else inherits the regional default so no month is left blank.
 */

/** Highlights in four locales. `key` also lands in highlight_key for querying. */
const H = (key, en, de, fr, it) => ({ key, en, de, fr, it });

export const DESTINATIONS = {
  // ---------------------------------------------------------------- Tanzania
  serengeti: {
    profile: 'tz-north',
    temp: [15, 28],
    wildlife: [5, 5, 4, 3, 3, 4, 5, 5, 5, 4, 4, 5],
    crowd: [3, 4, 2, 1, 1, 3, 5, 5, 4, 3, 2, 4],
    peak: [2, 7, 8, 9],
    highlights: {
      1: H('calving', 'Calving season begins on the southern plains.',
           'Beginn der Kalbungszeit in den südlichen Ebenen.',
           'Début de la saison des naissances dans les plaines du sud.',
           'Inizio delle nascite nelle pianure meridionali.'),
      2: H('calving', 'Peak calving — predator action at its best.',
           'Höhepunkt der Kalbung — beste Raubtierbeobachtung.',
           'Pic des naissances — les prédateurs à l’œuvre.',
           'Picco delle nascite — predatori all’opera.'),
      4: H('long_rains', 'Long rains — lowest prices.',
           'Große Regenzeit — niedrigste Preise.',
           'Grande saison des pluies — tarifs les plus bas.',
           'Grandi piogge — prezzi più bassi.'),
      5: H('long_rains', 'Rains ease late in the month; the herds move north.',
           'Regen lässt zum Monatsende nach; die Herden ziehen nach Norden.',
           'Les pluies faiblissent en fin de mois ; les troupeaux montent vers le nord.',
           'Le piogge calano a fine mese; le mandrie risalgono a nord.'),
      6: H('rut', 'The rut, and the first Grumeti crossings.',
           'Brunft, und die ersten Grumeti-Durchquerungen.',
           'Le rut, et les premières traversées de la Grumeti.',
           'La stagione degli accoppiamenti e i primi guadi del Grumeti.'),
      7: H('river_crossing', 'Grumeti and Mara river crossings begin.',
           'Flussdurchquerungen am Grumeti und Mara beginnen.',
           'Les traversées de la Grumeti et de la Mara commencent.',
           'Iniziano i guadi dei fiumi Grumeti e Mara.'),
      8: H('river_crossing', 'Mara crossings in the north — book far ahead.',
           'Mara-Durchquerungen im Norden — früh buchen.',
           'Traversées de la Mara au nord — réservez très tôt.',
           'Guadi della Mara a nord — prenotate con largo anticipo.'),
      9: H('river_crossing', 'Crossings continue; the far north is the place to be.',
           'Durchquerungen dauern an; der äußerste Norden ist der Ort.',
           'Les traversées continuent ; l’extrême nord est l’endroit.',
           'I guadi continuano; l’estremo nord è il posto giusto.'),
      11: H('short_rains', 'Short rains; the herds start back south.',
            'Kurze Regenzeit; die Herden ziehen zurück nach Süden.',
            'Petites pluies ; les troupeaux redescendent vers le sud.',
            'Piccole piogge; le mandrie tornano a sud.'),
    },
  },

  ngorongoro: {
    profile: 'tz-north',
    temp: [9, 22],
    wildlife: [5, 5, 4, 4, 4, 5, 5, 5, 5, 5, 4, 5],
    crowd: [3, 4, 2, 2, 2, 4, 5, 5, 4, 3, 2, 4],
    peak: [2, 7, 8, 9],
    highlights: {
      1: H('resident', 'The crater holds its game year-round — no season to miss.',
           'Der Krater beherbergt seine Tiere ganzjährig — keine Saison zu verpassen.',
           'Le cratère garde sa faune toute l’année — aucune saison à manquer.',
           'Il cratere ospita la fauna tutto l’anno — nessuna stagione da perdere.'),
      6: H('resident', 'Cold, clear mornings on the rim; excellent visibility below.',
           'Kalte, klare Morgen am Kraterrand; ausgezeichnete Sicht unten.',
           'Matins froids et clairs sur le rebord ; excellente visibilité en bas.',
           'Mattine fredde e limpide sul bordo; visibilità eccellente sul fondo.'),
    },
  },

  'tarangire-national-park': {
    profile: 'tz-north',
    temp: [16, 30],
    wildlife: [2, 2, 2, 2, 3, 4, 5, 5, 5, 4, 3, 2],
    crowd: [2, 2, 1, 1, 1, 3, 4, 4, 4, 3, 2, 2],
    peak: [7, 8, 9],
    highlights: {
      7: H('elephants', 'Elephant herds concentrate along the Tarangire River.',
           'Elefantenherden sammeln sich am Tarangire-Fluss.',
           'Les troupeaux d’éléphants se concentrent le long de la Tarangire.',
           'I branchi di elefanti si concentrano lungo il fiume Tarangire.'),
      8: H('elephants', 'The river is the only water for miles — and it shows.',
           'Der Fluss ist weit und breit das einzige Wasser — das merkt man.',
           'La rivière est le seul point d’eau à des kilomètres — cela se voit.',
           'Il fiume è l’unica acqua per chilometri — e si vede.'),
      2: H('quiet', 'Green, empty and cheap; game is dispersed.',
           'Grün, leer und günstig; die Tiere sind verteilt.',
           'Vert, vide et bon marché ; la faune est dispersée.',
           'Verde, vuoto ed economico; la fauna è dispersa.'),
    },
  },

  'lake-manyara-national-park': {
    profile: 'tz-north',
    temp: [17, 30],
    wildlife: [3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 3, 3],
    crowd: [2, 3, 2, 1, 1, 3, 4, 4, 3, 2, 2, 3],
    peak: [7, 8],
    highlights: {
      12: H('birding', 'Migrant birds arrive; flamingo numbers build on the lake.',
            'Zugvögel treffen ein; die Flamingozahlen am See steigen.',
            'Les oiseaux migrateurs arrivent ; les flamants affluent sur le lac.',
            'Arrivano gli uccelli migratori; crescono i fenicotteri sul lago.'),
    },
  },

  arusha: {
    profile: 'tz-north',
    temp: [14, 27],
    wildlife: null,
    crowd: [3, 3, 2, 2, 2, 4, 5, 5, 4, 3, 2, 3],
    peak: [7, 8],
    highlights: {
      7: H('gateway', 'Safari season — book vehicles and guides well ahead.',
           'Safarisaison — Fahrzeuge und Guides früh buchen.',
           'Pleine saison — réservez véhicules et guides à l’avance.',
           'Alta stagione — prenotate mezzi e guide per tempo.'),
    },
  },

  kilimanjaro: {
    profile: 'tz-north',
    temp: [8, 23],
    wildlife: null,
    crowd: [4, 4, 2, 1, 1, 3, 5, 5, 4, 3, 2, 4],
    peak: [1, 2, 7, 8, 9],
    highlights: {
      1: H('climbing', 'Prime climbing window — clear, cold, and busy.',
           'Bestes Aufstiegsfenster — klar, kalt und voll.',
           'Meilleure fenêtre d’ascension — clair, froid et fréquenté.',
           'Finestra migliore per la salita — limpido, freddo e affollato.'),
      2: H('climbing', 'Warmest of the good months; excellent summit visibility.',
           'Wärmster der guten Monate; ausgezeichnete Gipfelsicht.',
           'Le plus doux des bons mois ; excellente visibilité au sommet.',
           'Il più mite dei mesi buoni; ottima visibilità in vetta.'),
      4: H('avoid', 'Wettest month on the mountain — most operators advise against it.',
           'Nassester Monat am Berg — die meisten Veranstalter raten ab.',
           'Mois le plus humide sur la montagne — déconseillé par la plupart.',
           'Mese più piovoso sulla montagna — sconsigliato dalla maggior parte.'),
      8: H('climbing', 'The second climbing season, and the busiest.',
           'Die zweite Aufstiegssaison, und die vollste.',
           'La deuxième saison d’ascension, et la plus fréquentée.',
           'La seconda stagione di salita, e la più affollata.'),
      9: H('climbing', 'Dry and stable, with the crowds beginning to thin.',
           'Trocken und stabil, die Menge nimmt langsam ab.',
           'Sec et stable, avec moins de monde qu’en août.',
           'Asciutto e stabile, con meno affollamento.'),
    },
  },

  'lake-natron-and-ol-doinyo-lengai': {
    profile: 'tz-north',
    temp: [22, 38],
    wildlife: [3, 3, 3, 2, 2, 3, 4, 5, 5, 4, 3, 3],
    crowd: [2, 2, 1, 1, 1, 2, 3, 3, 3, 2, 1, 2],
    peak: [7, 8],
    highlights: {
      8: H('flamingo', 'Lesser flamingos breed here — the only reliable site in East Africa.',
           'Zwergflamingos brüten hier — der einzige verlässliche Platz Ostafrikas.',
           'Les petits flamants s’y reproduisent — seul site fiable d’Afrique de l’Est.',
           'Qui nidificano i fenicotteri minori — l’unico sito affidabile dell’Africa orientale.'),
      1: H('heat', 'Punishing heat by midday; climb Lengai overnight.',
           'Mittags brütende Hitze; den Lengai nachts besteigen.',
           'Chaleur écrasante à midi ; l’ascension du Lengai se fait de nuit.',
           'Caldo torrido a mezzogiorno; il Lengai si scala di notte.'),
    },
  },

  nyerere: {
    profile: 'tz-south',
    temp: [19, 33],
    wildlife: [2, 2, 2, 2, 3, 4, 5, 5, 5, 5, 3, 2],
    crowd: [2, 2, 1, 1, 2, 3, 4, 4, 4, 3, 2, 2],
    peak: [7, 8, 9],
    highlights: {
      4: H('closed', 'Many camps close for the rains — check before booking.',
           'Viele Camps schließen wegen des Regens — vorher prüfen.',
           'De nombreux camps ferment pour les pluies — vérifiez avant de réserver.',
           'Molti campi chiudono per le piogge — verificate prima di prenotare.'),
      8: H('boat', 'Boat safaris on the Rufiji at their best.',
           'Bootssafaris auf dem Rufiji zur besten Zeit.',
           'Safaris en bateau sur le Rufiji à leur apogée.',
           'Safari in barca sul Rufiji al meglio.'),
    },
  },

  'ruaha-national-park': {
    profile: 'tz-south',
    temp: [17, 31],
    wildlife: [2, 2, 2, 2, 3, 4, 5, 5, 5, 5, 3, 2],
    crowd: [1, 1, 1, 1, 1, 3, 4, 4, 4, 3, 2, 1],
    peak: [7, 8, 9],
    highlights: {
      9: H('predators', 'Big prides on the Great Ruaha — one of Africa’s densest lion areas.',
           'Große Rudel am Great Ruaha — eines der löwenreichsten Gebiete Afrikas.',
           'Grandes troupes sur le Great Ruaha — l’une des zones à lions les plus denses.',
           'Grandi branchi sul Great Ruaha — una delle aree con più leoni d’Africa.'),
    },
  },

  'mahale-mountains-national-park': {
    profile: 'tz-west',
    temp: [18, 28],
    wildlife: [3, 3, 3, 3, 4, 5, 5, 5, 5, 4, 3, 3],
    crowd: [1, 1, 1, 1, 2, 3, 4, 4, 3, 2, 1, 1],
    peak: [7, 8],
    highlights: {
      7: H('chimps', 'Chimps range low on the slopes — the shortest treks of the year.',
           'Schimpansen bleiben tief am Hang — die kürzesten Trekkings des Jahres.',
           'Les chimpanzés restent bas sur les pentes — les treks les plus courts.',
           'Gli scimpanzé stanno in basso — i trekking più brevi dell’anno.'),
    },
  },

  zanzibar: {
    profile: 'tz-coast',
    temp: [23, 31],
    wildlife: [4, 4, 3, 2, 2, 3, 4, 4, 4, 4, 3, 4],
    crowd: [5, 4, 3, 2, 2, 3, 5, 5, 4, 3, 3, 5],
    peak: [1, 2, 7, 8, 12],
    highlights: {
      4: H('long_rains', 'The wettest month of the year — many hotels cut rates hard.',
           'Der nasseste Monat des Jahres — viele Hotels senken die Preise deutlich.',
           'Le mois le plus pluvieux — beaucoup d’hôtels cassent leurs tarifs.',
           'Il mese più piovoso — molti hotel abbassano molto i prezzi.'),
      8: H('busy', 'European high season — book Stone Town and the north-east early.',
           'Europäische Hauptsaison — Stone Town und den Nordosten früh buchen.',
           'Haute saison européenne — réservez tôt Stone Town et le nord-est.',
           'Alta stagione europea — prenotate presto Stone Town e il nord-est.'),
    },
  },

  'pemba-island': {
    profile: 'tz-coast',
    temp: [23, 31],
    wildlife: [4, 4, 3, 2, 2, 3, 4, 5, 5, 4, 3, 4],
    crowd: [2, 2, 1, 1, 1, 2, 3, 3, 2, 2, 1, 2],
    peak: [7, 8],
    highlights: {
      9: H('diving', 'Best underwater visibility of the year on the wall dives.',
           'Beste Unterwassersicht des Jahres an den Steilwänden.',
           'Meilleure visibilité de l’année sur les tombants.',
           'Migliore visibilità dell’anno sulle pareti.'),
    },
  },

  'mafia-island': {
    profile: 'tz-coast',
    temp: [23, 31],
    wildlife: [5, 5, 4, 2, 2, 3, 3, 3, 4, 5, 5, 5],
    crowd: [2, 2, 1, 1, 1, 2, 3, 3, 2, 2, 2, 3],
    peak: [1, 2, 12],
    highlights: {
      10: H('whale_shark', 'Whale sharks arrive in Kilindoni bay.',
            'Walhaie treffen in der Bucht von Kilindoni ein.',
            'Les requins-baleines arrivent dans la baie de Kilindoni.',
            'Gli squali balena arrivano nella baia di Kilindoni.'),
      1: H('whale_shark', 'Peak whale shark season — near-daily sightings.',
           'Höhepunkt der Walhai-Saison — fast tägliche Sichtungen.',
           'Pic de la saison des requins-baleines — observations quasi quotidiennes.',
           'Picco della stagione degli squali balena — avvistamenti quasi quotidiani.'),
    },
  },

  'dar-es-salaam': {
    profile: 'tz-coast',
    temp: [23, 32],
    wildlife: null,
    crowd: [3, 3, 2, 2, 2, 3, 4, 4, 3, 3, 2, 4],
    peak: [12],
    highlights: {},
  },

  tanga: {
    profile: 'tz-coast',
    temp: [22, 31],
    wildlife: null,
    crowd: [2, 2, 1, 1, 1, 2, 3, 3, 2, 2, 1, 2],
    peak: [],
    highlights: {},
  },

  // ------------------------------------------------------------------- Kenya
  'maasai-mara': {
    profile: 'ke-rift',
    temp: [13, 28],
    wildlife: [3, 3, 3, 3, 3, 4, 5, 5, 5, 5, 3, 3],
    crowd: [3, 3, 2, 1, 1, 3, 5, 5, 5, 4, 2, 3],
    peak: [7, 8, 9, 10],
    highlights: {
      7: H('river_crossing', 'The herds arrive from the Serengeti; Mara crossings begin.',
           'Die Herden kommen aus der Serengeti; die Mara-Durchquerungen beginnen.',
           'Les troupeaux arrivent du Serengeti ; les traversées de la Mara commencent.',
           'Le mandrie arrivano dal Serengeti; iniziano i guadi della Mara.'),
      8: H('river_crossing', 'Peak crossing month — and peak vehicle numbers.',
           'Höhepunkt der Durchquerungen — und der Fahrzeugzahlen.',
           'Pic des traversées — et pic du nombre de véhicules.',
           'Picco dei guadi — e picco dei veicoli.'),
      9: H('river_crossing', 'Crossings continue with slightly thinner crowds.',
           'Durchquerungen dauern an, etwas weniger Andrang.',
           'Les traversées continuent, avec un peu moins de monde.',
           'I guadi continuano con un po’ meno affollamento.'),
      10: H('river_crossing', 'The herds turn south; last crossings of the season.',
            'Die Herden wenden nach Süden; letzte Durchquerungen der Saison.',
            'Les troupeaux repartent vers le sud ; dernières traversées.',
            'Le mandrie tornano a sud; ultimi guadi della stagione.'),
    },
  },

  'amboseli-national-park': {
    profile: 'ke-tsavo',
    temp: [15, 30],
    wildlife: [4, 4, 3, 3, 3, 4, 5, 5, 5, 4, 3, 4],
    crowd: [3, 3, 2, 1, 1, 3, 4, 4, 4, 3, 2, 3],
    peak: [1, 2, 7, 8],
    highlights: {
      1: H('kilimanjaro_view', 'Clearest Kilimanjaro views of the year, early morning.',
           'Klarste Kilimandscharo-Sicht des Jahres, am frühen Morgen.',
           'Vues les plus dégagées sur le Kilimandjaro, tôt le matin.',
           'Vista più limpida sul Kilimangiaro, di primo mattino.'),
      7: H('elephants', 'Big elephant families on the swamps.',
           'Große Elefantenfamilien in den Sümpfen.',
           'Grandes familles d’éléphants dans les marais.',
           'Grandi famiglie di elefanti nelle paludi.'),
    },
  },

  'tsavo-east-national-park': {
    profile: 'ke-tsavo',
    temp: [20, 34],
    wildlife: [3, 3, 3, 2, 3, 4, 4, 4, 4, 4, 2, 3],
    crowd: [2, 2, 1, 1, 1, 2, 3, 3, 3, 2, 1, 2],
    peak: [7, 8],
    highlights: {},
  },

  'tsavo-west-national-park': {
    profile: 'ke-tsavo',
    temp: [18, 31],
    wildlife: [3, 3, 3, 2, 3, 4, 4, 4, 4, 4, 2, 3],
    crowd: [2, 2, 1, 1, 1, 2, 3, 3, 3, 2, 1, 2],
    peak: [7, 8],
    highlights: {},
  },

  'samburu-national-reserve': {
    profile: 'ke-north',
    temp: [20, 34],
    wildlife: [4, 4, 3, 2, 3, 4, 5, 5, 5, 4, 3, 4],
    crowd: [2, 2, 1, 1, 1, 3, 4, 4, 3, 2, 1, 2],
    peak: [7, 8],
    highlights: {
      8: H('special_five', 'Grevy’s zebra, reticulated giraffe and gerenuk at the river.',
           'Grevyzebra, Netzgiraffe und Gerenuk am Fluss.',
           'Zèbre de Grévy, girafe réticulée et gérénuk au bord de la rivière.',
           'Zebra di Grévy, giraffa reticolata e gerenuk lungo il fiume.'),
    },
  },

  'laikipia-and-ol-pejeta': {
    profile: 'ke-north',
    temp: [11, 27],
    wildlife: [4, 4, 4, 3, 3, 4, 5, 5, 5, 4, 3, 4],
    crowd: [3, 3, 2, 1, 1, 3, 4, 4, 4, 3, 2, 3],
    peak: [7, 8, 12],
    highlights: {
      7: H('rhino', 'Black and white rhino at close range on foot.',
           'Spitz- und Breitmaulnashorn zu Fuß aus der Nähe.',
           'Rhinocéros noirs et blancs à courte distance, à pied.',
           'Rinoceronti neri e bianchi da vicino, a piedi.'),
    },
  },

  'lake-nakuru-national-park': {
    profile: 'ke-rift',
    temp: [11, 28],
    wildlife: [4, 4, 3, 3, 3, 4, 4, 4, 4, 4, 3, 4],
    crowd: [3, 3, 2, 1, 1, 3, 4, 4, 4, 3, 2, 3],
    peak: [7, 8],
    highlights: {
      1: H('rhino', 'Reliable rhino year-round; flamingo numbers depend on lake level.',
           'Ganzjährig verlässlich Nashörner; Flamingozahlen hängen vom Wasserstand ab.',
           'Rhinocéros toute l’année ; les flamants dépendent du niveau du lac.',
           'Rinoceronti tutto l’anno; i fenicotteri dipendono dal livello del lago.'),
    },
  },

  'lake-naivasha-and-hell-s-gate': {
    profile: 'ke-rift',
    temp: [10, 27],
    wildlife: [3, 3, 3, 3, 3, 3, 4, 4, 4, 3, 3, 3],
    crowd: [3, 3, 2, 2, 2, 3, 4, 4, 3, 3, 2, 3],
    peak: [7, 8],
    highlights: {
      7: H('walking', 'One of the few parks you can cycle and walk in.',
           'Einer der wenigen Parks zum Radfahren und Wandern.',
           'L’un des rares parcs où l’on peut marcher et pédaler.',
           'Uno dei pochi parchi dove si può camminare e pedalare.'),
    },
  },

  'nairobi-national-park': {
    profile: 'ke-rift',
    temp: [13, 26],
    wildlife: [3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 3, 3],
    crowd: [3, 3, 3, 2, 2, 3, 4, 4, 4, 3, 3, 3],
    peak: [7, 8],
    highlights: {
      6: H('city', 'Rhino and lion against a skyline — a half-day from the airport.',
           'Nashorn und Löwe vor der Skyline — einen halben Tag vom Flughafen.',
           'Rhinocéros et lions devant la skyline — à une demi-journée de l’aéroport.',
           'Rinoceronti e leoni davanti allo skyline — a mezza giornata dall’aeroporto.'),
    },
  },

  'mount-kenya': {
    profile: 'ke-alpine',
    temp: [5, 20],
    wildlife: null,
    crowd: [4, 4, 2, 1, 1, 3, 4, 4, 4, 3, 2, 4],
    peak: [1, 2, 8],
    highlights: {
      1: H('climbing', 'Prime trekking window — dry rock and clear summits.',
           'Bestes Trekkingfenster — trockener Fels, klare Gipfel.',
           'Meilleure fenêtre de trek — rocher sec et sommets dégagés.',
           'Finestra migliore per il trekking — roccia asciutta e cime limpide.'),
      8: H('climbing', 'The second dry window; Point Lenana is achievable for walkers.',
           'Das zweite Trockenfenster; Point Lenana ist für Wanderer machbar.',
           'La deuxième fenêtre sèche ; Point Lenana est accessible aux marcheurs.',
           'La seconda finestra secca; Point Lenana è alla portata dei camminatori.'),
    },
  },

  'diani-beach': {
    profile: 'ke-coast',
    temp: [23, 31],
    wildlife: [4, 4, 4, 3, 2, 3, 3, 4, 4, 4, 3, 4],
    crowd: [4, 4, 3, 2, 1, 2, 4, 4, 3, 3, 3, 5],
    peak: [1, 7, 8, 12],
    highlights: {
      5: H('closed', 'Wettest month on the coast; some beach hotels close.',
           'Nassester Monat an der Küste; einige Strandhotels schließen.',
           'Mois le plus humide sur la côte ; certains hôtels ferment.',
           'Mese più piovoso sulla costa; alcuni hotel chiudono.'),
    },
  },

  mombasa: {
    profile: 'ke-coast',
    temp: [23, 31],
    wildlife: null,
    crowd: [4, 4, 3, 2, 1, 2, 4, 4, 3, 3, 3, 5],
    peak: [1, 12],
    highlights: {},
  },

  'watamu-and-malindi': {
    profile: 'ke-coast',
    temp: [23, 31],
    wildlife: [4, 4, 4, 3, 2, 3, 3, 4, 4, 4, 3, 4],
    crowd: [4, 4, 3, 2, 1, 2, 3, 4, 3, 3, 3, 4],
    peak: [1, 12],
    highlights: {
      2: H('turtles', 'Turtle nesting season on the marine park beaches.',
           'Schildkröten-Nistsaison an den Stränden des Meeresparks.',
           'Saison de ponte des tortues sur les plages du parc marin.',
           'Stagione di nidificazione delle tartarughe nel parco marino.'),
    },
  },

  lamu: {
    profile: 'ke-coast',
    temp: [24, 32],
    wildlife: null,
    crowd: [3, 3, 2, 2, 1, 2, 3, 3, 2, 2, 2, 4],
    peak: [1, 12],
    highlights: {
      11: H('festival', 'Maulidi and the Lamu cultural festival season.',
            'Maulidi und die Zeit des Kulturfestivals von Lamu.',
            'Maulidi et la saison du festival culturel de Lamu.',
            'Maulidi e la stagione del festival culturale di Lamu.'),
    },
  },

  // ------------------------------------------------------------------ Uganda
  'bwindi-impenetrable-national-park': {
    profile: 'ug-equatorial',
    temp: [11, 23],
    wildlife: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    crowd: [4, 4, 3, 2, 2, 4, 5, 5, 3, 2, 2, 4],
    peak: [1, 2, 6, 7, 8, 12],
    highlights: {
      1: H('gorillas', 'Drier trails and firm ground — the easiest trekking of the year.',
           'Trockenere Pfade und fester Boden — das leichteste Trekking des Jahres.',
           'Sentiers plus secs et sol ferme — le trek le plus facile de l’année.',
           'Sentieri più asciutti e terreno solido — il trekking più facile dell’anno.'),
      4: H('gorillas', 'The gorillas are still here — the mud is the only difference, and permits are the same price.',
           'Die Gorillas sind da — nur der Schlamm ist anders, und die Permits kosten gleich viel.',
           'Les gorilles sont là — seule la boue change, et le permis coûte pareil.',
           'I gorilla ci sono — cambia solo il fango, e il permesso costa uguale.'),
      7: H('gorillas', 'Peak season; permits sell out months ahead.',
           'Hauptsaison; Permits sind Monate im Voraus vergeben.',
           'Haute saison ; les permis partent des mois à l’avance.',
           'Alta stagione; i permessi si esauriscono con mesi di anticipo.'),
    },
  },

  'mgahinga-gorilla-national-park': {
    profile: 'ug-equatorial',
    temp: [10, 22],
    wildlife: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    crowd: [2, 2, 1, 1, 1, 2, 3, 3, 2, 1, 1, 2],
    peak: [7, 8],
    highlights: {
      6: H('golden_monkey', 'Golden monkey tracking alongside the gorillas, and almost nobody here.',
           'Goldmeerkatzen-Tracking neben den Gorillas, und fast niemand da.',
           'Pistage des singes dorés en plus des gorilles, et presque personne.',
           'Tracking dei cercopitechi dorati oltre ai gorilla, e quasi nessuno.'),
    },
  },

  'kibale-national-park': {
    profile: 'ug-equatorial',
    temp: [15, 27],
    wildlife: [5, 5, 4, 4, 4, 5, 5, 5, 4, 4, 4, 5],
    crowd: [3, 3, 2, 2, 2, 4, 4, 4, 3, 2, 2, 3],
    peak: [1, 2, 6, 7, 8, 12],
    highlights: {
      2: H('chimps', 'High chimp tracking success on dry forest trails.',
           'Hohe Erfolgsquote beim Schimpansen-Tracking auf trockenen Waldwegen.',
           'Fort taux de réussite du pistage des chimpanzés sur sentiers secs.',
           'Alta percentuale di successo nel tracking degli scimpanzé su sentieri asciutti.'),
    },
  },

  'queen-elizabeth-national-park': {
    profile: 'ug-equatorial',
    temp: [17, 29],
    wildlife: [4, 4, 3, 3, 3, 4, 5, 5, 4, 3, 3, 4],
    crowd: [3, 3, 2, 2, 2, 4, 4, 4, 3, 2, 2, 3],
    peak: [1, 2, 7, 8],
    highlights: {
      7: H('kazinga', 'Kazinga Channel boat trips at their fullest.',
           'Bootsfahrten auf dem Kazinga-Kanal am ergiebigsten.',
           'Croisières sur le canal Kazinga à leur meilleur.',
           'Crociere sul canale Kazinga al massimo.'),
    },
  },

  'murchison-falls-national-park': {
    profile: 'ug-murchison',
    temp: [18, 31],
    wildlife: [4, 4, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
    crowd: [3, 3, 2, 2, 2, 3, 4, 4, 3, 3, 2, 3],
    peak: [1, 7, 8, 12],
    highlights: {
      12: H('falls', 'The Nile squeezes through a seven-metre gap — loudest after the rains.',
            'Der Nil zwängt sich durch eine sieben Meter breite Spalte — am lautesten nach dem Regen.',
            'Le Nil se comprime dans une brèche de sept mètres — au plus fort après les pluies.',
            'Il Nilo si stringe in una gola di sette metri — più fragorosa dopo le piogge.'),
    },
  },

  'kidepo-valley-national-park': {
    profile: 'ug-kidepo',
    temp: [17, 33],
    wildlife: [5, 5, 5, 4, 3, 3, 3, 3, 4, 4, 5, 5],
    crowd: [2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2],
    peak: [1, 2, 12],
    highlights: {
      1: H('reverse_season', 'Kidepo runs opposite to the rest of Uganda — this is its dry season.',
           'Kidepo läuft gegenläufig zum übrigen Uganda — das hier ist die Trockenzeit.',
           'Kidepo fonctionne à l’inverse du reste de l’Ouganda — c’est ici la saison sèche.',
           'Kidepo va al contrario del resto dell’Uganda — questa è la sua stagione secca.'),
      7: H('wet', 'Wet here while the rest of the country is dry; roads can close.',
           'Hier nass, während der Rest des Landes trocken ist; Straßen können gesperrt sein.',
           'Humide ici alors que le reste du pays est sec ; routes parfois coupées.',
           'Piovoso qui mentre il resto del paese è secco; strade a volte chiuse.'),
    },
  },

  'lake-mburo-national-park': {
    profile: 'ug-equatorial',
    temp: [16, 28],
    wildlife: [4, 4, 3, 3, 3, 4, 4, 4, 3, 3, 3, 4],
    crowd: [2, 2, 2, 1, 1, 3, 3, 3, 2, 2, 2, 2],
    peak: [7, 8],
    highlights: {
      6: H('walking', 'No elephants, so walking and horseback safaris are permitted.',
           'Keine Elefanten, daher sind Wander- und Reitsafaris erlaubt.',
           'Pas d’éléphants, donc safaris à pied et à cheval autorisés.',
           'Niente elefanti, quindi safari a piedi e a cavallo sono permessi.'),
    },
  },

  'rwenzori-mountains-national-park': {
    profile: 'ug-equatorial',
    temp: [6, 18],
    wildlife: null,
    crowd: [3, 3, 2, 1, 1, 3, 4, 4, 2, 1, 1, 3],
    peak: [1, 2, 7, 8],
    highlights: {
      1: H('climbing', 'Driest trekking window on the wettest mountains in Africa.',
           'Trockenstes Trekkingfenster in Afrikas nassestem Gebirge.',
           'Fenêtre de trek la plus sèche sur les montagnes les plus humides d’Afrique.',
           'Finestra di trekking più asciutta sulle montagne più piovose d’Africa.'),
    },
  },

  'lake-bunyonyi': {
    profile: 'ug-equatorial',
    temp: [12, 24],
    wildlife: null,
    crowd: [3, 3, 2, 2, 2, 3, 4, 4, 3, 2, 2, 3],
    peak: [7, 8, 12],
    highlights: {
      7: H('rest', 'The usual stop to rest after gorilla trekking — bilharzia-free swimming.',
           'Der übliche Halt nach dem Gorilla-Trekking — bilharziosefreies Schwimmen.',
           'L’étape habituelle après le trek aux gorilles — baignade sans bilharziose.',
           'La sosta abituale dopo il trekking dei gorilla — si nuota senza bilharzia.'),
    },
  },

  'ssese-islands': {
    profile: 'ug-equatorial',
    temp: [18, 28],
    wildlife: null,
    crowd: [2, 2, 2, 1, 1, 2, 3, 3, 2, 2, 2, 3],
    peak: [],
    highlights: {},
  },

  entebbe: {
    profile: 'ug-equatorial',
    temp: [18, 27],
    wildlife: null,
    crowd: [3, 3, 3, 2, 2, 3, 4, 4, 3, 3, 3, 4],
    peak: [7, 8, 12],
    highlights: {},
  },

  kampala: {
    profile: 'ug-equatorial',
    temp: [18, 28],
    wildlife: null,
    crowd: [3, 3, 3, 2, 2, 3, 4, 4, 3, 3, 3, 3],
    peak: [],
    highlights: {},
  },

  'jinja-and-the-source-of-the-nile': {
    profile: 'ug-equatorial',
    temp: [17, 28],
    wildlife: null,
    crowd: [3, 3, 2, 2, 2, 3, 4, 4, 3, 2, 2, 3],
    peak: [7, 8, 12],
    highlights: {
      7: H('rafting', 'Grade 5 rafting runs all year; drier months make for better camping.',
           'Wildwasser Grad 5 ganzjährig; in trockeneren Monaten campt es sich besser.',
           'Rafting de classe 5 toute l’année ; les mois secs sont meilleurs pour camper.',
           'Rafting di grado 5 tutto l’anno; nei mesi asciutti si campeggia meglio.'),
    },
  },

  // ------------------------------------------------------------------ Rwanda
  'volcanoes-national-park': {
    profile: 'rw',
    temp: [10, 21],
    wildlife: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    crowd: [4, 4, 2, 1, 2, 4, 5, 5, 4, 2, 2, 4],
    peak: [1, 2, 6, 7, 8, 9, 12],
    highlights: {
      6: H('gorillas', 'Firm trails and the best trekking conditions of the year.',
           'Feste Pfade und die besten Trekkingbedingungen des Jahres.',
           'Sentiers fermes et les meilleures conditions de trek de l’année.',
           'Sentieri solidi e le migliori condizioni di trekking dell’anno.'),
      4: H('gorillas', 'Wettest month — steep mud, but permits are the same price and the gorillas are the same gorillas.',
           'Nassester Monat — steiler Schlamm, aber gleiche Permitpreise und dieselben Gorillas.',
           'Mois le plus humide — boue raide, mais même prix de permis et mêmes gorilles.',
           'Mese più piovoso — fango ripido, ma stesso prezzo del permesso e stessi gorilla.'),
      9: H('kwita_izina', 'Kwita Izina, the gorilla naming ceremony.',
           'Kwita Izina, die Namensgebungszeremonie für Gorillas.',
           'Kwita Izina, la cérémonie de baptême des gorilles.',
           'Kwita Izina, la cerimonia di battesimo dei gorilla.'),
    },
  },

  'nyungwe-forest-national-park': {
    profile: 'rw',
    temp: [11, 22],
    wildlife: [4, 4, 4, 4, 4, 5, 5, 5, 4, 4, 4, 4],
    crowd: [3, 3, 2, 1, 2, 3, 4, 4, 3, 2, 2, 3],
    peak: [6, 7, 8, 12],
    highlights: {
      7: H('chimps', 'Chimp tracking and the canopy walk at their driest.',
           'Schimpansen-Tracking und Baumkronenpfad bei trockenstem Wetter.',
           'Pistage des chimpanzés et passerelle de canopée au plus sec.',
           'Tracking degli scimpanzé e passerella sospesa nel periodo più asciutto.'),
    },
  },

  'akagera-national-park': {
    profile: 'rw',
    temp: [16, 28],
    wildlife: [4, 4, 3, 3, 3, 4, 5, 5, 4, 3, 3, 4],
    crowd: [3, 3, 2, 1, 2, 3, 4, 4, 3, 2, 2, 3],
    peak: [7, 8, 12],
    highlights: {
      7: H('big_five', 'Big Five since the rhino reintroduction — and a boat trip on Lake Ihema.',
           'Big Five seit der Wiederansiedlung der Nashörner — dazu eine Bootsfahrt auf dem Ihema-See.',
           'Big Five depuis la réintroduction des rhinocéros — et une sortie en bateau sur le lac Ihema.',
           'Big Five dopo la reintroduzione dei rinoceronti — e una gita in barca sul lago Ihema.'),
    },
  },

  kigali: {
    profile: 'rw',
    temp: [15, 27],
    wildlife: null,
    crowd: [3, 3, 3, 2, 2, 3, 4, 4, 3, 3, 3, 3],
    peak: [],
    highlights: {},
  },
};
