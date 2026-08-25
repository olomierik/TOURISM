/**
 * The second batch of German-market guides.
 *
 * The first eight covered the administrative questions — visa, flights, health,
 * insurance, timing, cost. These are the ones a German traveller asks after
 * deciding to go, and one of them is the single most German question in the set:
 * whether to book with a German tour operator or directly with the operator on
 * the ground.
 *
 * That question has a legal answer in Germany that it does not have anywhere
 * else. The Pauschalreiserichtlinie gives a package booked through a German
 * seller insolvency protection and a statutory right to a remedy; booking direct
 * gives neither. A German-language safari site that does not say so plainly is
 * not serving German readers, and no English guide has reason to cover it.
 *
 * As before: German-only. There is no English audience for German package
 * travel law, and inventing one would be padding.
 */

export const germanMarketGuides2 = [
  {
    key: 'de-veranstalter-vor-ort',
    category: 'safaris',
    coverKey: 'serengeti',
    galleryKeys: ['serengeti'],
    readingMinutes: 9,
    featured: true,
    sortOrder: 18,
    locale: 'de',
    title: 'Direkt vor Ort buchen oder über einen deutschen Veranstalter?',
    slug: 'vor-ort-oder-deutscher-veranstalter',
    excerpt:
      'Direkt zu buchen spart 20 bis 40 Prozent. Es kostet Sie den Reisesicherungsschein, das deutsche Pauschalreiserecht und den Gerichtsstand. Was das im Ernstfall bedeutet.',
    body: `**Kurz gesagt:** Wer direkt beim Veranstalter in Arusha oder Nairobi bucht, zahlt typischerweise **20 bis 40 Prozent weniger** als über einen deutschen Reiseveranstalter. Der Aufpreis ist keine reine Marge — er kauft Insolvenzschutz, deutsches Pauschalreiserecht und einen Ansprechpartner in Ihrer Zeitzone. Ob sich das lohnt, hängt davon ab, wie viel Geld im Voraus fließt und wie gut Sie den Veranstalter geprüft haben.

## Was das deutsche Recht ändert

Buchen Sie eine **Pauschalreise bei einem Veranstalter mit Sitz in Deutschland** (oder der EU), greift das Pauschalreiserecht des BGB:

- **Reisesicherungsschein.** Der Veranstalter muss Ihre Anzahlung gegen seine eigene Insolvenz absichern. Geht er pleite, bekommen Sie Ihr Geld zurück und werden gegebenenfalls zurückgeholt. Ohne Schein darf er in Deutschland keine Anzahlung verlangen.
- **Gewährleistung.** Ist die Reise mangelhaft — das Camp existiert nicht, das Fahrzeug fällt aus, die versprochene Leistung fehlt — haben Sie einen gesetzlichen Anspruch auf Minderung.
- **Gerichtsstand.** Sie klagen in Deutschland, auf Deutsch, nach deutschem Recht.

Buchen Sie direkt in Tansania, gilt tansanisches Recht. Ihr Vertragspartner sitzt 7.000 km entfernt. Bei einem Streit über 4.000 Euro ist das faktisch kein durchsetzbarer Anspruch, sondern eine Verhandlung.

## Was der Direktweg dagegen bietet

**Geld.** Bei einer zehntägigen Reise für zwei Personen sind 20 bis 40 Prozent schnell 1.500 bis 3.000 Euro. Das ist kein Rundungsfehler.

**Der Guide.** Beim Direktbuchen wissen Sie, welches Unternehmen fährt. Über einen Vermittler wird die Reise fast immer an genau so einen lokalen Veranstalter weitergegeben — Sie zahlen für eine Schicht dazwischen, ohne zu erfahren, wer am Ende am Steuer sitzt.

**Flexibilität.** Ein lokaler Veranstalter baut Ihnen die Route um, weil er sie selbst fährt. Ein Katalogprodukt tut das nicht.

**Das Geld bleibt vor Ort.** Bei einer Direktbuchung bleibt ein deutlich größerer Anteil in der Region.

## Wie hoch ist das Risiko wirklich?

Der realistische Schadensfall ist nicht Betrug, sondern **Insolvenz zwischen Anzahlung und Reise**. Sie zahlen 30 Prozent sechs Monate vorher, der Rest 30 Tage vorher — bei einem kleinen Anbieter ohne Rücklagen ist das echtes Ausfallrisiko.

Das lässt sich verkleinern, ohne den Aufpreis zu zahlen:

- **Anzahlung klein halten.** 20 bis 30 Prozent ist üblich. Wer 100 Prozent im Voraus verlangt, verlangt zu viel.
- **Restzahlung so spät wie möglich**, idealerweise erst kurz vor Anreise oder vor Ort.
- **Mit Kreditkarte zahlen, wo es geht.** Bei Nichtleistung ist ein Chargeback der praktikabelste Weg zum Geld — deutlich realistischer als eine Klage in Arusha.
- **Auf Verbandsmitgliedschaft prüfen.** TATO in Tansania, KATO in Kenia. KATO betreibt zusätzlich ein Bonding-System, das Kundengelder in gewissem Umfang absichert.
- **Lizenznummer geben lassen und prüfen.** Sie steht in den öffentlichen Registern der Tourismusbehörden.

## Der Mittelweg

Es gibt eine dritte Option, die selten genannt wird: **einen deutschen Veranstalter für das Gerüst, den lokalen für den Rest.** Flug und die erste Nacht über einen deutschen Anbieter mit Sicherungsschein, die Safari direkt. Sie verlieren den Pauschalreiseschutz für den Safariteil, behalten aber einen greifbaren Vertragspartner für die Anreise — und die Anzahlung, die im Ausland liegt, ist kleiner.

## Wann welcher Weg

**Deutscher Veranstalter, wenn:** es Ihre erste Fernreise ist, Sie mit Kindern oder älteren Angehörigen reisen, die Summe für Sie erheblich ist, oder Sie im Problemfall jemanden anrufen wollen, der Ihre Sprache spricht und Ihrem Recht unterliegt.

**Direkt, wenn:** Sie schon einmal so gereist sind, den Veranstalter geprüft haben, die Anzahlung begrenzen können und der Preisunterschied für Sie den Unterschied zwischen Reise und keiner Reise macht.

*Rechtliche Angaben beziehen sich auf das deutsche Pauschalreiserecht (§§ 651a ff. BGB) im Stand 2026 und ersetzen keine Rechtsberatung. Für Österreich und die Schweiz gelten abweichende Regelungen.*`,
  },

  {
    key: 'de-geld-bezahlen',
    category: 'safaris',
    coverKey: 'arusha',
    galleryKeys: ['arusha'],
    readingMinutes: 6,
    featured: false,
    sortOrder: 19,
    locale: 'de',
    title: 'Geld in Ostafrika: Bargeld, Karte und Mobile Money',
    slug: 'geld-bezahlen-ostafrika',
    excerpt:
      'US-Dollar-Scheine älter als Baujahr 2009 werden vielerorts abgelehnt. Euro nützen fast nichts. Und die wichtigste Zahlungsart des Kontinents funktioniert nicht mit Ihrer Karte.',
    body: `**Kurz gesagt:** Nehmen Sie **US-Dollar in kleinen, neuen Scheinen** für Visa, Trinkgeld und Genehmigungen mit, heben Sie Landeswährung am Automaten ab, und rechnen Sie nicht damit, dass Ihre Karte außerhalb von Hotels und Lodges akzeptiert wird. Euro sind fast nirgends direkt verwendbar.

## Die Sache mit den Dollarscheinen

Das überrascht die meisten: **US-Dollar-Noten mit Prägejahr vor 2009 werden in Tansania und Kenia häufig abgelehnt** — von Banken, Wechselstuben und Parkschaltern. Grund sind ältere Fälschungsserien. Ein Schein, den Ihre Bank in Deutschland anstandslos ausgibt, kann am Flughafen Kilimandscharo wertlos sein.

Was Sie brauchen:

- **Baujahr 2009 oder neuer**, besser 2013 oder neuer
- **Sauber und ohne Risse.** Eingerissene Scheine werden abgelehnt.
- **Kleine Stückelung.** 1er, 5er, 10er und 20er für Trinkgeld. Große Scheine bekommen oft einen besseren Kurs, taugen aber nicht zum Trinkgeld.

**Euro helfen kaum.** Manche Wechselstuben in Arusha und Nairobi nehmen sie zu schlechtem Kurs. Visa und Genehmigungen sind in US-Dollar ausgewiesen.

## Karten

**Am Automaten funktioniert es.** Visa breit, Mastercard etwas seltener. Sie bekommen Tansania-Schilling oder Kenia-Schilling, nicht Dollar. Rechnen Sie mit einer Automatengebühr vor Ort plus dem Auslandsentgelt Ihrer Bank; Karten ohne Fremdwährungsgebühr sparen hier spürbar.

**Im Handel meistens nicht.** Lodges, gehobene Restaurants und Reiseveranstalter nehmen Karten, oft mit 3 bis 5 Prozent Aufschlag. Kleine Restaurants, Märkte, Taxis und Kunsthandwerk: Bargeld.

Sagen Sie Ihrer Bank vorher Bescheid. Eine gesperrte Karte am zweiten Tag ist ein vermeidbares Problem.

## Mobile Money — was Sie sehen, aber nicht nutzen können

**M-Pesa in Kenia, Tigo Pesa und M-Pesa in Tansania, MTN Mobile Money in Uganda** sind die dominierende Zahlungsart der Region. Fast jeder Betrieb nimmt sie, viele bevorzugen sie gegenüber Bargeld.

Für Sie sind sie praktisch unerreichbar: Sie brauchen eine lokale SIM und meist eine Registrierung mit Ausweisdokument. Für zwei Wochen lohnt das selten. Erwähnenswert ist es, weil Sie überall „Lipa na M-Pesa" lesen werden und wissen sollten, dass das nicht für Sie gilt.

## Wie viel Bargeld

Für eine zehntägige Safari zu zweit, all-inclusive gebucht:

| Posten | Betrag |
|---|---|
| Trinkgeld Fahrer-Guide | 150 – 250 US$ |
| Trinkgeld Camp-Personal | 160 – 240 US$ |
| Getränke, Souvenirs, Extras | 200 – 400 US$ |
| Visa (2 Personen) | 100 US$ |
| Reserve | 100 US$ |

Also **rund 700 bis 1.100 US$ in bar**, überwiegend in kleinen Scheinen. In den Camps gibt es keine Automaten, und die letzte verlässliche Abhebemöglichkeit liegt oft in Arusha oder Nairobi.

## Praktische Hinweise

- **Wechseln Sie am Flughafen nur wenig** — genug für den ersten Tag. Die Kurse in der Stadt sind besser.
- **Behalten Sie den Wechselbeleg.** Für den Rücktausch verlangt manche Bank ihn.
- **Landeswährung lässt sich außerhalb kaum wechseln.** Geben Sie sie vor der Abreise aus.
- **Zwei Karten, getrennt aufbewahrt.** Eine gesperrte oder geschluckte Karte ist unterwegs schwer zu ersetzen.
- **Nicht auf der Straße wechseln.** Der bessere Kurs ist der Köder.

*Kurse und Gebühren ändern sich laufend. Die Regeln zu Scheinalter und Stückelung sind seit Jahren stabil und werden konsequent angewandt.*`,
  },

  {
    key: 'de-trinkgeld',
    category: 'safaris',
    coverKey: 'ngorongoro',
    galleryKeys: ['ngorongoro'],
    readingMinutes: 5,
    featured: false,
    sortOrder: 20,
    locale: 'de',
    title: 'Trinkgeld auf Safari: wer, wie viel und wann',
    slug: 'trinkgeld-safari',
    excerpt:
      'Trinkgeld ist in Ostafrika Teil des Einkommens, nicht eine Geste. Konkrete Beträge für Guide, Camp-Personal, Träger und Kilimandscharo-Team — und der Fehler, den fast alle machen.',
    body: `**Kurz gesagt:** Rechnen Sie mit **300 bis 500 US$ Trinkgeld für zwei Personen auf einer zehntägigen Safari**. Das ist kein Aufrunden, sondern ein kalkulierter Einkommensbestandteil, und die Beträge sind in der Branche weitgehend etabliert.

Deutsche Reisende geben tendenziell zu wenig — nicht aus Knauserei, sondern weil das deutsche Trinkgeldverständnis (fünf bis zehn Prozent, freiwillig, bei guter Leistung) hier schlicht nicht gilt.

## Die Richtwerte

| Empfänger | Betrag | Einheit |
|---|---|---|
| Fahrer-Guide | 15 – 25 US$ | **pro Tag und Fahrzeug**, nicht pro Person |
| Camp-/Lodge-Personal | 8 – 12 US$ | pro Person und Tag, in die gemeinsame Box |
| Träger (Gorilla-Trekking) | ca. 20 US$ | einmalig |
| Ranger (Gorilla-Trekking) | 10 – 20 US$ | pro Gruppe |
| Kilimandscharo-Team | 200 – 300 US$ | pro Bergsteiger, gesamte Tour |
| Transferfahrer | 5 – 10 US$ | pro Fahrt |

**Der häufigste Fehler:** das Guide-Trinkgeld pro Person zu rechnen statt pro Fahrzeug — oder umgekehrt beim Camp-Personal pro Fahrzeug statt pro Person. Der Guide fährt ein Auto, egal ob zwei oder sechs Leute darin sitzen. Das Camp bedient Personen.

## Der Kilimandscharo ist ein eigener Fall

Ein Team hat schnell zehn bis fünfzehn Personen — Guides, Assistenzguides, Koch, Träger. Die üblichen 200 bis 300 US$ pro Bergsteiger verteilen sich darauf.

Fragen Sie Ihren Veranstalter **vor dem Aufstieg** nach der Teamgröße und der üblichen Aufteilung. Seriöse Anbieter legen das offen; einige folgen den Empfehlungen der Kilimanjaro Porters Assistance Project. Übergeben wird am letzten Tag, meist in einer kleinen Zeremonie.

## Wie übergeben

- **Am Ende, nicht täglich.** Beim Guide zum Abschied, im Camp beim Auschecken.
- **In die gemeinsame Box, wo es eine gibt.** Camps verteilen an alle, auch an Küche und Wäscherei — die Menschen, die Sie nie sehen.
- **Umschlag, wenn möglich.** Üblich und würdiger als Scheine über den Tisch.
- **Kleine US-Dollar-Scheine.** Landeswährung geht auch. Beachten Sie das Scheinalter — siehe den Beitrag zum Bezahlen.

## Was Trinkgeld nicht ist

Es ist **kein Ersatz für faire Bezahlung**, und ein Veranstalter, der niedrige Preise über hohe Trinkgelderwartungen ausgleicht, verlagert seine Lohnkosten auf Sie. Fragen Sie ruhig, was ein Guide pro Tag verdient — wer darauf sauber antwortet, hat meist auch sonst nichts zu verbergen.

Es ist auch **keine Bewertung**. Der übliche Betrag ist der Normalfall, nicht die Höchstnote. Wer außergewöhnlich gut war, bekommt mehr; wer schlecht war, ist ein Fall für ein Gespräch mit dem Veranstalter, nicht für gekürztes Trinkgeld beim Camp-Personal, das nichts dafür kann.

*Beträge sind Richtwerte für 2026 und in der Branche breit etabliert. Ihr Veranstalter nennt Ihnen auf Nachfrage die bei ihm üblichen Sätze.*`,
  },

  {
    key: 'de-packliste',
    category: 'safaris',
    coverKey: 'tarangire-national-park',
    galleryKeys: ['tarangire-national-park'],
    readingMinutes: 6,
    featured: false,
    sortOrder: 21,
    locale: 'de',
    title: 'Packliste Safari: was mit muss und was Sie zu Hause lassen',
    slug: 'packliste-safari',
    excerpt:
      'Buschflieger erlauben oft nur 15 kg in einer weichen Tasche. Was davon wirklich nötig ist, was Sie vor Ort günstiger bekommen — und die Kleidungsfarbe, die ein Problem ist.',
    body: `**Kurz gesagt:** Weiche Tasche statt Hartschalenkoffer, gedeckte Farben, warme Schicht für den Morgen, und deutlich weniger als Sie denken. Auf Inlandsflügen zu den Pisten gilt häufig **15 kg in einer weichen Tasche** — das ist keine Empfehlung, sondern eine Ladebeschränkung.

## Das Gepäckstück selbst

Buschflieger haben schmale Laderäume. **Ein Hartschalenkoffer passt oft nicht hinein**, und das erfahren Sie am Rollfeld, nicht vorher. Nehmen Sie eine weiche Reisetasche oder einen Rucksack.

Was am Flughafen zurückbleibt, wird meist im Hotel in Arusha oder Nairobi eingelagert — planbar, wenn Sie es wissen, ärgerlich, wenn nicht.

## Kleidung

**Gedeckte Farben**: Beige, Oliv, Khaki, Braun, Grau.

Zwei Farben sind ein echtes Problem, nicht Folklore:

- **Dunkelblau und Schwarz ziehen Tsetsefliegen an.** Deren Stich ist schmerzhaft. In Tarangire und Teilen des Nyerere-Nationalparks ist das spürbar.
- **Weiß** ist nach einem halben Tag Staub nicht mehr weiß.

**Tarnmuster ist in Tansania und mehreren Nachbarländern für Zivilisten verboten.** Das gilt auch für Kinderkleidung.

Was reicht:

- 3–4 langärmelige Hemden (Sonne und Insekten)
- 2 lange Hosen, 1 kurze
- **Eine warme Schicht.** Morgens im Ngorongoro sind es 8 °C im offenen Fahrzeug. Das unterschätzen fast alle.
- Leichte Regenjacke
- Feste geschlossene Schuhe plus Sandalen
- Hut mit Krempe, Sonnenbrille

Camps waschen meist täglich für wenige Dollar. Für zehn Tage brauchen Sie keine zehn Garnituren.

## Was wirklich mit muss

- **Fernglas.** Der größte Unterschied zwischen „da ist ein Punkt" und „das ist ein Leopard". 8×42 oder 10×42. Eines pro Person, nicht eines pro Fahrzeug.
- **Ladegerät und Powerbank.** Viele Camps haben Strom nur stundenweise, oft nur im Gemeinschaftsbereich.
- **Reiseadapter Typ G** (britischer Dreipol) für Tansania, Kenia und Uganda. Ruanda nutzt Typ C wie Deutschland.
- **Medikamente in Originalverpackung**, im Handgepäck, mit Beipackzettel.
- **Kopie von Pass, Visum und Impfausweis**, getrennt vom Original.
- **Taschenlampe oder Stirnlampe.** Camps sind nachts dunkel, und das ist beabsichtigt.

## Was Sie zu Hause lassen können

- **Moskitonetz.** Jedes Camp hat eines.
- **Große Mengen Repellent.** Vor Ort erhältlich und oft wirksamer gegen die dortigen Arten.
- **Handtücher.** Werden gestellt.
- **Drohne.** In tansanischen und kenianischen Nationalparks ohne Genehmigung verboten; die Einfuhr kann eine Kaution auslösen.
- **Plastiktüten.** In Ruanda landesweit verboten und am Flughafen Kigali eingezogen. In Kenia sind Einwegplastiktüten ebenfalls untersagt.

## Handgepäck

Ein Tag Kleidung, Medikamente, Kamera, Dokumente. Verlorenes Gepäck erreicht ein Camp in der Serengeti nicht schnell — realistisch gar nicht vor Ende Ihrer Reise.

*Gepäckgrenzen unterscheiden sich zwischen Fluggesellschaften. Die 15-kg-Regel für Buschflieger ist verbreitet, aber prüfen Sie sie für Ihre konkrete Verbindung.*`,
  },

  {
    key: 'de-sansibar-safari',
    category: 'safaris',
    coverKey: 'zanzibar',
    galleryKeys: ['zanzibar'],
    readingMinutes: 6,
    featured: true,
    sortOrder: 22,
    locale: 'de',
    title: 'Safari und Sansibar verbinden: die richtige Reihenfolge',
    slug: 'safari-und-sansibar-verbinden',
    excerpt:
      'Fast jede deutsche Tansania-Reise kombiniert beides. Welche Reihenfolge funktioniert, wie viele Tage jede Hälfte braucht — und warum die Malariaprophylaxe die Planung mitbestimmt.',
    body: `**Kurz gesagt:** **Erst Safari, dann Sansibar.** Sieben bis zehn Tage Safari, danach vier bis sieben Tage Strand. Die Umkehrung funktioniert auch, ist aber schlechter — nach einer Woche Nichtstun um 5:30 Uhr zur Pirschfahrt aufzustehen, fällt spürbar schwerer als andersherum.

## Warum die Reihenfolge zählt

**Die Safari ist der anstrengende Teil.** Frühe Aufstehzeiten, lange Fahrten auf Wellblechpisten, Staub. Der Strand danach ist Erholung — Sie kommen ausgeruht nach Hause statt erschöpft.

**Der Flug passt.** Fast alle Verbindungen aus Europa landen in Kilimandscharo (JRO), von wo die Nordroute beginnt. Von Sansibar fliegen Sie über Daressalam oder direkt zurück. Andersherum verlieren Sie meist einen zusätzlichen Inlandsflug.

**Wetter.** Beide Hälften teilen dieselben Jahreszeiten, aber die Küste ist feuchter und schwüler. Nach der trockenen Hitze der Serengeti empfindet man das als angenehm; umgekehrt fühlt sich die Safari nach der Küste staubiger an.

## Wie viele Tage

**Safari: mindestens fünf, besser sieben bis acht.** Mit vier Tagen sehen Sie Ngorongoro und Tarangire, aber die Serengeti wird zur Hetze. Mit sieben passen Serengeti, Ngorongoro, Tarangire und ein Reservetag hinein.

**Sansibar: vier bis sieben.** Zwei Nächte Stone Town, der Rest am Strand im Nordosten oder Osten. Weniger als vier lohnt den Transfer nicht.

**Insgesamt: zwölf bis sechzehn Tage.** Darunter wird es gedrängt, darüber wird der Strandteil für viele lang.

## Der Übergang

Von Arusha nach Sansibar fliegen Sie — es gibt Direktverbindungen und Verbindungen über Daressalam, Flugzeit gut eine Stunde. Die Alternative über Land dauert zwei Tage und lohnt nur, wenn die Strecke selbst das Ziel ist.

**Planen Sie den Transfertag als Transfertag.** Ein Flug am Vormittag bedeutet einen halben Strandtag; ein Flug am Nachmittag bedeutet einen ganzen verlorenen.

## Die Malariafrage bestimmt mit

Das wird oft übersehen: **die Küste und Sansibar sind Malariagebiet**, teils mit höherem Risiko als die Hochebenen der Nordroute. Ihre Prophylaxe muss die gesamte Reise abdecken **und die vorgeschriebene Zeit nach der Rückkehr** — nicht nur den Safariteil.

Wer die Einnahme nach der Safari beendet, weil „die Tiere ja durch sind", macht genau den Fehler, vor dem Reisemediziner warnen. Sprechen Sie die vollständige Route in der Sprechstunde durch.

## Alternativen zu Sansibar

Sansibar ist voll geworden. Bei gleichem Aufwand gibt es Ruhigeres:

- **Pemba** — Sansibars grüne Schwester, Wandtauchen, sehr wenige Besucher.
- **Mafia Island** — Meerespark, Walhaie in der Saison, kaum Tourismus.
- **Die Küste bei Pangani** — vom Festland erreichbar, spart den Flug.
- **Diani Beach in Kenia**, wenn Ihre Safari in der Masai Mara endet.

## Die häufigsten Planungsfehler

- **Zu wenig Safaritage, zu viel Strand.** Der Strand ist überall auf der Welt zu haben; die Serengeti nicht.
- **Fahrtage als Safaritage zählen.** Fragen Sie, wie viele Tage tatsächlich im Park verbracht werden.
- **Rückflug zu knapp nach dem Inlandsflug.** Buschflüge verschieben sich. Ein Puffertag in Sansibar oder Daressalam vor dem Langstreckenflug ist gut investiert.

*Flugverbindungen und Häufigkeiten ändern sich saisonal; die Reihenfolge und die Tagesaufteilung bleiben.*`,
  },

  {
    key: 'de-fotoausruestung',
    category: 'activities',
    coverKey: 'maasai-mara',
    galleryKeys: ['maasai-mara'],
    readingMinutes: 5,
    featured: false,
    sortOrder: 23,
    locale: 'de',
    title: 'Fotoausrüstung für die Safari: was reicht wirklich',
    slug: 'fotoausruestung-safari',
    excerpt:
      'Ein 400-mm-Objektiv ist nützlicher als ein zweiter Kamerabody. Staub ist der eigentliche Gegner. Und das Wichtigste kostet nichts: der Sitzplatz.',
    body: `**Kurz gesagt:** **Eine Kamera, ein Telezoom bis 400 mm, ein Weitwinkel, doppelt so viele Karten und Akkus wie gedacht, und ein Bohnensack.** Alles darüber hinaus ist Geschmackssache; alles darunter werden Sie bereuen.

## Die Brennweite

**400 mm ist der Richtwert.** Bei 200 mm ist der Löwe ein Fleck in der Bildmitte. Bei 600 mm bekommen Sie das Auge des Geparden, verlieren aber jede Szene, die mehr als das Tier zeigt.

Praktisch bewährt:

- **100–400 mm oder 150–600 mm** als Hauptobjektiv. Der Zoombereich zählt mehr als die letzte Blendenstufe, weil das Motiv sich bewegt und Sie nicht.
- **24–70 mm** für Landschaft, Camp und die Bilder, an die Sie sich später erinnern.
- **Ein Body reicht.** Wer objektivwechselnd im Staub steht, hat den Moment verpasst und den Sensor eingesaubt.

Für Bridge-Kameras gilt dasselbe: Der Zoombereich ist wichtiger als die Megapixel.

## Staub ist das eigentliche Problem

Trockene Savanne im Fahrzeug bedeutet feinen Staub überall.

- **Objektiv nicht im Fahrzeug wechseln.** Wenn es sein muss: Motor aus, Fenster zu, Kamera nach unten.
- **Eine große Plastiktüte oder ein Kamerabeutel** über die Ausrüstung, wenn gefahren wird.
- **Blasebalg statt Pusten.** Feuchtigkeit aus dem Atem bindet Staub am Glas.
- **UV- oder Schutzfilter** — leichter zu ersetzen als eine Frontlinse.

## Der Bohnensack

Ein Stativ ist im Fahrzeug nutzlos. Ein **Bohnensack über der Fensterkante oder dem Dachrand** ist die stabilste und billigste Auflage, die es gibt.

Nehmen Sie den Bezug leer mit und füllen Sie ihn vor Ort mit Reis oder Bohnen — das spart Gepäckgewicht und ist überall zu bekommen.

## Strom und Speicher

- **Doppelt so viele Akkus wie geschätzt.** Camps haben oft nur stundenweise Strom, und Kälte am Morgen kostet Kapazität.
- **Powerbank** mit passendem Ladeweg.
- **Mehr Karten als nötig, und nicht am selben Ort aufbewahrt.** Eine Reihenaufnahme bei einer Flussüberquerung füllt eine Karte schneller, als man denkt.
- **Adapter Typ G** für Tansania, Kenia und Uganda.

## Das Wichtigste kostet nichts

**Der Sitzplatz entscheidet mehr als die Ausrüstung.** Ein Fahrzeug mit sechs Gästen bedeutet, dass jemand über eine Schulter fotografiert. Ein privates Fahrzeug oder eine kleine Gruppe ist für Fotografen der größte Einzelhebel — größer als jedes Objektiv.

Sagen Sie Ihrem Guide, dass Sie fotografieren. Ein guter Guide positioniert das Fahrzeug dann zur Sonne statt einfach nur nah heran, und wartet, statt weiterzufahren. Das ist der Unterschied zwischen Belegbildern und Bildern.

## Drohnen

**In den Nationalparks Tansanias und Kenias ohne behördliche Genehmigung verboten**, und die ist für Privatreisende praktisch nicht zu bekommen. Die Einfuhr kann eine Kaution am Zoll auslösen. Lassen Sie sie zu Hause.

*Regeln zu Drohnen und Fotografie in Schutzgebieten ändern sich; fragen Sie Ihren Veranstalter vor der Abreise.*`,
  },

  {
    key: 'de-kilimandscharo-vorbereitung',
    category: 'activities',
    coverKey: 'kilimanjaro',
    galleryKeys: ['kilimanjaro'],
    readingMinutes: 7,
    featured: false,
    sortOrder: 24,
    locale: 'de',
    title: 'Kilimandscharo: Vorbereitung für Berufstätige',
    slug: 'kilimandscharo-vorbereitung',
    excerpt:
      'Die Gipfelchance hängt mehr an der Anzahl der Tage am Berg als an Ihrer Fitness. Was ein realistisches Training neben einem Vollzeitjob leisten muss — und was nicht.',
    body: `**Kurz gesagt:** Die wichtigste Entscheidung ist die **Routenlänge**, nicht das Trainingspensum. Acht Tage statt sechs heben die Gipfelchance deutlich stärker als jedes Fitnessprogramm. Trainieren Sie dennoch — aber trainieren Sie das Richtige: lange, langsame Belastung, nicht Tempo.

## Warum Tage mehr zählen als Fitness

Die Höhenkrankheit ist der Grund, warum Menschen umkehren, nicht mangelnde Kraft. Sie trifft trainierte Menschen genauso — teils sogar häufiger, weil Fitte schneller aufsteigen und dem Körper die Anpassung nehmen.

Grob und in der Branche unstrittig:

| Routendauer | Gipfelchance |
|---|---|
| 5 Tage (Marangu) | unter 50 % |
| 6 Tage | rund 65 % |
| 7 Tage | rund 80 % |
| 8 Tage (Lemosho, Nordroute) | 85 – 90 % |

Zwei zusätzliche Tage kosten einige hundert Euro. Ein abgebrochener Aufstieg kostet die ganze Reise.

## Was ein realistisches Training leisten muss

Sie brauchen keine Bergsteigerfitness. Sie brauchen die Fähigkeit, **fünf bis sieben Stunden am Tag zu gehen, mehrere Tage hintereinander, und am Gipfeltag nach vier Stunden Schlaf noch einmal sechs bis acht Stunden bergauf.**

Was neben einem Vollzeitjob funktioniert, über etwa drei Monate:

- **Eine lange Wanderung pro Woche.** Vier bis sechs Stunden, mit dem Rucksack, den Sie mitnehmen. Das ist die eine Einheit, die nicht ersetzbar ist.
- **Zwei- bis dreimal Ausdauer** von 45 bis 60 Minuten. Laufen, Rad, Crosstrainer — Hauptsache regelmäßig.
- **Treppen.** Bergauf ist die Bewegung; Treppenhaus oder Stepper bilden sie besser ab als jedes Laufband.
- **Etwas Rumpf- und Beinkraft**, zweimal die Woche, kurz.

Was **nicht** hilft: Intervalltraining auf Tempo. Am Berg gehen Sie langsamer, als Sie es für möglich halten — „pole pole" ist keine Floskel, sondern die Technik.

## Ohne Berge in der Nähe

Ein Großteil der deutschen Kilimandscharo-Besteiger wohnt im Flachland. Das ist kein Ausschlusskriterium.

- **Länge ersetzt Höhenmeter.** Sechs Stunden flach mit Rucksack bereiten besser vor als eine Stunde steil.
- **Ein Wochenende in Mittelgebirge oder Alpen** vor der Reise ist wertvoll, vor allem für Schuhe und Ausrüstung.
- **Höhentraining zu Hause bringt nichts Belegbares.** Die Anpassung passiert am Berg, und dafür sind die zusätzlichen Tage da.

## Was Sie mit einer Ärztin besprechen sollten

Getrennt vom Malaria- und Impfgespräch:

- **Höhenprophylaxe** — ob sie für Sie sinnvoll ist, hängt an Route, Dauer und Vorgeschichte.
- **Vorerkrankungen**, besonders Herz, Lunge und Blutdruck.
- **Wechselwirkungen** mit der Malariaprophylaxe, die Sie ohnehin nehmen.
- **Wie Sie Symptome erkennen** und warum das Absteigen die einzige verlässliche Behandlung ist.

## Ausrüstung, die den Unterschied macht

- **Eingelaufene Schuhe.** Neue Schuhe am Berg sind der zweithäufigste Abbruchgrund nach der Höhe.
- **Schichten statt einer dicken Jacke.** Am Gipfeltag geht es von −10 °C zurück auf +25 °C.
- **Handschuhe und Mütze.** Die Gipfelnacht ist der kälteste Teil.
- **Stöcke.** Der Abstieg belastet die Knie stärker als der Aufstieg.

Vieles davon lässt sich in Moshi oder Arusha leihen — außer den Schuhen.

## Und das Team

Ein Aufstieg trägt zehn bis fünfzehn Menschen. Fragen Sie Ihren Veranstalter nach Löhnen, Traglasten und Ausrüstung des Personals. Anbieter, die den Kilimanjaro Porters Assistance Project folgen, legen das offen — und ein Veranstalter, der bei dieser Frage ausweicht, spart die Kosten irgendwo.

*Erfolgsquoten sind Branchenrichtwerte und schwanken zwischen Anbietern und Jahreszeiten. Medizinische Entscheidungen gehören in eine reisemedizinische Sprechstunde.*`,
  },
];
