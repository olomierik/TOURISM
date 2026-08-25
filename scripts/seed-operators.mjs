import { readFileSync } from 'node:fs';

import { pool } from './db.mjs';

/**
 * Creates unclaimed listings from public licensing and accreditation registers.
 *
 *   node scripts/seed-operators.mjs [--dry]
 *
 * The supply side of the plan. Both sources publish these records specifically
 * so a traveller can verify an operator — KATO states outright that a company
 * not on its list is not a member, and the Uganda Tourism Board register exists
 * to let anyone check a licence. Repeating that verification is the use the data
 * was published for.
 *
 * What is taken: the trading name, the membership grade or licence number, and
 * the business contact details each register publishes — email, phone, postal
 * address and the operator's own website. A listing with a name and nothing else
 * is one a traveller can read; a listing with a phone number is one they can act
 * on, and that is the whole difference between supply and the appearance of it.
 *
 * What is not taken: logos, photographs, and marketing copy. Those are the
 * operator's own work, they are not licensing data, and a directory built out of
 * four hundred copied descriptions would be both an infringement and a pile of
 * duplicate content that would rank for nothing.
 *
 * Descriptions here are written from the facts, not scraped. They state the
 * source and the grade, and they say the listing is unclaimed — which the public
 * page repeats in its own words.
 *
 * Every listing is created with owner_id null and is_verified false. Unclaimed
 * means nobody has taken it over; unverified means this site has checked
 * nothing. Neither should be inferable from the other.
 */

const DRY = process.argv.includes('--dry');

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const kato = read('supabase/seed/operators-kato.json');
const utb = read('supabase/seed/operators-utb.json');
const katoContacts = read('supabase/seed/operators-kato-contacts.json');

/**
 * Contact details from the member profile pages, keyed by the profile slug.
 *
 * The directory listing gives a name and a grade; the profile page behind it
 * gives the email, phone, postal address and the operator's own website. That is
 * the difference between a listing a traveller can read and one they can act on.
 *
 * Company bios were deliberately not taken. They are the operator's marketing
 * copy rather than licensing data, and four hundred of them reproduced verbatim
 * would be both an infringement and a wall of duplicate content.
 */
const contactBySlug = new Map(katoContacts.profiles.map((p) => [p.sourceSlug, p]));

/**
 * Nairobi suburbs reported as if they were towns.
 *
 * Westlands and Karen are districts of Nairobi. Left alone they would split the
 * city facet three ways and put two operators somewhere a traveller cannot
 * search for.
 */
const CITY_ALIASES = { Westlands: 'Nairobi', Karen: 'Nairobi', Tigoni: 'Limuru' };
const normaliseCity = (city) => (city ? (CITY_ALIASES[city] ?? city) : null);

/** Trading names carry punctuation that has no business in a URL. */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/**
 * Car hire and self-drive companies are not safari operators, and filing them
 * under safaris would make the category page wrong for both. Everything else
 * from these registers is a tour operator.
 */
function categoryFor(name) {
  return /\b(car (rental|hire)|self ?drive|4wd)\b/i.test(name) ? 'car-rental' : 'safaris';
}

const KATO_URL = kato.sourceUrl;
const UTB_URL = utb.sourceUrl;

const records = [
  ...kato.members.map((m) => ({
    name: m.name,
    countryCode: 'KE',
    category: categoryFor(m.name),
    email: contactBySlug.get(m.sourceSlug)?.email ?? null,
    phone: contactBySlug.get(m.sourceSlug)?.phone ?? null,
    website: contactBySlug.get(m.sourceSlug)?.website ?? null,
    address: contactBySlug.get(m.sourceSlug)?.address ?? null,
    city: normaliseCity(contactBySlug.get(m.sourceSlug)?.city),
    licenceNumber: null,
    // KATO grades come through as "Category A" or "Associate Member". Lowercasing
    // them produced "listed as a category a of the Kenya Association", which is
    // not a sentence. The grade is a proper noun; only the article in front of it
    // changes.
    tagline:
      m.category === 'Associate Member'
        ? 'Associate Member, Kenya Association of Tour Operators'
        : `${m.category} member, Kenya Association of Tour Operators`,
    description:
      `${m.name} is a tour operator in Kenya, listed as ` +
      (m.category === 'Associate Member'
        ? 'an Associate Member'
        : `a ${m.category} member`) +
      ` of the Kenya Association of Tour Operators (KATO). This entry was compiled from KATO's ` +
      `public members directory and has not yet been claimed by the operator, so it carries no ` +
      `information beyond that register.`,
    sourceUrl: KATO_URL,
  })),
  ...utb.members.map((m) => ({
    name: m.name,
    countryCode: 'UG',
    category: categoryFor(m.name),
    email: m.email ?? null,
    phone: null,
    website: m.website ?? null,
    address: null,
    city: null,
    licenceNumber: m.licenceNumber,
    tagline: 'Licensed by the Uganda Tourism Board',
    description:
      `${m.name} holds Uganda Tourism Board licence ${m.licenceNumber}. This entry was compiled ` +
      `from the Board's public register of licensed operators and has not yet been claimed by ` +
      `the operator, so it carries no information beyond that register.`,
    sourceUrl: UTB_URL,
  })),
];

// A register can list two companies under names that slugify identically, and
// the slug is the public URL. Resolved here rather than by letting the insert
// fail halfway through four hundred rows.
const bySlug = new Map();
for (const r of records) {
  let slug = slugify(r.name);
  if (!slug) continue;
  if (bySlug.has(slug)) {
    let n = 2;
    while (bySlug.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }
  bySlug.set(slug, { ...r, slug });
}

const rows = [...bySlug.values()];

if (DRY) {
  console.log(`\n  ${rows.length} listings would be created:\n`);
  for (const r of rows.slice(0, 5)) {
    console.log(`  ${r.countryCode}  ${r.slug}`);
    console.log(`      ${r.name} — ${r.tagline}`);
  }
  console.log(`  … and ${rows.length - 5} more`);
  const byCountry = rows.reduce((m, r) => m.set(r.countryCode, (m.get(r.countryCode) ?? 0) + 1), new Map());
  console.log('\n ', [...byCountry].map(([c, n]) => `${c}: ${n}`).join(' · '));
  await pool.end();
  process.exit(0);
}

const client = await pool.connect();

let created = 0;
let updated = 0;

try {
  await client.query('begin');

  const { rows: cats } = await client.query('select id, key from categories');
  const catId = new Map(cats.map((c) => [c.key, c.id]));

  for (const r of rows) {
    const { rows: existing } = await client.query(
      'select id, owner_id from businesses where slug = $1',
      [r.slug],
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      // A listing that has been claimed is the operator's now. Re-running the
      // seeder must never reach back into it and overwrite what they wrote.
      if (existing[0].owner_id) {
        continue;
      }
      await client.query(
        `update businesses
           set name = $2, country_code = $3, email = coalesce($4, email),
               phone = coalesce($5, phone), website = coalesce($6, website),
               address = coalesce($7, address), city = coalesce($8, city),
               license_number = coalesce($9, license_number),
               status = 'approved', is_verified = false, is_demo = false, deleted_at = null
         where id = $1`,
        [id, r.name, r.countryCode, r.email, r.phone, r.website, r.address, r.city,
         r.licenceNumber],
      );
      updated++;
    } else {
      const { rows: ins } = await client.query(
        `insert into businesses
           (owner_id, name, slug, country_code, email, phone, website, address, city,
            license_number, status, tier, is_verified, is_demo, published_at)
         values (null,$1,$2,$3,$4,$5,$6,$7,$8,$9,'approved','free',false,false,now())
         returning id`,
        [r.name, r.slug, r.countryCode, r.email, r.phone, r.website, r.address, r.city,
         r.licenceNumber],
      );
      id = ins[0].id;
      created++;
    }

    await client.query(
      `insert into business_translations
         (business_id, locale, tagline, short_description, description)
       values ($1,'en',$2,$3,$4)
       on conflict (business_id, locale) do update
         set tagline = excluded.tagline,
             short_description = excluded.short_description,
             description = excluded.description`,
      [id, r.tagline, r.tagline, r.description],
    );

    const category = catId.get(r.category);
    if (category) {
      await client.query(
        `insert into business_categories (business_id, category_id, is_primary)
         values ($1,$2,true)
         on conflict (business_id, category_id) do nothing`,
        [id, category],
      );
    }
  }

  await client.query('commit');

  console.log(`\n  created ${created}, updated ${updated}, skipped ${rows.length - created - updated} already claimed`);
  console.log(`  sources: ${KATO_URL}`);
  console.log(`           ${UTB_URL}`);
  console.log(`\n  All created with owner_id null and is_verified false.`);
  console.log(`  No destinations attached — the registers do not say which parks an`);
  console.log(`  operator serves, and inventing that would be a claim about their business.`);
} catch (err) {
  await client.query('rollback');
  console.error('\n  Rolled back:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
