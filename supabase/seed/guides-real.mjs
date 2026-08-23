/**
 * Real editorial guides.
 *
 * These replace the placeholder set. Written to be genuinely useful to somebody
 * planning a first Tanzania trip, which is also what AdSense reviews for and
 * what answer engines quote.
 *
 * Three deliberate choices:
 *
 * 1. Figures are given as ranges with the year attached. Park fees and operator
 *    pricing move; a guide that states a precise number without a date is wrong
 *    within a year and quietly stays wrong.
 * 2. Answer-first structure. Each guide opens with the short answer, then the
 *    reasoning. Answer engines extract the first substantive paragraph, and a
 *    reader skimming on a phone gets what they came for without scrolling.
 * 3. They say when NOT to do something, and when a cheaper option is genuinely
 *    better. A directory whose guides only ever say "book a safari" reads as
 *    advertising, and both readers and reviewers can tell.
 *
 * English only in this pass. The hreflang layer advertises a locale only when a
 * translation actually exists, so a partially translated set is handled
 * correctly rather than pointing at 404s — translations can follow safely.
 */

export const realGuides = [
  {
    key: 'safari-cost',
    destination: null,
    category: 'safaris',
    readingMinutes: 9,
    featured: true,
    sortOrder: 1,
    title: 'How much does a Tanzania safari cost in 2026?',
    slug: 'tanzania-safari-cost',
    excerpt:
      'Budget roughly US$250–450 per person per day for a mid-range safari, of which US$100–170 is government fees nobody can discount. Here is where the rest goes, and which savings are real.',
    body: `**Short answer:** a mid-range Tanzania safari costs roughly **US$250–450 per person per day** in 2026, all-inclusive on the ground. Budget camping trips run US$180–250. Luxury runs US$700–1,500+. Of that, US$100–170 a day is government fees that every operator pays identically.

That last point is the one most people miss, and it changes how you should read a quote.

## The costs nobody can discount

Tanzania's national park fees are set by the government and published. Every operator pays the same. As of 2026, on the northern circuit you should expect roughly:

| Fee | Approximate cost |
|---|---|
| Serengeti entry | US$70–83 per person per day |
| Ngorongoro Conservation Area entry | US$70–80 per person per day |
| Ngorongoro Crater descent | ~US$295 per vehicle, per descent |
| Concession fee (camps inside parks) | US$60–100 per person per night |
| Vehicle park entry | US$40–300 per day depending on registration |

On a seven-day northern circuit, fees alone typically come to **US$700–1,100 per person** before anyone has driven a metre or served a meal.

This matters because it puts a hard floor under pricing. If an operator quotes you US$150 a day all-in for a Serengeti trip, they are not being clever about margins — the arithmetic does not work. Something is being cut, and it is usually one of three things: the vehicle, the guide, or the camp's distance from the animals.

## Where the rest of the money goes

**Accommodation is the biggest variable**, and it swings the total more than anything else:

- Public campsite: US$30–60 per person per night
- Basic lodge or permanent tented camp: US$150–350
- Mid-range lodge: US$350–600
- Luxury or mobile camp inside the park: US$700–1,500+

**Vehicle and guide** is the second lever, and the one people regret economising on. A private Land Cruiser with an experienced guide costs meaningfully more than a shared seat in a minibus. It is also the difference between a driver who takes you where the animals were reported this morning and one following a fixed loop.

**Group size** changes per-person cost sharply. The vehicle, guide and fuel cost the same whether two or six people are in it. Going from two travellers to four typically drops the per-person price by 20–30%.

## Rough all-in guide

| Style | Per person, per day |
|---|---|
| Camping, shared vehicle | US$180–250 |
| Mid-range lodge, shared vehicle | US$250–400 |
| Mid-range lodge, private vehicle | US$350–500 |
| Luxury camp, private vehicle | US$700–1,500+ |

A typical seven-day mid-range northern circuit for two people lands around **US$2,400–3,200 per person**, excluding international flights.

## Which savings are real, and which are false

**Real savings:**

- **Travel in the green season** (March–May, November). Same parks, fewer vehicles, prices 20–40% lower. The trade-off is rain and taller grass, which makes spotting harder.
- **Go with four people rather than two.** The single most effective way to reduce per-person cost.
- **Sleep just outside the park.** Concession fees inside are steep. A lodge in Karatu instead of on the Ngorongoro rim can save US$100+ per night, at the cost of a longer morning drive.
- **Fewer parks, more days in each.** Every park entry is a fresh fee, and long transfer days are the least rewarding part of any itinerary.

**False savings:**

- **The cheapest quote for the same itinerary.** Given fixed fees, a much lower price means fewer game drives, an older vehicle, a less experienced guide, or a camp two hours from the wildlife.
- **Cutting the private vehicle on a short trip.** If you have four days, sharing a vehicle with strangers on different schedules costs you the thing you came for.
- **Skipping travel insurance.** Medical evacuation from a remote park is genuinely expensive, and Zanzibar requires its own mandatory policy on arrival.

## What is usually not included

Ask explicitly. The four most common exclusions:

1. **International flights**
2. **Tanzania visa** (US$50, or US$100 for US passport holders)
3. **Tips** — budget US$20–25 per day for the guide, US$5–10 for camp staff
4. **Drinks**, particularly alcohol, and anything described as "premium"

Balloon safaris (US$550–600 per person) and short internal flights are almost always extra.

## How to read a quote

Ask for the itinerary broken into: park fees, accommodation by night with the camp named, vehicle type and whether it is private, and what is excluded. An operator who cannot produce that quickly is either disorganised or hoping you will not ask.

Two quotes that differ by 40% are rarely the same trip. Line them up night by night and the difference usually appears immediately.

*Fees quoted are approximate for 2026 and set by TANAPA and the NCAA; confirm current rates when you book.*`,
  },

  {
    key: 'serengeti-when',
    destination: 'serengeti',
    category: 'safaris',
    readingMinutes: 8,
    featured: true,
    sortOrder: 2,
    title: 'Best time to visit the Serengeti: a month-by-month guide',
    slug: 'best-time-to-visit-serengeti',
    excerpt:
      'There is no bad month — the herds are always somewhere. What changes is where, and that should decide which camp you book, not whether you go.',
    body: `**Short answer:** the Serengeti is good year-round. **January to March** puts you in the southern calving grounds with the highest predator activity. **July to September** puts you at the Mara River crossings in the north. **April, May and November** are wet, cheap and quiet.

The Great Migration is a continuous loop, not an event with a date. Roughly two million wildebeest, zebra and gazelle move clockwise through the ecosystem year-round. They are always somewhere. The question is only which part of a 30,000 km² park you need to be in.

This is why choosing a camp matters more than choosing a month.

## Month by month

**January–February — calving, southern plains**

Around 400,000 calves are born in a roughly three-week window on the short-grass plains near Ndutu. Predators concentrate accordingly. If you want to see hunting rather than grazing, this is the best time of year, and it is materially cheaper than the July–September peak.

**March — the herds begin moving**

Calving tails off and the herds start drifting north-west. Rain increases through the month. Good value, and the plains are green.

**April–May — the long rains**

The wettest period. Some camps close. Roads become difficult and grass grows tall enough to hide a lion at twenty metres. Prices are at their lowest and you may have sightings entirely to yourself. A reasonable choice if you are on a budget and not on your first safari; a poor one if this is a once-in-a-lifetime trip.

**June — the rut, Western Corridor**

Rain stops. Herds concentrate in the Western Corridor and the mating season produces a lot of noise and activity. The first Grumeti River crossings happen. Prices begin climbing.

**July–September — Mara River crossings, northern Serengeti**

The images everyone has seen. Herds mass on the riverbank, hesitate, then cross into crocodile water. It is genuinely dramatic and completely unpredictable — a crossing may happen twice in a morning or not for three days.

This is peak season. Expect the highest prices of the year, camps booked six to twelve months out, and a queue of vehicles at popular crossing points.

**October–November — the return south**

Herds move back down through the eastern Serengeti. The short rains arrive in November, turning the plains green. Vehicle numbers drop sharply. Underrated months.

**December — southern plains again**

Herds are back on the short-grass plains and calving is close. Christmas and New Year carry a price premium, but early December is quiet.

## Choosing your camp, not just your month

The single most common planning mistake is booking a fixed lodge in the central Serengeti and expecting to see the migration in August. Seronera is convenient year-round and has excellent resident game — but it is a four-hour drive from the northern river crossings.

Two ways to solve this:

1. **Mobile tented camps** relocate two or three times a year to follow the herds. If the migration is your priority, this is the answer.
2. **Match the region to the month** — Ndutu/southern plains for January–March, Western Corridor for June, northern Serengeti for July–October.

Ask any operator directly: *"Where exactly will we be sleeping, and how far is that from where the herds are expected that week?"* A good operator answers immediately.

## If you only care about big cats

Consider February in the south over August in the north. Predator density during calving is exceptional, the short grass makes spotting easy, and you will pay noticeably less. River crossings are spectacular, but they are one event in a trip, and you may not see one.

## What about the rest of the park?

Resident wildlife does not migrate. Lion, leopard, elephant, giraffe and hippo are in the Seronera valley all year. A Serengeti trip in April still shows you a great deal — it is only the migration spectacle that has a calendar.

*Migration timing varies year to year with rainfall. Any month given here is a pattern, not a schedule.*`,
  },

  {
    key: 'kilimanjaro-routes',
    destination: 'kilimanjaro',
    category: 'activities',
    readingMinutes: 8,
    sortOrder: 3,
    title: 'Which Kilimanjaro route should you choose?',
    slug: 'kilimanjaro-routes-compared',
    excerpt:
      'Summit success depends far more on how many days you spend on the mountain than on which route you pick or how fit you are. Here is what actually separates the routes.',
    body: `**Short answer:** take **Lemosho or the Northern Circuit over eight or nine days**. Route choice matters, but duration matters more — five-day itineraries succeed roughly half the time, eight-day itineraries exceed 85–90%.

Kilimanjaro requires no technical climbing on any of its seven established routes. You walk up. What stops people is altitude, and the only reliable defence against altitude is time.

## The number that actually predicts success

Altitude sickness, not fitness, is why people turn back. Your body needs time to produce the extra red blood cells that make 5,895 m survivable, and that adaptation happens on a schedule you cannot rush by being athletic.

Approximate summit success by itinerary length:

| Days on the mountain | Approximate success rate |
|---|---|
| 5 days | 50–60% |
| 6 days | 65–75% |
| 7 days | 80–85% |
| 8+ days | 85–95% |

Marathon runners fail on five-day itineraries. Unremarkably fit people in their sixties succeed on eight-day ones. This is the single most useful fact in planning a Kilimanjaro climb.

## The routes

**Lemosho (7–8 days)** — the best all-round choice. Approaches from the west through rainforest, crosses the Shira Plateau, then traverses beneath the Southern Icefields before summit night. Excellent acclimatisation profile, spectacular scenery, and quiet for the first two days. Costs more because it is longer.

**Machame (6–7 days)** — the most popular route, sometimes called the "Whiskey" route. Steeper than Lemosho with a genuinely good climb-high-sleep-low profile. Busy, and the campsites feel it. Take the seven-day version; the six-day one cuts the acclimatisation day that makes the route work.

**Northern Circuit (9 days)** — the longest route and the highest success rate. Circles the northern slopes, which almost nobody else does, so it is the quietest option on the mountain. If you have the time and budget, this is the strongest choice.

**Rongai (6–7 days)** — the only approach from the north. Drier, which makes it the sensible choice during the rains, and much quieter. Gentler gradient but a less varied landscape, and the acclimatisation profile is weaker than Lemosho's.

**Marangu (5–6 days)** — the only route with huts rather than tents, and often marketed as the "easy" route. It has the **lowest** success rate of any route, because it is the shortest and ascends and descends by the same path, giving poor acclimatisation. The huts are the only real advantage. Choose it for the accommodation, not because it sounds easier.

**Umbwe (6–7 days)** — steep, direct and demanding. Genuinely hard, poor acclimatisation, low success rate. For experienced high-altitude walkers only.

**Shira (7–8 days)** — similar to Lemosho but starts by driving to 3,500 m, which skips useful early acclimatisation. Lemosho is a better version of the same route.

## What separates a good operator from a cheap one

Fees are fixed: park fees, camping fees and rescue fees come to roughly US$800–1,000 per person for a seven-day climb regardless of who you book with. A quote much below US$1,800 is cutting elsewhere.

Ask three specific questions:

1. **How often do you check oxygen saturation?** Twice daily with a pulse oximeter, recorded, is the standard. An operator who does not carry one is not managing your safety.
2. **What are your porter wages and load limits?** The Kilimanjaro Porters Assistance Project sets guidance on fair pay and a 20 kg maximum. Underpaid, underequipped porters are the industry's real cost-cutting mechanism.
3. **Do you carry supplementary oxygen and a stretcher?** Both should be standard, not extras.

## Practical advice

**Pay for the extra day.** It typically costs US$200–350 more on a trip already costing thousands, and it is the difference between the summit and turning back at 4,600 m.

**Best months:** January to mid-March, and June to October. Avoid the long rains in April and May, when the trails are miserable and views are scarce.

**Train by walking downhill.** Most people expect the ascent to hurt. It is the 2,000 m descent on the final day, on tired legs, that produces the injuries.

*Success rates vary by operator and are self-reported; treat any specific figure as indicative.*`,
  },

  {
    key: 'choosing-operator',
    destination: null,
    category: 'safaris',
    readingMinutes: 7,
    featured: true,
    sortOrder: 4,
    title: 'How to choose a Tanzania safari operator (and spot a bad one)',
    slug: 'how-to-choose-safari-operator',
    excerpt:
      'Licensing, a physical office, and a quote broken down line by line. The checks that matter take about twenty minutes and eliminate most of the risk.',
    body: `**Short answer:** verify the TALA licence, insist on a written day-by-day itinerary with camps named, pay by traceable method, and treat an unusually low price as information rather than a bargain.

Tanzania has hundreds of safari operators, ranging from long-established companies with their own vehicle fleets to a laptop and a rented Land Cruiser. Both can produce a good trip. The difference is what happens when something goes wrong.

## The checks worth doing

**1. Ask for the TALA licence number.**

Every legitimate tour operator in Tanzania holds a Tourist Agent Licence issued by the Ministry of Natural Resources and Tourism. Ask for the number and the category. An operator who is vague about this is either unlicensed or subcontracting your trip to someone you have not vetted.

**2. Check they have a physical address.**

Most legitimate northern-circuit operators are based in Arusha or Moshi. A company with no address, no landline and only a mobile number is worth more scrutiny.

**3. Ask who actually operates the trip.**

Many companies sell trips they do not run, subcontracting to whoever is cheapest that week. That is not automatically bad — but you should know, because the subcontractor is who determines your experience. Ask directly: *"Do you own your vehicles and employ your guides?"*

**4. Insist on a written itinerary with names.**

Not "mid-range lodge" — the actual name of the camp for each night. Vague accommodation descriptions are how a quote gets cheap without appearing to.

**5. Look at the payment terms.**

A deposit of 30–50% is normal. Full payment months in advance to a personal bank account is not. Pay by traceable method. If a card is not accepted, ask why.

## Reading the price

Park fees are identical for everyone. Given that, a quote significantly below the market for the same itinerary means something has been removed. Usually:

- **An older vehicle** without a pop-up roof, or with unreliable 4WD
- **A less experienced guide**, which affects what you see more than anything else
- **A camp much further from the wildlife**, adding two hours of driving each way
- **Fewer game-drive hours**, replaced by "rest at the lodge"

None of these appear in the headline number. All of them appear on the trip.

## Questions that reveal a lot quickly

- *"What is your vehicle-to-guest ratio, and is the roof open?"*
- *"How many years has our guide been working, and what languages do they speak?"*
- *"What happens if the vehicle breaks down in the park?"*
- *"What is not included in this price?"*

That last one is the most useful question you can ask, and the speed of the answer tells you as much as its content.

## Reviews: what to trust

Read the three-star reviews rather than the five- and one-star ones. They tend to be the most specific and the least emotional.

Look for reviews that name the guide. Consistent praise for a named guide across multiple reviews is a strong signal — good guides do not stay at bad companies.

Be sceptical of clusters of short, similar five-star reviews posted close together.

## Group tours versus private

A shared vehicle costs meaningfully less and is perfectly reasonable on a longer trip. But you are on the group's schedule: if three people want to leave the leopard after five minutes, you leave.

On a trip of four days or fewer, a private vehicle is usually worth the difference. On a ten-day trip, sharing is easier to absorb.

## A reasonable process

1. Shortlist three or four operators and send all of them the same brief — same dates, same group size, same interests.
2. Compare the itineraries side by side, night by night, rather than comparing headline prices.
3. Ask each one your exclusions question.
4. Choose on the quality of the answers, not the size of the discount.

That process takes an evening and removes most of the risk from what is, for most people, an expensive and long-anticipated trip.`,
  },
];
