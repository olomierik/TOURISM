/**
 * The four cities that had supply and no page.
 *
 * Category x destination combinations are the commercial surface, and the grid
 * is 6 categories x 61 destinations. 223 of those 366 cells are populated; the
 * 143 empty ones are empty because no operator serves them, and 78 belong to
 * thirteen destinations with no approved listing at all. Filling those cells
 * would publish pages that list nothing, which is the opposite of the point.
 *
 * The pages that were genuinely missing are the other way round: places that
 * hold operators with nowhere to appear. 1,067 approved listings — 28% of the
 * directory — were attached to no destination at all, so they were on zero
 * combination pages and invisible to destination-based lead routing. Grouping
 * them by where they actually are produced four places with real supply and no
 * destination row:
 *
 *   Nairobi  269 listings, all with contact details (265 safari operators)
 *   Mwanza    73 listings
 *   Dodoma    20 listings
 *   Mbeya     12 listings
 *
 * Nairobi is the one that mattered. It is where most Kenyan safari operators
 * are registered, the directory held 265 of them, and the only Nairobi row in
 * the taxonomy was the national park — so an operator with a Nairobi office
 * could be found by name and by nothing else. "Safari operators in Nairobi" is
 * among the most-searched phrases in this market and the site had no page for
 * it.
 *
 * These are cities, not parks, and the copy says so. A reader who lands on
 * Dodoma looking for a safari should learn in the first line that it is a
 * government town with a wine industry and that the wildlife is 160 km north,
 * rather than be sold a list. Mbeya's season is inverted from the rest of the
 * site — Kitulo flowers in the rains — and saying that plainly is worth more
 * than another "June to October is dry".
 *
 * Cover images are deliberately absent, as in destinations-rwanda.mjs: every
 * photograph here was uploaded by hand, and a seeder that invented one would
 * duplicate another destination's picture. The placeholder covers it.
 *
 * Seasonality rows are not supplied. The month widget earns its place where the
 * answer swings by month; for a capital city with a parliament in it, it does
 * not.
 */

export const cityDestinations = [
  {
    key: 'nairobi',
    country: 'KE',
    region: 'Nairobi',
    latitude: -1.2864,
    longitude: 36.8172,
    featured: true,
    sortOrder: 34,
    translations: {
      en: {
        name: 'Nairobi',
        slug: 'nairobi',
        summary:
          'The city most Kenyan safaris start from — with a national park on its southern edge.',
        description:
          'Nairobi is where an East African trip usually begins, and it is the only capital in the world with a national park inside the city boundary. Nairobi National Park runs along the southern edge: rhino, lion, buffalo and giraffe on open grassland, with the skyline behind them. It is 117 square kilometres, it holds one of Kenya’s densest black rhino populations, and you can be at the gate twenty minutes after breakfast.\n\nThe city sits at 1,795 m, which is why it is temperate rather than hot — evenings need a jacket for most of the year. Jomo Kenyatta International is the main air hub for the region; Wilson Airport, on the other side of town, flies the light aircraft that go to the Maasai Mara, Amboseli and Samburu. Most of Kenya’s licensed tour operators keep their offices here, which is the practical reason to care about the city even if you are not stopping.\n\nWhat people actually do with a spare day: the elephant orphanage at the David Sheldrick Wildlife Trust, the Giraffe Centre in Langata, the Karen Blixen Museum, and the Railway Museum for the story of the line that created the place. Two of those are within a few minutes of each other and make a straightforward half day.',
        bestTime:
          'Nairobi works year-round. January to March is the warmest and driest, and June to October is dry and cooler — both are comfortable. The long rains in April and May and the short rains in November bring afternoon downpours rather than all-day rain, but they make the traffic considerably worse. Altitude keeps the temperature in the low twenties most months.',
        travelTips:
          'Budget for traffic, not distance: 15 km across town can take ninety minutes at the wrong hour, and a missed domestic flight from Wilson is the usual casualty. Go to the national park at first light, before the city warms up and the animals move into cover. Pay for the park and for the Sheldrick Trust in advance online — both have moved away from cash at the gate. Use a registered taxi app rather than hailing, and keep phones out of sight in stopped traffic downtown.',
      },
      de: {
        name: 'Nairobi',
        slug: 'nairobi',
        summary:
          'Die Stadt, in der die meisten Kenia-Safaris beginnen — mit einem Nationalpark am Südrand.',
        description:
          'In Nairobi beginnt eine Ostafrikareise meist, und es ist die einzige Hauptstadt der Welt mit einem Nationalpark innerhalb der Stadtgrenze. Der Nairobi-Nationalpark zieht sich entlang des Südrands: Nashörner, Löwen, Büffel und Giraffen auf offenem Grasland, die Skyline im Hintergrund. 117 Quadratkilometer, eine der dichtesten Spitzmaulnashorn-Populationen Kenias — und zwanzig Minuten nach dem Frühstück steht man am Tor.\n\nDie Stadt liegt auf 1.795 m, deshalb ist sie gemäßigt und nicht heiß; abends braucht man fast das ganze Jahr eine Jacke. Jomo Kenyatta International ist der Luftknotenpunkt der Region, und vom Wilson Airport am anderen Ende der Stadt starten die Kleinflugzeuge in die Masai Mara, nach Amboseli und Samburu. Die meisten lizenzierten kenianischen Veranstalter haben hier ihr Büro — der praktische Grund, sich für die Stadt zu interessieren, auch wenn man nicht bleibt.\n\nWas man mit einem freien Tag tatsächlich macht: das Elefantenwaisenhaus des David Sheldrick Wildlife Trust, das Giraffe Centre in Langata, das Karen-Blixen-Museum und das Eisenbahnmuseum mit der Geschichte der Strecke, die den Ort überhaupt geschaffen hat. Zwei davon liegen wenige Minuten voneinander entfernt und ergeben einen unkomplizierten halben Tag.',
        bestTime:
          'Nairobi funktioniert das ganze Jahr. Januar bis März ist am wärmsten und trockensten, Juni bis Oktober trocken und kühler — beides angenehm. Die großen Regen im April und Mai und die kleinen im November bringen Nachmittagsschauer statt Dauerregen, verschlechtern den Verkehr aber deutlich. Die Höhe hält die Temperatur meist bei gut zwanzig Grad.',
        travelTips:
          'Rechnen Sie mit Verkehr, nicht mit Entfernung: 15 km quer durch die Stadt können zur falschen Stunde neunzig Minuten dauern, und das Opfer ist meist der verpasste Inlandsflug von Wilson. Fahren Sie im ersten Licht in den Nationalpark, bevor die Stadt aufheizt und die Tiere in Deckung gehen. Park und Sheldrick Trust vorab online bezahlen — beide nehmen am Tor kaum noch Bargeld. Nutzen Sie eine registrierte Taxi-App statt auf der Straße zu winken, und halten Sie Handys in stehendem Verkehr in der Innenstadt außer Sicht.',
      },
      fr: {
        name: 'Nairobi',
        slug: 'nairobi',
        summary:
          'La ville où commencent la plupart des safaris kényans — avec un parc national à sa lisière sud.',
        description:
          'Un voyage en Afrique de l’Est commence généralement à Nairobi, seule capitale au monde à abriter un parc national à l’intérieur de ses limites. Le parc national de Nairobi longe la bordure sud : rhinocéros, lions, buffles et girafes sur des prairies ouvertes, avec les gratte-ciel en fond. 117 kilomètres carrés, l’une des populations de rhinocéros noirs les plus denses du Kenya, et l’on est à l’entrée vingt minutes après le petit-déjeuner.\n\nLa ville est à 1 795 m d’altitude, d’où un climat tempéré plutôt que chaud : une veste est utile le soir presque toute l’année. Jomo Kenyatta International est la plaque tournante aérienne de la région ; l’aéroport Wilson, à l’autre bout de la ville, dessert en petits avions le Masai Mara, Amboseli et Samburu. La plupart des opérateurs kényans agréés ont leurs bureaux ici — la vraie raison de s’intéresser à la ville même sans y séjourner.\n\nCe que l’on fait réellement d’une journée libre : l’orphelinat d’éléphants du David Sheldrick Wildlife Trust, le Giraffe Centre à Langata, le musée Karen Blixen et le musée du Chemin de fer, qui raconte la ligne qui a créé la ville. Deux d’entre eux sont à quelques minutes l’un de l’autre et forment une demi-journée simple.',
        bestTime:
          'Nairobi se visite toute l’année. De janvier à mars, c’est le plus chaud et le plus sec ; de juin à octobre, sec et plus frais — les deux sont agréables. Les grandes pluies d’avril et mai et les petites de novembre apportent des averses d’après-midi plutôt qu’une pluie continue, mais elles aggravent nettement la circulation. L’altitude maintient la température autour de vingt degrés la plupart des mois.',
        travelTips:
          'Prévoyez du temps pour la circulation, pas pour la distance : 15 km en ville peuvent prendre quatre-vingt-dix minutes à la mauvaise heure, et la victime habituelle est le vol intérieur manqué à Wilson. Entrez dans le parc national aux premières lueurs, avant que la ville ne chauffe et que les animaux ne se mettent à couvert. Payez le parc et le Sheldrick Trust en ligne à l’avance : tous deux acceptent de moins en moins d’espèces à l’entrée. Utilisez une application de taxi enregistrée plutôt que de héler dans la rue, et gardez les téléphones hors de vue dans les embouteillages du centre.',
      },
      it: {
        name: 'Nairobi',
        slug: 'nairobi',
        summary:
          'La città da cui parte la maggior parte dei safari kenioti — con un parco nazionale sul margine sud.',
        description:
          'Un viaggio in Africa orientale comincia di solito da Nairobi, l’unica capitale al mondo con un parco nazionale dentro i confini urbani. Il parco nazionale di Nairobi corre lungo il margine sud: rinoceronti, leoni, bufali e giraffe su prateria aperta, con i grattacieli alle spalle. Sono 117 chilometri quadrati, ospitano una delle popolazioni di rinoceronte nero più dense del Kenya, e si è al cancello venti minuti dopo la colazione.\n\nLa città sta a 1.795 m, ed è per questo temperata e non calda: la sera serve una giacca quasi tutto l’anno. Jomo Kenyatta International è lo scalo aereo della regione; il Wilson Airport, all’altro capo della città, è da dove partono i piccoli aerei per il Masai Mara, Amboseli e Samburu. Qui ha l’ufficio la maggior parte degli operatori kenioti autorizzati, ed è la ragione pratica per interessarsi alla città anche non fermandosi.\n\nCosa si fa davvero con una giornata libera: l’orfanotrofio degli elefanti del David Sheldrick Wildlife Trust, il Giraffe Centre a Langata, il museo di Karen Blixen e il museo ferroviario, che racconta la linea che ha creato la città. Due di questi sono a pochi minuti l’uno dall’altro e fanno una mezza giornata facile.',
        bestTime:
          'Nairobi funziona tutto l’anno. Da gennaio a marzo è il periodo più caldo e asciutto, da giugno a ottobre asciutto e più fresco: entrambi comodi. Le grandi piogge di aprile e maggio e quelle brevi di novembre portano rovesci pomeridiani più che pioggia continua, ma peggiorano molto il traffico. L’altitudine tiene la temperatura sui venti gradi per quasi tutti i mesi.',
        travelTips:
          'Mettete in conto il traffico, non la distanza: 15 km in città possono richiedere novanta minuti nell’ora sbagliata, e la vittima di solito è il volo interno perso da Wilson. Entrate nel parco nazionale alla prima luce, prima che la città si scaldi e gli animali si mettano al riparo. Pagate parco e Sheldrick Trust online in anticipo: entrambi accettano sempre meno contanti al cancello. Usate un’app di taxi registrata invece di fermarne uno per strada, e tenete i telefoni fuori vista nel traffico fermo in centro.',
      },
    },
  },
  {
    key: 'mwanza',
    country: 'TZ',
    region: 'Mwanza',
    latitude: -2.5164,
    longitude: 32.9175,
    featured: false,
    sortOrder: 16,
    translations: {
      en: {
        name: 'Mwanza',
        slug: 'mwanza',
        summary:
          'Tanzania’s lake city, and the back door into the Serengeti’s western corridor.',
        description:
          'Mwanza sits on the southern shore of Lake Victoria among granite boulders the size of houses — it is called Rock City for a reason, and Bismarck Rock balanced at the water’s edge is the picture everyone takes. It is Tanzania’s second city, a working port built on Nile perch and cotton rather than tourism, which makes it a different experience from Arusha: nobody is selling you anything.\n\nIts value to a traveller is position. The Ndabaka gate into the Serengeti’s western corridor is about two hours east, which puts the Grumeti and the river crossings within reach from a direction almost nobody arrives from. Saanane Island National Park is the smallest in the country and sits in the bay inside the city, reachable by a short boat ride. Ferries run to Ukerewe, the largest island in the lake, and on to Rubondo Island National Park.\n\nThe airport takes daily flights from Dar es Salaam, Arusha and Nairobi, so Mwanza works as an entry or exit point that avoids doubling back through the northern circuit. The fish markets at first light and the lakeside at dusk are the two things worth arranging a day around.',
        bestTime:
          'June to October is dry and the most comfortable, and it overlaps with the wildebeest in the western corridor — the Grumeti crossings are usually June and July, which is the one time this side of the Serengeti beats the busier eastern gates. November to May is greener and hotter with afternoon storms; the lake is calmer early in the day year-round.',
        travelTips:
          'Going into the Serengeti from here needs arranging ahead: Ndabaka is a long way from most operators’ vehicle bases, and a same-day booking usually means paying for the empty drive out. Bilharzia is present in the lake — swim from boats in open water rather than from reed-lined shores, and ask locally. The Ukerewe ferry runs to its own timetable and not to yours; treat it as a day out, not a transfer. Malaria risk here is higher than in the highlands, so keep up the prophylaxis.',
      },
      de: {
        name: 'Mwanza',
        slug: 'mwanza',
        summary:
          'Tansanias Seestadt — und die Hintertür in den westlichen Korridor der Serengeti.',
        description:
          'Mwanza liegt am Südufer des Victoriasees zwischen Granitblöcken von Hausgröße — Rock City heißt die Stadt nicht umsonst, und der am Wasserrand balancierende Bismarck Rock ist das Bild, das jeder fotografiert. Es ist Tansanias zweite Stadt, ein arbeitender Hafen, der auf Nilbarsch und Baumwolle gebaut ist und nicht auf Tourismus — eine andere Erfahrung als Arusha: hier will Ihnen niemand etwas verkaufen.\n\nIhr Wert für Reisende ist die Lage. Das Ndabaka-Tor in den westlichen Serengeti-Korridor liegt rund zwei Stunden östlich, womit Grumeti und die Flussübergänge aus einer Richtung erreichbar sind, aus der fast niemand kommt. Der Saanane-Island-Nationalpark ist der kleinste des Landes, liegt in der Bucht mitten in der Stadt und ist mit einer kurzen Bootsfahrt erreichbar. Fähren fahren nach Ukerewe, der größten Insel des Sees, und weiter zum Rubondo-Island-Nationalpark.\n\nDer Flughafen wird täglich aus Daressalam, Arusha und Nairobi angeflogen, sodass Mwanza als Ein- oder Ausstieg funktioniert, ohne den Nordkreis doppelt zu fahren. Die Fischmärkte im ersten Licht und das Seeufer in der Dämmerung sind die beiden Dinge, um die man einen Tag planen sollte.',
        bestTime:
          'Juni bis Oktober ist trocken und am angenehmsten — und überschneidet sich mit den Gnus im westlichen Korridor: die Grumeti-Übergänge liegen meist im Juni und Juli, die eine Zeit, in der diese Seite der Serengeti die belebteren Osttore schlägt. November bis Mai ist grüner und heißer mit Nachmittagsgewittern; der See ist das ganze Jahr früh am Tag am ruhigsten.',
        travelTips:
          'Von hier in die Serengeti zu fahren muss vorbereitet werden: Ndabaka liegt weit von den Fahrzeugbasen der meisten Veranstalter, und eine Buchung am selben Tag heißt in der Regel, die Leerfahrt mitzubezahlen. Im See gibt es Bilharziose — schwimmen Sie vom Boot im offenen Wasser statt an schilfbestandenen Ufern, und fragen Sie vor Ort. Die Ukerewe-Fähre fährt nach ihrem Zeitplan, nicht nach Ihrem: ein Tagesausflug, kein Transfer. Das Malariarisiko ist hier höher als im Hochland, also die Prophylaxe durchhalten.',
      },
      fr: {
        name: 'Mwanza',
        slug: 'mwanza',
        summary:
          'La ville-lac de la Tanzanie, et la porte arrière du couloir occidental du Serengeti.',
        description:
          'Mwanza occupe la rive sud du lac Victoria, au milieu de blocs de granit de la taille d’une maison — on l’appelle Rock City à bon droit, et le Bismarck Rock en équilibre au bord de l’eau est la photo que tout le monde prend. C’est la deuxième ville de Tanzanie, un port de travail bâti sur la perche du Nil et le coton plutôt que sur le tourisme : personne n’essaie de vous vendre quoi que ce soit.\n\nSon intérêt pour un voyageur, c’est sa position. La porte de Ndabaka, qui ouvre sur le couloir occidental du Serengeti, est à deux heures à l’est : le Grumeti et les traversées de rivière deviennent accessibles depuis une direction d’où presque personne n’arrive. Le parc national de l’île de Saanane est le plus petit du pays et se trouve dans la baie, en ville, à une courte traversée. Des ferries desservent Ukerewe, la plus grande île du lac, et au-delà le parc national de l’île de Rubondo.\n\nL’aéroport reçoit des vols quotidiens de Dar es Salaam, Arusha et Nairobi : Mwanza fonctionne donc comme point d’entrée ou de sortie sans refaire le circuit nord en sens inverse. Les marchés aux poissons à l’aube et les rives du lac au crépuscule sont les deux choses autour desquelles organiser une journée.',
        bestTime:
          'De juin à octobre, c’est sec et le plus agréable — et cela recoupe le passage des gnous dans le couloir occidental : les traversées du Grumeti ont lieu en juin et juillet, le seul moment où ce côté du Serengeti bat les portes orientales plus fréquentées. De novembre à mai, c’est plus vert et plus chaud, avec des orages l’après-midi ; le lac est plus calme en début de journée toute l’année.',
        travelTips:
          'Entrer dans le Serengeti d’ici demande d’être organisé à l’avance : Ndabaka est loin des bases de véhicules de la plupart des opérateurs, et une réservation le jour même revient généralement à payer le trajet à vide. La bilharziose est présente dans le lac : nagez depuis un bateau en eau libre plutôt que depuis des rives à roseaux, et renseignez-vous sur place. Le ferry d’Ukerewe suit son horaire, pas le vôtre — une sortie à la journée, pas un transfert. Le risque de paludisme est plus élevé qu’en altitude : poursuivez la prophylaxie.',
      },
      it: {
        name: 'Mwanza',
        slug: 'mwanza',
        summary:
          'La città sul lago della Tanzania, e la porta di servizio del corridoio occidentale del Serengeti.',
        description:
          'Mwanza sta sulla sponda meridionale del lago Vittoria, tra massi di granito grandi come case: Rock City non è un soprannome casuale, e il Bismarck Rock in equilibrio sul filo dell’acqua è la fotografia che fanno tutti. È la seconda città della Tanzania, un porto che lavora, costruito sul pesce persico del Nilo e sul cotone e non sul turismo: nessuno qui cerca di vendervi niente.\n\nIl suo valore per chi viaggia è la posizione. Il cancello di Ndabaka, che apre sul corridoio occidentale del Serengeti, è a circa due ore a est: Grumeti e gli attraversamenti del fiume diventano raggiungibili da una direzione da cui quasi nessuno arriva. Il parco nazionale dell’isola di Saanane è il più piccolo del paese e sta nella baia dentro la città, a una breve traversata. I traghetti servono Ukerewe, l’isola più grande del lago, e oltre il parco nazionale dell’isola di Rubondo.\n\nL’aeroporto riceve voli giornalieri da Dar es Salaam, Arusha e Nairobi, quindi Mwanza funziona come punto di ingresso o di uscita senza rifare il circuito nord al contrario. I mercati del pesce alla prima luce e la riva del lago al crepuscolo sono le due cose per cui vale organizzare una giornata.',
        bestTime:
          'Da giugno a ottobre è asciutto e più comodo, e si sovrappone agli gnu nel corridoio occidentale: gli attraversamenti del Grumeti cadono di solito a giugno e luglio, l’unico momento in cui questo lato del Serengeti batte i cancelli orientali più affollati. Da novembre a maggio è più verde e più caldo, con temporali pomeridiani; il lago è più calmo nelle prime ore, tutto l’anno.',
        travelTips:
          'Entrare nel Serengeti da qui va preparato in anticipo: Ndabaka è lontano dalle basi dei mezzi di gran parte degli operatori, e prenotare lo stesso giorno significa di solito pagare il trasferimento a vuoto. Nel lago c’è la bilharzia: nuotate da una barca in acqua aperta e non da rive a canne, e informatevi sul posto. Il traghetto per Ukerewe segue il proprio orario, non il vostro — è una gita, non un transfer. Il rischio malaria qui è più alto che sugli altipiani: continuate la profilassi.',
      },
    },
  },
  {
    key: 'dodoma',
    country: 'TZ',
    region: 'Dodoma',
    latitude: -6.163,
    longitude: 35.7516,
    featured: false,
    sortOrder: 17,
    translations: {
      en: {
        name: 'Dodoma',
        slug: 'dodoma',
        summary:
          'Tanzania’s capital and its wine country — a government town, not a safari base.',
        description:
          'Dodoma is the capital of Tanzania. Parliament sits here, the ministries finished relocating from Dar es Salaam in 2019, and the city has the wide, half-finished feel of a place built to a plan rather than grown. If you are here, it is almost certainly for work, a conference, or because the road between Dar and the north goes through it.\n\nThe unexpected part is the wine. The semi-arid plateau around the city is Tanzania’s only real viticultural region, planted mostly with Chenin Blanc and Makutupora reds, and the cellars on the edge of town will pour for visitors with a phone call ahead. It is not Stellenbosch and nobody pretends otherwise, but a tasting after a day of meetings is a better evening than the hotel bar.\n\nThe serious reason to stop is 160 km north: the Kondoa rock-art sites, a UNESCO listing covering hundreds of shelters painted over at least two thousand years, with the most accessible panels at Kolo. A guide from the site office is required and worth having. Wildlife is not the draw here — the nearest parks are Mikumi to the east and Tarangire well to the north.',
        bestTime:
          'June to October is dry and cooler, and the easiest time to be outdoors on the plateau. December to April brings the rains and real heat, with the hottest stretch before them in October and November. The Kondoa tracks are rough in the wet and occasionally impassable, so the dry months matter more here than the temperature does.',
        travelTips:
          'Kondoa is a day trip with an early start, not an afternoon’s outing — allow three hours each way and arrange a site guide at Kolo rather than hoping for one. Call the wineries before driving out; opening hours follow the harvest and the government calendar more than any published schedule. Hotels fill when Parliament is sitting, and rates move with it, so check the session dates before booking. The city is spread out and walking between the government quarter and the old town is further than it looks on a map.',
      },
      de: {
        name: 'Dodoma',
        slug: 'dodoma',
        summary:
          'Tansanias Hauptstadt und Weinland — eine Regierungsstadt, keine Safaribasis.',
        description:
          'Dodoma ist die Hauptstadt Tansanias. Hier sitzt das Parlament, die Ministerien sind 2019 aus Daressalam fertig umgezogen, und die Stadt hat das weite, halbfertige Gefühl eines Ortes, der geplant und nicht gewachsen ist. Wer hier ist, ist es fast sicher wegen der Arbeit, einer Konferenz oder weil die Straße zwischen Daressalam und dem Norden hier durchführt.\n\nDas Unerwartete ist der Wein. Das halbtrockene Hochland um die Stadt ist Tansanias einzige echte Weinbauregion, bepflanzt vor allem mit Chenin Blanc und Makutupora-Rotweinen, und die Kellereien am Stadtrand schenken Besuchern nach einem Anruf aus. Es ist nicht Stellenbosch und niemand behauptet das, aber eine Probe nach einem Tag voller Termine ist ein besserer Abend als die Hotelbar.\n\nDer ernste Grund für einen Halt liegt 160 km nördlich: die Felsbilder von Kondoa, UNESCO-Welterbe, Hunderte über mindestens zweitausend Jahre bemalte Felsnischen, mit den zugänglichsten Tafeln bei Kolo. Ein Führer vom Büro der Fundstätte ist Pflicht und lohnt sich. Wildtiere sind hier nicht das Thema — die nächsten Parks sind Mikumi im Osten und Tarangire weit im Norden.',
        bestTime:
          'Juni bis Oktober ist trocken und kühler und die einfachste Zeit, auf dem Hochland draußen zu sein. Dezember bis April bringt Regen und echte Hitze, am heißesten davor im Oktober und November. Die Pisten nach Kondoa sind in der Nässe schlecht und gelegentlich unpassierbar — die Trockenmonate zählen hier mehr als die Temperatur.',
        travelTips:
          'Kondoa ist ein Tagesausflug mit frühem Start, kein Nachmittagsprogramm: rechnen Sie mit drei Stunden pro Richtung und organisieren Sie in Kolo einen Führer, statt auf einen zu hoffen. Rufen Sie die Weingüter vorher an; die Öffnungszeiten folgen der Ernte und dem Regierungskalender mehr als jedem Aushang. Wenn das Parlament tagt, sind die Hotels voll und die Preise ziehen an — prüfen Sie die Sitzungstermine vor der Buchung. Die Stadt ist weitläufig, und der Weg zwischen Regierungsviertel und Altstadt ist länger, als er auf der Karte aussieht.',
      },
      fr: {
        name: 'Dodoma',
        slug: 'dodoma',
        summary:
          'La capitale de la Tanzanie et son vignoble — une ville de gouvernement, pas une base de safari.',
        description:
          'Dodoma est la capitale de la Tanzanie. Le Parlement y siège, les ministères ont achevé leur déménagement depuis Dar es Salaam en 2019, et la ville a l’allure large et inachevée d’un lieu construit sur plan plutôt que poussé tout seul. Si vous êtes là, c’est presque certainement pour le travail, une conférence, ou parce que la route entre Dar et le nord y passe.\n\nL’inattendu, c’est le vin. Le plateau semi-aride autour de la ville est la seule véritable région viticole de Tanzanie, plantée surtout de chenin blanc et de rouges de Makutupora, et les chais en périphérie servent les visiteurs sur un simple coup de fil. Ce n’est pas Stellenbosch et personne ne le prétend, mais une dégustation après une journée de réunions vaut mieux que le bar de l’hôtel.\n\nLa vraie raison de s’arrêter est à 160 km au nord : les sites d’art rupestre de Kondoa, inscrits à l’UNESCO, des centaines d’abris peints sur au moins deux mille ans, les panneaux les plus accessibles étant à Kolo. Un guide du bureau du site est obligatoire et utile. La faune n’est pas l’argument ici : les parcs les plus proches sont Mikumi à l’est et Tarangire bien plus au nord.',
        bestTime:
          'De juin à octobre, c’est sec et plus frais, la période la plus simple pour être dehors sur le plateau. De décembre à avril arrivent les pluies et la vraie chaleur, le plus chaud se situant juste avant, en octobre et novembre. Les pistes de Kondoa sont mauvaises par temps humide et parfois impraticables : ici les mois secs comptent plus que la température.',
        travelTips:
          'Kondoa est une excursion à la journée avec départ tôt, pas une sortie d’après-midi : comptez trois heures dans chaque sens et réservez un guide à Kolo au lieu d’espérer en trouver un. Appelez les domaines avant de prendre la route ; les horaires suivent les vendanges et le calendrier gouvernemental plus que tout affichage. Quand le Parlement siège, les hôtels se remplissent et les tarifs montent : vérifiez les dates de session avant de réserver. La ville est étalée, et la distance entre le quartier gouvernemental et la vieille ville est plus longue qu’elle n’en paraît sur une carte.',
      },
      it: {
        name: 'Dodoma',
        slug: 'dodoma',
        summary:
          'La capitale della Tanzania e la sua zona del vino: una città di governo, non una base per safari.',
        description:
          'Dodoma è la capitale della Tanzania. Qui siede il Parlamento, i ministeri hanno completato il trasferimento da Dar es Salaam nel 2019, e la città ha l’aria larga e incompiuta di un posto costruito su un piano anziché cresciuto. Se siete qui, è quasi certamente per lavoro, per una conferenza, o perché la strada tra Dar e il nord passa da qui.\n\nLa parte inattesa è il vino. L’altopiano semiarido attorno alla città è l’unica vera zona viticola della Tanzania, piantata soprattutto a chenin blanc e a rossi di Makutupora, e le cantine ai margini del centro versano ai visitatori con una telefonata in anticipo. Non è Stellenbosch e nessuno lo sostiene, ma una degustazione dopo una giornata di riunioni è una serata migliore del bar dell’albergo.\n\nIl motivo serio per fermarsi è a 160 km a nord: i siti di arte rupestre di Kondoa, patrimonio UNESCO, centinaia di ripari dipinti nell’arco di almeno duemila anni, con i pannelli più accessibili a Kolo. Una guida dell’ufficio del sito è obbligatoria e utile. La fauna non è il richiamo di questo posto: i parchi più vicini sono Mikumi a est e Tarangire molto più a nord.',
        bestTime:
          'Da giugno a ottobre è asciutto e più fresco, il periodo più semplice per stare all’aperto sull’altopiano. Da dicembre ad aprile arrivano le piogge e il caldo vero, con il tratto più caldo appena prima, a ottobre e novembre. Le piste per Kondoa sono brutte con l’umido e a volte impraticabili: qui i mesi asciutti contano più della temperatura.',
        travelTips:
          'Kondoa è una gita di un giorno con partenza presto, non un pomeriggio: calcolate tre ore per ogni tratta e prenotate una guida a Kolo invece di sperare di trovarne una. Telefonate alle cantine prima di mettervi in strada; gli orari seguono la vendemmia e il calendario del governo più di qualunque cartello. Quando il Parlamento è in seduta gli alberghi si riempiono e i prezzi salgono: controllate le date prima di prenotare. La città è dispersa, e la distanza tra il quartiere governativo e il centro vecchio è maggiore di quanto sembri su una mappa.',
      },
    },
  },
  {
    key: 'mbeya',
    country: 'TZ',
    region: 'Mbeya',
    latitude: -8.9,
    longitude: 33.45,
    featured: false,
    sortOrder: 18,
    translations: {
      en: {
        name: 'Mbeya',
        slug: 'mbeya',
        summary:
          'The cool southern highlands — crater lakes, coffee, and a park that flowers in the rains.',
        description:
          'Mbeya sits at about 1,700 m in Tanzania’s southern highlands, and the first thing anyone notices is that it is cold. Green hills, coffee and tea on the slopes, pine plantations, and a climate that has more in common with the Kenyan highlands than with the coast. It is the main town on the Tanzam highway and the TAZARA railway from Dar es Salaam, which is how most people arrive.\n\nThe reason to come is Kitulo National Park, an hour and a half east and up — a high plateau the Wabena call Bustani ya Mungu, the Garden of God, and botanists call one of the great floral sites in Africa. More than forty species of terrestrial orchid flower there, along with aster, lily and lobelia, and the display runs from December to April. It is the only national park in Tanzania gazetted primarily for its plants, and it inverts the usual advice: the rains are the season, not the obstacle.\n\nCloser in there is Ngozi Crater Lake in its forested caldera, the natural rock arch at Daraja la Mungu with the Kijungu boiling pot below it, Kaporogwe Falls, and Mount Rungwe for anyone who wants a long climb. Matema Beach on Lake Nyasa is four hours south and a genuinely different country.',
        bestTime:
          'This destination runs against the rest of the site. December to April is the wet season everywhere else and the flowering season at Kitulo, which is the single best reason to be here — expect mud, mist and cold nights. May to October is dry, clear and good for Rungwe, Ngozi and the waterfalls, but the plateau is brown. June and July nights can approach freezing on the high ground.',
        travelTips:
          'Bring warm and waterproof clothing — people arrive dressed for a safari and spend the trip cold. Kitulo needs a high-clearance vehicle in the wet and a permit from the park office in Mbeya or at Matamba; the plateau is walked, not driven around, so plan on a full day with boots. Ngozi is a steep forest hike from the road and a guide is worth it both for the route and because the last stretch is slippery. The TAZARA train from Dar is two nights and frequently late, which is fine if you treat it as the trip rather than the transfer.',
      },
      de: {
        name: 'Mbeya',
        slug: 'mbeya',
        summary:
          'Das kühle südliche Hochland — Kraterseen, Kaffee und ein Park, der in der Regenzeit blüht.',
        description:
          'Mbeya liegt auf etwa 1.700 m im südlichen Hochland Tansanias, und das Erste, was alle merken, ist die Kälte. Grüne Hügel, Kaffee und Tee an den Hängen, Kiefernforste und ein Klima, das dem kenianischen Hochland näher ist als der Küste. Die Stadt ist der Hauptort an der Tanzam-Straße und an der TAZARA-Bahn aus Daressalam, auf der die meisten ankommen.\n\nDer Grund zu kommen ist der Kitulo-Nationalpark, eineinhalb Stunden östlich und aufwärts — ein Hochplateau, das die Wabena Bustani ya Mungu nennen, Garten Gottes, und das Botaniker zu den großen Blütenstandorten Afrikas zählen. Über vierzig Arten von Erdorchideen blühen dort, dazu Astern, Lilien und Lobelien, und die Blüte läuft von Dezember bis April. Es ist der einzige Nationalpark Tansanias, der vor allem seiner Pflanzen wegen ausgewiesen wurde, und er kehrt den üblichen Rat um: der Regen ist die Saison, nicht das Hindernis.\n\nNäher liegen der Ngozi-Kratersee in seiner bewaldeten Caldera, der natürliche Felsbogen Daraja la Mungu mit dem brodelnden Kijungu darunter, die Kaporogwe-Wasserfälle und der Mount Rungwe für einen langen Aufstieg. Matema Beach am Nyasasee ist vier Stunden südlich und ein wirklich anderes Land.',
        bestTime:
          'Dieses Ziel läuft gegen den Rest der Seite. Dezember bis April ist überall sonst Regenzeit und am Kitulo Blütezeit — der beste Grund, hier zu sein, mit Matsch, Nebel und kalten Nächten. Mai bis Oktober ist trocken und klar, gut für Rungwe, Ngozi und die Wasserfälle, aber das Plateau ist braun. In Juni und Juli kann es auf der Höhe nachts an den Frost gehen.',
        travelTips:
          'Warme und wasserdichte Kleidung mitbringen — viele kommen safaritauglich angezogen und frieren die ganze Reise. Kitulo braucht in der Nässe ein Fahrzeug mit Bodenfreiheit und eine Genehmigung vom Parkbüro in Mbeya oder in Matamba; das Plateau wird gegangen, nicht abgefahren, also einen ganzen Tag mit Stiefeln einplanen. Zum Ngozi führt eine steile Waldwanderung von der Straße, und ein Führer lohnt sich für den Weg und weil das letzte Stück rutschig ist. Der TAZARA-Zug aus Daressalam braucht zwei Nächte und ist häufig verspätet — unproblematisch, wenn man ihn als Reise und nicht als Transfer begreift.',
      },
      fr: {
        name: 'Mbeya',
        slug: 'mbeya',
        summary:
          'Les hautes terres fraîches du sud — lacs de cratère, café, et un parc qui fleurit sous la pluie.',
        description:
          'Mbeya se tient à environ 1 700 m dans les hautes terres du sud de la Tanzanie, et la première chose que tout le monde remarque, c’est le froid. Collines vertes, café et thé sur les pentes, plantations de pins, et un climat plus proche des hauts plateaux kényans que de la côte. C’est la ville principale sur la route Tanzam et sur la ligne TAZARA venue de Dar es Salaam, par laquelle arrivent la plupart des visiteurs.\n\nLa raison de venir, c’est le parc national de Kitulo, à une heure et demie à l’est et en altitude — un haut plateau que les Wabena appellent Bustani ya Mungu, le Jardin de Dieu, et que les botanistes rangent parmi les grands sites floraux d’Afrique. Plus de quarante espèces d’orchidées terrestres y fleurissent, avec asters, lis et lobélies, de décembre à avril. C’est le seul parc national de Tanzanie classé d’abord pour ses plantes, et il renverse le conseil habituel : la pluie est la saison, non l’obstacle.\n\nPlus près, il y a le lac de cratère de Ngozi dans sa caldeira boisée, l’arche rocheuse naturelle de Daraja la Mungu avec la marmite bouillonnante de Kijungu en dessous, les chutes de Kaporogwe, et le mont Rungwe pour qui veut une longue ascension. Matema Beach, sur le lac Nyasa, est à quatre heures au sud et dans un tout autre pays.',
        bestTime:
          'Cette destination va à contre-courant du reste du site. De décembre à avril, c’est la saison des pluies partout ailleurs et la floraison à Kitulo — la meilleure raison d’être ici, avec boue, brume et nuits froides. De mai à octobre, c’est sec et clair, bon pour Rungwe, Ngozi et les cascades, mais le plateau est brun. En juin et juillet, les nuits approchent du gel en altitude.',
        travelTips:
          'Emportez des vêtements chauds et imperméables : on arrive habillé pour un safari et on passe le séjour à avoir froid. Kitulo exige un véhicule à bonne garde au sol par temps humide et un permis du bureau du parc à Mbeya ou à Matamba ; le plateau se parcourt à pied et non en voiture, prévoyez donc une journée entière et des chaussures. Ngozi est une montée raide en forêt depuis la route, et un guide vaut la peine pour l’itinéraire et parce que la fin est glissante. Le train TAZARA depuis Dar prend deux nuits et a souvent du retard : sans importance si vous le prenez comme le voyage et non comme le transfert.',
      },
      it: {
        name: 'Mbeya',
        slug: 'mbeya',
        summary:
          'Gli altipiani freschi del sud: laghi vulcanici, caffè e un parco che fiorisce con le piogge.',
        description:
          'Mbeya sta a circa 1.700 m sugli altipiani meridionali della Tanzania, e la prima cosa che tutti notano è il freddo. Colline verdi, caffè e tè sui versanti, pinete, e un clima più vicino agli altipiani kenioti che alla costa. È il centro principale sulla strada Tanzam e sulla ferrovia TAZARA da Dar es Salaam, con cui arriva la maggior parte dei visitatori.\n\nIl motivo per venire è il parco nazionale di Kitulo, un’ora e mezza a est e in quota: un altopiano che i Wabena chiamano Bustani ya Mungu, il Giardino di Dio, e che i botanici mettono tra i grandi siti floristici d’Africa. Vi fioriscono più di quaranta specie di orchidee terrestri, con astri, gigli e lobelie, da dicembre ad aprile. È il solo parco nazionale della Tanzania istituito anzitutto per le sue piante, e ribalta il consiglio consueto: la pioggia è la stagione, non l’ostacolo.\n\nPiù vicino ci sono il lago vulcanico di Ngozi nella sua caldera boscosa, l’arco naturale di Daraja la Mungu con la pentola ribollente di Kijungu sotto, le cascate di Kaporogwe e il monte Rungwe per chi vuole una salita lunga. Matema Beach, sul lago Nyasa, è a quattro ore a sud e in un paese davvero diverso.',
        bestTime:
          'Questa destinazione va contro il resto del sito. Da dicembre ad aprile è stagione delle piogge altrove e stagione della fioritura a Kitulo: è la ragione migliore per essere qui, con fango, nebbia e notti fredde. Da maggio a ottobre è asciutto e limpido, buono per Rungwe, Ngozi e le cascate, ma l’altopiano è bruno. A giugno e luglio le notti in quota rasentano il gelo.',
        travelTips:
          'Portate abiti caldi e impermeabili: si arriva vestiti da safari e si passa il viaggio a sentire freddo. Kitulo richiede un mezzo con buona altezza da terra con l’umido e un permesso dall’ufficio del parco a Mbeya o a Matamba; l’altopiano si cammina, non si gira in auto, quindi mettete in conto una giornata intera e gli scarponi. Ngozi è una salita ripida nel bosco dalla strada, e una guida vale sia per il percorso sia perché l’ultimo tratto è scivoloso. Il treno TAZARA da Dar sono due notti e spesso è in ritardo: irrilevante se lo prendete come il viaggio e non come il transfer.',
      },
    },
  },
];
