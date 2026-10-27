/**
 * English editions of the German-market guides that have an English audience.
 *
 * The German set was written single-locale on purpose, and the reasoning in
 * guides-de-market.mjs still holds for most of it: nobody searches in English
 * for which visa a German passport needs, or whether the Sommerferien fall in a
 * good month. That argument was applied to the whole batch, though, and it does
 * not survive contact with the list. Tipping, money, camera gear, travelling
 * with children, vaccinations — none of those change with the reader's passport,
 * and all of them were sitting behind a language wall on a site whose default
 * locale is English. See docs/ADSENSE-CONTENT-AUDIT.md, item 1.
 *
 * Five of the fifteen are deliberately absent:
 *
 *   - safari-kosten-euro already has an English counterpart. tanzania-safari-cost
 *     answers the same question for a reader who does not need the arithmetic
 *     done in euros, and a second English article on it is the scaled content
 *     this site is trying to stop producing, not a fix for it.
 *   - fluege-ostafrika-deutschland is a routing guide for departures from
 *     Frankfurt, Vienna and Zurich. The English version would have to invent
 *     routes to be worth reading.
 *   - reiseversicherung-safari is about German insurance products, and the
 *     cover a reader already holds — through a card, an employer, a national
 *     scheme — differs so completely by country that the English version would
 *     be guesswork dressed as advice.
 *   - safari-schulferien is built on the German school-holiday calendar.
 *   - deutschsprachige-safari-guides asks whether a German-speaking guide is
 *     worth the surcharge. English is the default language of the industry, so
 *     in English the question has no premise.
 *
 * packliste-safari and safari-und-sansibar-verbinden were on that absent list
 * too, on the same claim — that English counterparts already existed. They did
 * not. The English set has no packing list and nothing on combining a safari
 * with the coast, and neither topic turns on the reader's passport. Both are
 * published here, which is why this file holds ten guides and not eight.
 *
 * visum-ostafrika-deutsche-reisende looks like a second duplicate and is not.
 * The English tanzania-visa-requirements covers Tanzania alone; the East Africa
 * Tourist Visa that Kenya, Uganda and Rwanda share is a different permit with
 * different traps. That one is reframed rather than translated, and says where
 * the two meet.
 *
 * These are adaptations, not translations. Where the German text leans on German
 * law or German departure points, the English text states which jurisdiction a
 * claim belongs to instead of quietly generalising it — a reader in Ohio and a
 * reader in Manchester do not have the same consumer protection, and pretending
 * otherwise would be worse than saying nothing.
 *
 * Every figure is the German author's, carried across with its hedge intact. No
 * price, fee or success rate was invented here.
 */

export const germanMarketGuidesEnglish = [
  {
    key: 'de-veranstalter-vor-ort',
    title: 'Book direct with the operator, or through an agency at home?',
    slug: 'book-direct-or-through-an-agency',
    excerpt:
      'Booking direct saves 20 to 40 per cent. It costs you the financial protection, the consumer law and the courts of your own country. What that means when something goes wrong.',
    body: `**Short version:** booking straight with the operator in Arusha or Nairobi typically costs **20 to 40 per cent less** than the same trip sold by an agency at home. The difference is not pure margin — it buys insolvency cover, consumer law you can actually use, and somebody to call in your own time zone. Whether that is worth paying for depends on how much money leaves your account before you travel, and how carefully you checked the operator.

## What booking at home actually buys

This is the part that varies most by where you live, so be precise about which rules apply to you.

**In the UK**, a holiday sold as a package by a UK business falls under the Package Travel and Linked Travel Arrangements Regulations 2018. The organiser must protect your money against its own failure, and if the trip is not what was sold you have a statutory remedy. A package that includes a flight is usually covered by ATOL on top of that.

**In the EU**, the Package Travel Directive gives broadly the same two things: insolvency protection for money paid up front, and liability sitting with the organiser rather than with each supplier down the chain.

**In the United States**, there is no federal equivalent. Seller-of-travel registration exists in a handful of states, and a few of those run restitution funds, but a US traveller booking a safari is mostly relying on their credit card and the operator's reputation — the same tools as someone booking direct.

Book directly in Tanzania and Tanzanian law governs the contract wherever you live. Your counterparty is several thousand miles away. On a disputed four thousand dollars, that is not really an enforceable claim. It is a negotiation.

## What the direct route gives you instead

**Money.** On a ten-day trip for two, 20 to 40 per cent is quickly 1,500 to 3,000 dollars. That is not a rounding error.

**You know who is driving.** Book direct and you know which company runs the trip. Through an intermediary, the work is almost always passed to exactly such a local operator — you are paying for a layer in between without being told who ends up at the wheel.

**Flexibility.** A local operator will rebuild the route for you because they are the ones driving it. A catalogue product will not.

**The money stays in the region.** A markedly larger share of a direct booking stays where the trip happens.

## How big is the risk, honestly

The realistic failure is not fraud. It is **insolvency between your deposit and your arrival**. You pay 30 per cent six months out and the balance 30 days out; with a small operator holding no reserves, that is genuine exposure.

You can shrink it without paying the markup:

- **Keep the deposit small.** 20 to 30 per cent is normal. Anyone asking for 100 per cent up front is asking for too much.
- **Pay the balance as late as possible**, ideally close to arrival or on the ground.
- **Use a credit card wherever you can.** If the service is never delivered, a chargeback is the most practical route to your money — far more realistic than litigation in Arusha.
- **Check trade association membership.** TATO in Tanzania, KATO in Kenya. KATO also runs a bonding scheme that secures client money to a degree.
- **Ask for the licence number and check it.** It is in the tourism authority's public register.

## The middle path

There is a third option that rarely gets mentioned: **the agency at home for the frame, the local operator for the rest.** Flights and the first night through a protected seller, the safari direct. You give up package protection on the safari, but you keep a reachable counterparty for getting there — and the money sitting overseas is a smaller sum.

## Which way, when

**Through an agency at home if:** it is your first long-haul trip, you are travelling with children or older relatives, the sum is significant to you, or you want to be able to ring somebody who speaks your language and answers to your courts.

**Direct if:** you have travelled this way before, you have checked the operator, you can cap the deposit, and the price difference is the difference between going and not going.

*Legal points describe UK, EU and US consumer frameworks in general terms as at 2026 and are not legal advice. Rules differ by country and change; confirm what applies where you book.*`,
  },

  {
    key: 'de-geld-bezahlen',
    title: 'Money in East Africa: cash, cards and mobile money',
    slug: 'money-in-east-africa',
    excerpt:
      'US dollar notes printed before 2009 are refused in many places. The continent’s most important payment method will not work with your card. How much cash to actually carry.',
    body: `**Short version:** bring **US dollars in small, recent notes** for visas, tips and permits, draw local currency from an ATM, and do not assume your card will be accepted outside hotels and lodges.

## The thing about dollar bills

This catches most people out: **US dollar notes with a series date before 2009 are frequently refused in Tanzania and Kenya** — by banks, bureaux de change and park gates. The reason is older counterfeit series. A note your own bank hands over without comment can be worthless at Kilimanjaro airport.

What you need:

- **Series 2009 or newer**, 2013 or newer is safer.
- **Clean and untorn.** Torn notes get refused.
- **Small denominations.** Ones, fives, tens and twenties for tipping. Large notes often get a better rate but are useless as tips.

Other currencies help less than you would think. Some bureaux in Arusha and Nairobi will take euros or pounds at a poor rate. Visas and permits are quoted in US dollars.

## Cards

**ATMs work.** Visa is widely accepted, Mastercard somewhat less so. You get Tanzanian or Kenyan shillings, not dollars. Expect a local machine fee on top of your own bank's foreign transaction charge; a card without foreign-currency fees saves a noticeable amount here.

**In shops, usually not.** Lodges, better restaurants and tour operators take cards, often with a 3 to 5 per cent surcharge. Small restaurants, markets, taxis and craft stalls: cash.

Tell your bank before you go. A blocked card on day two is an avoidable problem.

## Mobile money — what you will see and cannot use

**M-Pesa in Kenya, M-Pesa and Tigo Pesa in Tanzania, MTN Mobile Money in Uganda** are the dominant payment method in the region. Almost every business takes them and many prefer them to cash.

For you they are effectively out of reach: you need a local SIM and usually a registration with identity documents. For two weeks that rarely pays off. It is worth knowing because you will see "Lipa na M-Pesa" everywhere, and it does not mean you.

## How much cash

For a ten-day safari for two, booked all-inclusive:

| Item | Amount |
|---|---|
| Tip, driver-guide | 150 – 250 US$ |
| Tip, camp staff | 160 – 240 US$ |
| Drinks, souvenirs, extras | 200 – 400 US$ |
| Visas (2 people) | 100 US$ |
| Reserve | 100 US$ |

So **roughly 700 to 1,100 US dollars in cash**, mostly in small notes. There are no ATMs in the camps, and the last reliable one is often in Arusha or Nairobi.

## Practical notes

- **Change only a little at the airport** — enough for the first day. Rates in town are better.
- **Keep the exchange receipt.** Some banks want it to change money back.
- **Local currency is hard to exchange once you leave.** Spend it before you fly.
- **Two cards, kept in different places.** A blocked or swallowed card is hard to replace on the road.
- **Do not change money on the street.** The better rate is the bait.

*Rates and fees move constantly. The rules on note age and denomination have been stable for years and are applied consistently.*`,
  },

  {
    key: 'de-trinkgeld',
    title: 'Tipping on safari: who, how much and when',
    slug: 'tipping-on-safari',
    excerpt:
      'Tipping in East Africa is part of the income, not a gesture. Concrete amounts for guide, camp staff, porters and a Kilimanjaro team — and the mistake almost everyone makes.',
    body: `**Short version:** budget **300 to 500 US dollars in tips for two people on a ten-day safari**. This is not rounding up. It is a calculated part of people's income, and the rates are well established across the industry.

## The going rates

| Recipient | Amount | Per |
|---|---|---|
| Driver-guide | 15 – 25 US$ | **per day, per vehicle** — not per person |
| Camp or lodge staff | 8 – 12 US$ | per person per day, into the communal box |
| Porter (gorilla trekking) | about 20 US$ | one-off |
| Ranger (gorilla trekking) | 10 – 20 US$ | per group |
| Kilimanjaro crew | 200 – 300 US$ | per climber, whole trek |
| Transfer driver | 5 – 10 US$ | per transfer |

**The most common mistake:** counting the guide's tip per person instead of per vehicle — or the reverse with camp staff, per vehicle instead of per person. The guide drives one car whether two people or six are sitting in it. The camp serves people.

## Kilimanjaro is its own case

A crew is quickly ten to fifteen people — guides, assistant guides, cook, porters. The usual 200 to 300 dollars per climber is divided among them.

Ask your operator **before the climb** about crew size and the usual split. Reputable outfits state it openly; some follow the recommendations of the Kilimanjaro Porters Assistance Project. It is handed over on the last day, usually in a short ceremony.

## How to hand it over

- **At the end, not daily.** To the guide when you part, at the camp when you check out.
- **Into the communal box where there is one.** Camps share it out across everyone, including kitchen and laundry — the people you never see.
- **In an envelope if you can.** It is customary, and more dignified than notes across a table.
- **Small US dollar notes.** Local currency is fine too. Mind the note age — see the guide on paying.

## What a tip is not

It is **not a substitute for fair pay**, and an operator who offsets low prices against high tipping expectations is shifting their wage bill onto you. Ask what a guide earns per day. An operator who answers that cleanly usually has nothing else to hide either.

It is also **not a score**. The usual amount is the normal case, not full marks. Someone exceptional gets more; someone poor is a conversation with the operator, not a reason to cut the tip for camp staff who had nothing to do with it.

*Amounts are 2026 guide figures and broadly established across the industry. Your operator will tell you the rates they work with if you ask.*`,
  },

  {
    key: 'de-fotoausruestung',
    title: 'Camera gear for a safari: what actually earns its weight',
    slug: 'safari-camera-gear',
    excerpt:
      'A 400 mm lens is more useful than a second body. Dust is the real enemy. And the thing that matters most costs nothing at all: where you sit.',
    body: `**Short version:** **one camera, a telephoto zoom reaching 400 mm, a wide lens, twice as many cards and batteries as you think, and a beanbag.** Anything beyond that is taste. Anything less you will regret.

## Focal length

**400 mm is the number.** At 200 mm the lion is a smudge in the middle of the frame. At 600 mm you get the cheetah's eye and lose every picture that shows more than the animal.

What works in practice:

- **100–400 mm or 150–600 mm** as the main lens. Zoom range matters more than the last stop of aperture, because the subject moves and you cannot.
- **24–70 mm** for landscape, camp, and the pictures you will actually remember later.
- **One body is enough.** Changing lenses in the dust means you missed the moment and dirtied the sensor.

The same holds for bridge cameras: reach beats megapixels.

## Dust is the real problem

Dry savannah in an open vehicle means fine dust in everything.

- **Do not change lenses in the vehicle.** If you must: engine off, windows up, camera pointing down.
- **A large plastic bag or a camera cover** over the kit while driving.
- **A blower, not your breath.** Moisture from breath binds dust to the glass.
- **A UV or protective filter** — cheaper to replace than a front element.

## The beanbag

A tripod is useless in a vehicle. A **beanbag over the window edge or the roof rail** is the steadiest and cheapest support there is.

Bring the empty cover and fill it on arrival with rice or beans. It saves luggage weight and the filling is available anywhere.

## Power and storage

- **Twice as many batteries as you estimate.** Camps often have power only for part of the day, and cold mornings cost capacity.
- **A power bank** with the right cable for your charger.
- **More cards than you need, kept in different places.** A burst at a river crossing fills a card faster than you would believe.
- **A type G adapter** for Tanzania, Kenya and Uganda. Rwanda uses type C.

## The thing that matters most costs nothing

**Where you sit decides more than what you own.** A vehicle with six guests means somebody is shooting over a shoulder. A private vehicle or a small group is the single biggest lever a photographer has — bigger than any lens.

Tell your guide you are photographing. A good guide will then position the vehicle for the light rather than simply driving close, and will wait instead of moving on. That is the difference between records and pictures.

## Drones

**Banned in Tanzanian and Kenyan national parks without an official permit**, and that permit is effectively unobtainable for private travellers. Bringing one in can trigger a customs bond. Leave it at home.

*Rules on drones and photography in protected areas change; ask your operator before you travel.*`,
  },

  {
    key: 'de-kilimandscharo-vorbereitung',
    title: 'Kilimanjaro: training around a full-time job',
    slug: 'kilimanjaro-training-for-working-people',
    excerpt:
      'Your chance of reaching the summit depends more on how many days you spend on the mountain than on how fit you are. What realistic training has to deliver — and what it cannot.',
    body: `**Short version:** the decisive choice is **the length of the route**, not the size of your training plan. Eight days instead of six raises your summit chance far more than any fitness programme will. Train anyway — but train the right thing: long and slow, not fast.

## Why days matter more than fitness

Altitude sickness is why people turn back, not lack of strength. It hits fit people just as hard — sometimes harder, because fit people climb faster and deny their bodies the time to adapt.

Roughly, and not disputed in the industry:

| Route length | Summit rate |
|---|---|
| 5 days (Marangu) | under 50% |
| 6 days | around 65% |
| 7 days | around 80% |
| 8 days (Lemosho, Northern Circuit) | 85 – 90% |

Two extra days cost a few hundred dollars. An abandoned climb costs the whole trip.

## What realistic training has to deliver

You do not need mountaineering fitness. You need the ability to **walk five to seven hours a day, several days running, and then on summit day, after four hours of sleep, climb for another six to eight.**

What fits around a full-time job, over about three months:

- **One long walk a week.** Four to six hours, carrying the pack you will actually bring. This is the session that cannot be substituted.
- **Two or three cardio sessions** of 45 to 60 minutes. Running, cycling, cross-trainer — regularity is the point.
- **Stairs.** Uphill is the movement; a stairwell or a stepper models it better than any treadmill.
- **A little core and leg strength**, twice a week, briefly.

What does **not** help: interval work for speed. On the mountain you walk more slowly than you believe is possible. "Pole pole" is not a slogan, it is the technique.

## If you live nowhere near a mountain

Most people who climb Kilimanjaro live somewhere flat. It is not a disqualification.

- **Duration substitutes for ascent.** Six hours on the flat with a pack prepares you better than one hour of steep.
- **A weekend in hills or mountains** before you travel is worth it, mostly for testing boots and kit.
- **Altitude training at home has no demonstrable benefit.** Adaptation happens on the mountain, which is what the extra days are for.

## What to discuss with a doctor

Separately from the malaria and vaccination conversation:

- **Altitude medication** — whether it makes sense for you depends on route, duration and history.
- **Pre-existing conditions**, particularly heart, lungs and blood pressure.
- **Interactions** with the malaria prophylaxis you will be taking anyway.
- **How to recognise symptoms**, and why descending is the only reliable treatment.

## Kit that changes the outcome

- **Broken-in boots.** New boots on the mountain are the second most common reason for turning back, after altitude.
- **Layers, not one thick jacket.** Summit day runs from about −10 °C back up to +25 °C.
- **Gloves and a warm hat.** The summit night is the coldest part.
- **Poles.** The descent punishes knees more than the climb does.

Much of this can be hired in Moshi or Arusha — except the boots.

## And the crew

A climb carries ten to fifteen people. Ask your operator about wages, load limits and the crew's own equipment. Operators who follow the Kilimanjaro Porters Assistance Project will tell you openly — and one who dodges the question is saving that money somewhere.

*Success rates are industry guide figures and vary between operators and seasons. Medical decisions belong with a travel health professional.*`,
  },

  {
    key: 'de-visum-ostafrika',
    title: 'The East Africa Tourist Visa: one permit, three countries',
    slug: 'east-africa-tourist-visa',
    excerpt:
      'Kenya, Uganda and Rwanda share a 100 US$ visa. Tanzania is not in it. Two rules about which country issues yours, and where it stops being valid, catch people at the border.',
    body: `**Short version:** Kenya, Uganda and Rwanda share one permit, the **East Africa Tourist Visa**, at 100 US dollars for 90 days. **Tanzania is not part of it** and runs its own e-visa. So a trip combining the Serengeti with gorillas needs two permits — and the order in which you cross borders decides where you apply.

For Tanzania on its own, see the guide to Tanzanian visa requirements. This one is about the shared permit and the two rules that catch people out.

## The shared permit

The East Africa Tourist Visa covers **Kenya, Uganda and Rwanda**. It costs 100 US dollars, runs 90 days, allows any number of movements between the three countries, and cannot be extended.

Two rules get overlooked again and again:

- **The issuing country must be the first one you enter.** Arriving via Nairobi means applying to Kenya. Landing in Kigali means applying to Rwanda. A visa issued by Uganda for a trip that starts in Nairobi is a problem at the desk.
- **It expires if you leave the three-country block.** A stopover in Zanzibar ends it, because Zanzibar is Tanzania. Returning to Kenya afterwards would need a new permit.

You apply online through the portal of whichever country you enter first. You submit a passport copy valid at least six months, a photo, a return ticket, an itinerary and a **yellow fever certificate**.

## Tanzania goes its own way

Tanzania deliberately stayed out of the agreement and runs a separate e-visa portal. The ordinary tourist visa costs **50 US dollars** (2026) for most nationalities; **US citizens pay 100 US dollars** for a multiple-entry visa. Zanzibar counts as Tanzania — no separate visa for it, but a Tanzanian one is certainly required.

Apply two to three weeks before you travel. The portal is reliable, not fast.

## Rwanda: the simplest case

Rwanda issues a visa on arrival to **all nationalities**, 30 days for 50 US dollars, at Kigali airport and at every land crossing. You can do it in advance through the Irembo portal. For a gorilla trip to Rwanda alone, that is the entire administrative burden.

## Which permit pays off

| Route | Sensible choice |
|---|---|
| Tanzania only (Serengeti, Kilimanjaro, Zanzibar) | Tanzanian e-visa, 50 US$ |
| Rwanda only (gorillas) | Visa on arrival, 50 US$ |
| Kenya + Uganda, or Kenya + Rwanda | East Africa Tourist Visa, 100 US$ |
| Kenya only | Single-country permit — usually cheaper than 100 US$ |
| Tanzania + Rwanda | Two visas, about 100 US$ together |

For only one of the three block countries the shared visa does not pay. It starts making sense at the second.

## The yellow fever certificate

It is written into the requirements for the shared visa and it is checked at land borders, particularly when you arrive from a country where yellow fever occurs. Carry the certificate even on a direct flight from Europe or North America: the rules distinguish between country of origin and country of transit, and interpretation varies between border posts.

More on that in the guide to vaccinations and malaria.

## Practical notes

- **Passport valid at least six months beyond your return**, with two free pages. This is genuinely checked.
- **Pay only through the official portals.** Plenty of intermediaries sell the identical permit with a markup.
- **Print the approval.** Mobile coverage at a border post is often gone.
- **Plan the border order before you apply**, not after. It cannot be changed retrospectively.

*Fees are as at 2026 and come from the issuing authorities — for the shared visa, Uganda's Directorate of Citizenship and Immigration Control. They change; check the official portal of the relevant country before you book.*`,
  },

  {
    key: 'de-safari-mit-kindern',
    title: 'Safari with children: age limits, malaria and the right parks',
    slug: 'safari-with-children',
    excerpt:
      'Some camps take nobody under twelve. Gorilla trekking is closed under fifteen. And the long drives are the real obstacle — not the animals.',
    body: `**Short version:** a safari with children works well if you keep **driving time** short and choose parks accordingly. The obstacle is not the animals, and rarely the accommodation. It is six hours on a corrugated track with a six-year-old.

## Hard age limits

Some of this is not negotiable:

- **Gorilla and chimpanzee trekking: 15 and over.** This applies in Uganda and Rwanda without exception. A family with younger children cannot visit gorillas, and that has to be clear before the trip is planned, not after.
- **Many camps set a minimum age**, commonly 6, 8 or 12. Unfenced camps in wilderness areas tend to be strictest, for good reason.
- **Balloon flights** usually require a minimum height rather than an age — in practice from about seven.
- **Kilimanjaro** has a formal minimum of 10. Whether that is wise is another question.

Settle this **before** booking. A camp turning your child away at reception is a ruined holiday.

## Malaria is the more serious question with children

Malaria is more severe and faster-moving in small children. Prophylaxis options are more limited, dosing is by weight, and some drugs are not licensed below an age threshold.

That belongs in a travel health consultation, **early** — not two weeks before departure. With very small children the answer may be to postpone the trip by a few years or choose a lower-risk area.

Altitude lowers the risk considerably. The Ngorongoro crater, the highlands and Nairobi sit better than the coast or the low-lying parks.

## Parks that work with children

**Ngorongoro Crater (Tanzania).** Probably the best family park in East Africa. Everything sits inside one manageable bowl, the drive down from the rim is short, and the density of animals is high enough that there are no long stretches without a sighting. The altitude means lower malaria risk.

**Tarangire (Tanzania).** Elephant herds, enormous baobabs, short distances. Elephants work better with children than any other animal — they are big, close, and doing something.

**Lake Manyara (Tanzania).** Small, drivable in half a day, good as a stop between others.

**Nairobi National Park (Kenya).** On the edge of the city, half a day is enough, and the neighbouring Giraffe Centre and elephant orphanage are often the highlight of the entire trip for children.

**Lake Nakuru (Kenya).** Compact, fenced, very reliable rhino sightings.

## What to avoid

**The northern Serengeti** on a short trip. From Seronera to the river crossings is four hours — each way, on bad track.

**Tanzania's southern parks** (Ruaha, Nyerere) on a first trip with children. Superb, but remote, with long approaches.

**Packed itineraries that move every day.** Two nights per camp is the minimum, three is better.

## What experience teaches

- **A private vehicle** rather than a group tour. The surcharge is the single biggest lever: you can cut a drive short when a child has had enough, and your own driver is usually remarkably patient with children.
- **Morning drive, afternoon at the pool.** Full-day game drives do not work with children.
- **One pair of binoculars per child.** It sounds like a detail. It changes their attention completely.
- **No fighting over window seats.** Book a vehicle with enough seats that everyone has a window.
- **Family tents or connecting rooms** — ask early. Every camp has only a few.

## The right age

From about **six to eight** it becomes markedly easier: children remember it, last a game drive, and understand why they have to stay in the vehicle.

Under four it is mostly a holiday for the parents, with considerable effort attached.

From **fifteen**, gorilla trekking opens up — for families with teenagers that is often the reason the trip is planned this way at all.

*Age limits at individual camps and operators vary; the limits for gorilla trekking and national parks are set by the authorities. Ask every property before you book.*`,
  },

  {
    key: 'de-impfungen-malaria',
    title: 'Vaccinations and malaria protection for East Africa',
    slug: 'vaccinations-and-malaria-east-africa',
    excerpt:
      'Yellow fever is an entry requirement in places, not just a recommendation. Malaria protection belongs with a doctor. What to prepare, and what to ask in the consultation.',
    body: `**Before anything else:** this is not medical advice, and it deliberately names no drug and no dose. It says **what to raise** and **how much lead time you need**. The decision belongs to a travel health professional with your history in front of them.

**Book the appointment six to eight weeks before departure.** Some vaccines need several doses weeks apart, and yellow fever protection is only considered effective ten days after the injection.

## Yellow fever: an entry question, not only a health one

This is the one that ends trips.

The **yellow fever certificate is written into the requirements of the East Africa Tourist Visa** and is checked at land borders. Whether it is demanded depends on which country you arrive from and where you transited — the rules distinguish origin from transit, and interpretation varies between border posts.

In practice: **carry the certificate**, even arriving direct from Europe or North America. An international certificate weighs nothing. A refused entry costs the trip.

Yellow fever may only be given at designated vaccination centres. Not every family practice is one.

## Malaria: the actual risk

Malaria is present across large parts of Tanzania, Kenya, Uganda and Rwanda. The risk is real and unevenly distributed — it depends on altitude, season and region. The Ngorongoro highlands and Nairobi sit high enough for the risk to be low; the coast, Lake Victoria and the lower-lying parks are risk areas.

Raise in the consultation:

- **Your exact route, with altitudes and month of travel.** "Tanzania" is not enough information.
- **Interactions** with any medication you take regularly.
- **Tolerability** — the prophylaxis options differ substantially in side effects, dosing schedule and price.
- **How long after you get home** you must keep taking it. This is where people stop early, and that is exactly when it is dangerous.

**Avoiding bites is not a side issue.** Long clothing from dusk, repellent at adequate concentration, a bed net. The mosquito that carries malaria bites in the evening and at night — which is to say, during dinner at the camp.

## Other things for the conversation

- **Routine vaccinations**, particularly tetanus, diphtheria, polio and measles. Frequently overdue.
- **Hepatitis A**, essentially always a topic for travel in the region.
- **Hepatitis B**, **typhoid** and **rabies** depending on how and how long you travel, and how close you get to animals. Rabies comes up regularly for gorilla and chimpanzee trekking.
- **Meningococcal disease** depending on route and season.

## Altitude, if you are climbing Kilimanjaro

Kilimanjaro is not a medical footnote. Altitude sickness is the commonest reason for turning back and the only serious danger on the mountain. Raise it separately — the altitude question is not the malaria question, and the answer depends on your route and its length.

## Gorilla trekking: you are protecting the animals too

Gorillas catch human respiratory infections and have no immunity to them. **Anyone visibly ill is not taken along** — the rule is enforced, and the permit, at 800 to 1,500 US dollars, is not refunded.

That is one reason to hold travel insurance that covers falling ill on the day.

## Before you leave

- **Scan** your vaccination record and yellow fever certificate and keep the copies separately from the originals.
- Carry medication in its **original packaging with the leaflet**, in hand luggage.
- Keep a list of your regular medication by **generic name**, not brand name — brand names differ between countries.

*Vaccination guidance and entry rules change. What binds is the advice of your travel health professional and your own government's current guidance for the country you are visiting.*`,
  },
  {
    key: 'de-packliste',
    title: 'Safari packing list: what earns its place and what stays at home',
    slug: 'safari-packing-list',
    excerpt:
      'Bush flights often allow 15 kg in a soft bag. What that actually leaves room for, what is cheaper bought on arrival — and the two clothing colours that cause real problems.',
    body: `**Short version:** a soft bag rather than a hard case, muted colours, one warm layer for the mornings, and considerably less than you think. Domestic flights to the airstrips commonly cap you at **15 kg in a soft bag** — not a suggestion but a loading limit.

## The bag itself

Bush planes have narrow holds. **A hard shell case often will not fit**, and you find that out on the apron rather than in advance. Bring a soft holdall or a rucksack.

Whatever has to stay behind is usually stored at your hotel in Arusha or Nairobi — manageable if you were expecting it, infuriating if you were not.

## Clothing

**Muted colours**: beige, olive, khaki, brown, grey.

Two colours are a genuine problem rather than folklore:

- **Dark blue and black attract tsetse flies.** The bite hurts. In Tarangire and parts of Nyerere National Park you will notice the difference.
- **White** stops being white after half a day of dust.

**Camouflage print is illegal for civilians in Tanzania and several neighbouring countries.** That includes children's clothing.

What is enough:

- 3–4 long-sleeved shirts (sun and insects)
- 2 pairs of long trousers, 1 pair of shorts
- **One warm layer.** Mornings in the Ngorongoro Crater are around 8 °C in an open vehicle. Almost everybody underestimates this.
- A light waterproof
- Closed shoes plus sandals
- Brimmed hat, sunglasses

Most camps do laundry daily for a few dollars. Ten days does not need ten outfits.

## What genuinely has to come

- **Binoculars.** The single biggest difference between "there is a dot" and "that is a leopard". 8×42 or 10×42. One per person, not one per vehicle.
- **Charger and power bank.** Many camps have electricity only for part of the day, and often only in the communal area.
- **A Type G adapter** — the British three-pin — for Tanzania, Kenya and Uganda. Rwanda uses Type C.
- **Medication in its original packaging**, in your hand luggage, with the patient information leaflet.
- **Copies of your passport, visa and vaccination record**, kept separately from the originals.
- **A torch or head torch.** Camps are dark at night, and that is deliberate.

## What can stay at home

- **A mosquito net.** Every camp has them.
- **Bulk insect repellent.** Available locally, and often more effective against the species that are actually there.
- **Towels.** Provided.
- **A drone.** Banned without a permit in Tanzanian and Kenyan national parks, and bringing one in can trigger a deposit at customs.
- **Plastic bags.** Banned nationwide in Rwanda and confiscated at Kigali airport. Single-use plastic bags are prohibited in Kenya too.

## Hand luggage

One day of clothes, your medication, the camera, the documents. Delayed baggage does not reach a camp in the Serengeti quickly — realistically it may not reach you before you fly home.

*Baggage limits differ between airlines. The 15 kg rule for bush flights is common but not universal, so check it for the connection you are actually booked on.*`,
  },
  {
    key: 'de-sansibar-safari',
    title: 'Safari and Zanzibar in one trip: which half comes first',
    slug: 'safari-and-zanzibar-in-one-trip',
    excerpt:
      'Most Tanzania itineraries combine both. Which order actually works, how many days each half needs — and why your malaria prophylaxis has a say in the planning.',
    body: `**Short version:** **safari first, Zanzibar second.** Seven to ten days on safari, then four to seven on the coast. The reverse works, but less well — getting up at 05:30 for a game drive after a week of doing nothing is noticeably harder than the other way round.

## Why the order matters

**The safari is the demanding half.** Early starts, long drives on corrugated roads, dust. The beach afterwards is recovery, and you go home rested rather than wrung out.

**The flights fit.** Most long-haul connections land at Kilimanjaro (JRO), which is where the northern circuit begins. From Zanzibar you fly home directly or via Dar es Salaam. Done in the other order you usually pay for one extra domestic flight.

**Weather.** Both halves share the same seasons, but the coast is more humid. After the dry heat of the Serengeti that feels pleasant; in reverse, the safari feels dustier than it otherwise would.

## How many days each half needs

**Safari: five at the absolute minimum, better seven or eight.** Four days will show you Ngorongoro and Tarangire, but the Serengeti becomes a rush. Seven fits the Serengeti, Ngorongoro, Tarangire and a spare day.

**Zanzibar: four to seven.** Two nights in Stone Town, the rest on the north-east or east coast. Fewer than four does not justify the transfer.

**Twelve to sixteen days in total.** Below that it is cramped; above it, many people find the beach half starts to drag.

## The changeover

Arusha to Zanzibar is a flight — direct or via Dar es Salaam, a little over an hour in the air. The overland alternative takes two days and only makes sense if the journey is itself the point.

**Budget the transfer day as a transfer day.** A morning flight costs you half a day on the beach; an afternoon one costs a whole day.

## Malaria prophylaxis has a say in this

This is the part that gets missed. **The coast and Zanzibar are malaria areas**, in places at higher risk than the highlands of the northern circuit. Your prophylaxis has to cover the whole trip **and the required period after you get home** — not just the safari.

Stopping the course once the safari is over, on the grounds that the animals are done, is exactly the mistake travel health professionals warn about. Take the full route into your appointment, not just the first half of it.

## Alternatives to Zanzibar

Zanzibar has become busy. For the same effort there are quieter options:

- **Pemba** — Zanzibar's green sister, wall diving, very few visitors.
- **Mafia Island** — a marine park, whale sharks in season, very little tourism.
- **The coast around Pangani** — reachable from the mainland, which saves the flight.
- **Diani Beach in Kenya**, if your safari finishes in the Masai Mara.

## The planning mistakes people actually make

- **Too few safari days and too much beach.** There is a beach everywhere in the world. There is one Serengeti.
- **Counting travel days as safari days.** Ask how many days are actually spent inside a park.
- **Leaving no gap between the last domestic flight and the flight home.** Bush flights move. A buffer night in Zanzibar or Dar es Salaam before a long-haul departure is money well spent.

*Routes and frequencies change with the season. The order and the split of days do not.*`,
  },
];
