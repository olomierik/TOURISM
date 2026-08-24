/**
 * Guides covering the countries beyond Tanzania.
 *
 * Written after checking current figures, because the numbers in both of these
 * moved recently and a guide that states a stale price is worse than one that
 * states none: Kenya now charges more than double the Serengeti's rate in peak
 * season, and the gorilla permit gap between Uganda and Rwanda is the single
 * biggest cost in either trip.
 *
 * Sources were used for facts — fees, permit prices, park sizes — and nothing
 * else. Prices are given with the year attached and a line telling the reader to
 * confirm before booking, because they will move again.
 *
 * Each carries a `coverKey` naming the destination whose photograph it borrows.
 * The seeder resolves that to a real image, so a guide never publishes with an
 * empty card.
 */

export const africaGuides = [
  {
    key: 'mara-or-serengeti',
    destination: 'maasai-mara',
    category: 'safaris',
    coverKey: 'maasai-mara',
    galleryKeys: ['maasai-mara', 'serengeti'],
    readingMinutes: 9,
    featured: true,
    sortOrder: 5,
    title: 'Masai Mara or Serengeti? How to choose between them',
    slug: 'masai-mara-or-serengeti',
    excerpt:
      'They are one ecosystem split by a border. The Mara is smaller, denser and in 2026 costs up to US$200 a day in park fees; the Serengeti is ten times the size and charges US$70–83. Here is which one suits which trip.',
    body: `**Short answer:** the Masai Mara is better for a short trip and for guaranteed density — you can see a great deal in three days. The Serengeti is better for a longer trip, for variety, and for cost: park fees are roughly US$70–83 per person per day against the Mara's US$100–200 in 2026.

They are the same ecosystem. The border between Kenya and Tanzania runs through it, the herds cross without noticing, and the animals are identical. What differs is size, price, crowding and how long you need.

## The size difference is the whole story

The Masai Mara National Reserve covers roughly 1,510 km². The Serengeti covers about 14,750 km² — very nearly ten times larger.

That single fact explains almost every other difference:

- **The Mara concentrates wildlife into a small area.** Drives are short, sightings come quickly, and three days is genuinely enough. This is why it is the standard choice for anyone adding a safari to a beach holiday or a business trip.
- **The Serengeti spreads it across a landscape you cannot cross in a day.** Seronera in the centre is four hours from the northern river crossings. You need more days, and you will spend some of them driving.
- **Vehicle density follows the same maths.** A famous sighting in the Mara can attract a queue. The same sighting in the Serengeti is usually quieter, simply because there is more room.

## What each actually costs in 2026

Park fees are the part nobody can discount, and this is where the two diverge sharply.

| | Masai Mara | Serengeti |
|---|---|---|
| Non-resident adult, per day | US$100 (Jan–Jun) rising to US$200 (Jul–Dec) | US$70–83 |
| Children / students | US$50 | reduced rates apply |
| Conservancies alongside | US$70–120 per night on top | concession fees US$60–100 per night |

A family of four spending four days in the Mara in September pays around **US$3,200 in park fees alone**. The same four days in the Serengeti is closer to **US$1,200**.

That gap is large enough to change the trip. It does not make the Mara bad value — the density is real and the drives are shorter — but it should be a deliberate choice rather than a surprise at the end of a quote.

## Where the migration actually is

The herds move in a continuous loop. They are in Kenya for a minority of the year.

- **July to October** — the Mara River crossings, in the northern Serengeti and the Masai Mara. This is what the photographs show, and it is also when Kenya charges US$200 a day.
- **November to June** — the herds are in Tanzania. Calving on the southern Serengeti plains falls around January to March, and predator activity then is the best of the year.

So if the migration is the point and you can only travel in August, the Mara is the obvious answer. If you can travel in February, the Serengeti during calving gives you more animals, fewer vehicles and less than half the park fees.

## Getting there

**The Mara is easier.** Nairobi is a major hub, the flight to the Mara is about 45 minutes, and the drive is five to six hours on a reasonable road. You can be on a game drive the afternoon you land.

**The Serengeti takes longer.** Kilimanjaro Airport, then either a light aircraft or a long drive through Ngorongoro. Budget most of a day each way.

For a trip of four days or fewer, that difference matters more than anything else on this page.

## The honest recommendation

**Choose the Mara if:** you have three or four days, you are travelling between July and October, you want the river crossings, or you are combining a safari with something else in Kenya.

**Choose the Serengeti if:** you have a week or more, you are travelling between November and June, cost matters, or you want the Ngorongoro Crater in the same trip — it is two hours away and nothing in Kenya resembles it.

**Choose the conservancies bordering the Mara if:** you want the Mara's density without the vehicle queues. They charge a nightly conservancy fee on top, cap vehicle numbers at sightings, and permit off-road driving and night drives that the reserve itself does not.

## Doing both

If you have ten days, both is a reasonable itinerary — and it is one trip, not two. Flights connect Nairobi and Kilimanjaro daily, and there are cross-border road transfers via Isebania. Expect a full day in transit, and check that your operator handles the border formalities rather than leaving you to it.

*Fees are 2026 rates published by the Narok County Government and TANAPA. Both have moved in the last two years and will move again — confirm current rates when you book.*`,
  },

  {
    key: 'gorilla-uganda-or-rwanda',
    destination: 'bwindi-impenetrable-national-park',
    category: 'activities',
    coverKey: 'bwindi-impenetrable-national-park',
    galleryKeys: ['bwindi-impenetrable-national-park', 'mgahinga-gorilla-national-park'],
    readingMinutes: 8,
    featured: true,
    sortOrder: 6,
    title: 'Gorilla trekking: Uganda or Rwanda?',
    slug: 'gorilla-trekking-uganda-or-rwanda',
    excerpt:
      'The same animals, an hour with them either way, and a US$700 difference in the permit. Uganda charges US$800 and Rwanda US$1,500 in 2026 — what that money actually buys you.',
    body: `**Short answer:** Uganda if the cost matters, Rwanda if the time does. The permit is **US$800 in Uganda** and **US$1,500 in Rwanda** in 2026. The gorillas are the same species, the hour you spend with them is the same hour, and the difference is almost entirely logistics and price.

Mountain gorillas live in one place on earth: the Virunga range and Bwindi, straddling Uganda, Rwanda and the DRC. Roughly half the world's population is in Bwindi alone.

## The permit is the trip's biggest single cost

| | Uganda | Rwanda |
|---|---|---|
| Trekking permit, foreign non-resident | **US$800** | **US$1,500** |
| Habituation permit (4 hours) | **US$1,500** | not offered |
| Time with the gorillas | 1 hour | 1 hour |
| Parks | Bwindi, Mgahinga | Volcanoes |

For two people that is a US$1,400 difference before anything else is booked — enough to pay for several nights of good accommodation, or to extend the trip by days.

Rwanda raised its permit deliberately, positioning itself as a low-volume, high-price destination. That is a legitimate conservation model and the money does go into it. But it does not buy you more time with the animals.

## What Rwanda's price actually buys

**Time, mostly, and it is not a small thing.**

Volcanoes National Park is about two to three hours by road from Kigali International Airport, on good tarmac. You can land in the morning and trek the next day. A gorilla trip to Rwanda works as a long weekend.

Bwindi is roughly eight to nine hours' drive from Entebbe. You can fly to Kisoro or Kihihi instead and cut that to about an hour and a half in the air, but that is another cost and another fixed schedule to work around.

If you are travelling from Europe or North America with limited leave, Rwanda's premium is buying you two days back. Whether that is worth US$700 a head is a real question with no universal answer.

## What Uganda's price buys

**More trip for the money, and the habituation experience.**

Uganda's US$1,500 habituation permit puts you with a gorilla family being habituated to humans for **four hours** rather than one, in a group of no more than four people. It costs exactly what an ordinary Rwandan permit costs, and it is the single best thing available to a visitor in either country.

Uganda also gives you somewhere to go afterwards. Queen Elizabeth National Park, the Kazinga Channel, Kibale's chimpanzees and Murchison Falls are all within reach of the same trip. Rwanda is a smaller country with a shorter list.

## What the trek is actually like

The same in both countries, and harder than most people expect.

- **Altitude between 2,100 m and 3,000 m**, on steep ground, often wet.
- **Anywhere from 30 minutes to six hours** of walking to reach the family, and the same back. Nobody can tell you in advance which you will get.
- **Dense, wet vegetation.** Bwindi is called impenetrable for a reason. Long sleeves, gaiters and gloves are worth carrying.
- **A porter costs around US$20** and is worth every cent — for the help, and because it puts money directly into the villages bordering the park.

Reasonable fitness is enough. Being able to walk uphill for three hours in mud is the honest requirement.

## Booking, and when

Permits are limited by design: eight visitors per gorilla family per day. Peak months — June to September and December to February — sell out months ahead, and Rwanda's smaller allocation goes first.

Book six months out for peak season. Your operator obtains permits on your behalf and will need passport details well in advance; this is not something to arrange on arrival.

The dry seasons are easier walking. The wet seasons are cheaper and the forest is at its most striking, and gorillas do not mind rain.

## Which to choose

**Uganda if:** the cost matters, you want more than gorillas in the same trip, you want the four-hour habituation experience, or you have ten days or more.

**Rwanda if:** your time is tight, you want the simplest possible logistics, or you are combining the trek with somewhere else that connects easily through Kigali.

**Either way:** book early, take the porter, and treat the permit as the fixed cost it is — no operator can discount it, and one offering to should be a warning rather than a bargain.

*Permit prices are 2026 rates set by the Uganda Wildlife Authority and the Rwanda Development Board. Both have risen in recent years — confirm before booking.*`,
  },
];
