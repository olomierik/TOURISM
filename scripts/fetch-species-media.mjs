/**
 * Resolves the facts about a species that must not be guessed.
 *
 *   node scripts/fetch-species-media.mjs <candidates.json> [out.json]
 *
 * Three of the fields in lib/wildlife/species.ts are claims about the world
 * that a reader can check, and getting them wrong is worse than omitting them:
 *
 *   image.author / license   a licence condition. Attributing a photograph to
 *                            the wrong person is the one mistake that turns
 *                            "freely licensed" into "used without permission".
 *   iucn                     a published category, not an impression.
 *   scientific               the binomial, which the article title confirms.
 *
 * So they are fetched: the photograph and its licence from Wikimedia Commons'
 * own metadata, the Red List category from Wikidata (P141). The prose — size,
 * habitat, where to look, the tip — is written by hand, because nobody else has
 * written it for this site.
 *
 * Input is a JSON array of { slug, name, wiki, group, bigFive?, diet?, rarity? }
 * where `wiki` is the English Wikipedia article title. Everything the script
 * could not establish comes back as null and is reported, so a species with no
 * freely licensed photograph is a visible gap rather than a broken image.
 *
 * Polite by default: one request at a time, a descriptive User-Agent, and a
 * pause between species. Wikimedia asks for both and the whole run is a few
 * minutes either way.
 */

import { readFile, writeFile } from 'node:fs/promises';

const [input, output = 'species-fetched.json'] = process.argv.slice(2);

if (!input) {
  console.error('Usage: node scripts/fetch-species-media.mjs <candidates.json> [out.json]');
  process.exit(1);
}

const UA = 'ExploreTanzania-WildlifeGuide/1.0 (https://exploretanzania.online; listings@exploretanzania.online)';

/** Wikidata items for the Red List categories we record. */
const IUCN_BY_QID = {
  Q211005: 'LC',
  Q719675: 'NT',
  Q278113: 'VU',
  Q11394: 'EN',
  Q219127: 'CR',
  Q3245245: 'DD',
  // Extinct in the wild and extinct are real categories but not ones this
  // guide can send anybody to look for; recorded as null rather than invented.
  Q239509: null,
  Q237350: null,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      // A rate limit or a 503 is worth waiting out; three tries then give up on
      // this one field rather than the whole run.
      if (attempt >= 3) {
        console.error(`    ${err.message} — giving up on ${url.slice(0, 80)}`);
        return null;
      }
      await sleep(attempt * 2000);
    }
  }
}

/** Commons' Artist field is HTML, sometimes a whole nest of links. */
function plainAuthor(html) {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  // Commons Artist fields often hold a bare profile URL beside the name, or
  // only the URL. A credit line should read as a name, so drop the URLs and
  // keep what is left — and if nothing is left, say where to look instead of
  // printing a link as if it were a person.
  const named = text
    .split(/\s+/)
    .filter((word) => !/^https?:/i.test(word))
    .join(' ')
    .trim();
  return named ? named.slice(0, 120) : null;
}

async function lead(title) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2' +
    `&titles=${encodeURIComponent(title)}` +
    '&prop=pageprops|pageimages&piprop=name&redirects=1';
  const data = await api(url);
  const page = data?.query?.pages?.[0];
  if (!page || page.missing) return null;
  return {
    title: page.title,
    qid: page.pageprops?.wikibase_item ?? null,
    file: page.pageimages?.name ?? page.pageprops?.page_image_free ?? null,
  };
}

async function imageinfo(fileName, width) {
  const data = await api(
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2' +
      `&titles=${encodeURIComponent('File:' + fileName)}` +
      `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=${width}`,
  );
  return data?.query?.pages?.[0]?.imageinfo?.[0] ?? null;
}

async function media(fileName) {
  if (!fileName) return null;
  let info = await imageinfo(fileName, 1280);
  if (!info) return null;

  // Asked for a 1280px thumbnail of a picture narrower than that, Wikimedia
  // hands back the original file instead — and serves hotlinked originals with
  // a 429 where it serves thumbnails happily. Two of these images would have
  // shipped as rate-limited URLs that render for nobody. So when the answer is
  // not a /thumb/ path, ask again small enough that a thumbnail must be cut.
  // Asking for a width just under the original is not enough — Wikimedia cuts
  // thumbnails at standard sizes and answers anything close to full size with
  // the original again. Drop well below it and a thumbnail is produced.
  if (!info.thumburl?.includes('/thumb/') && info.width > 400) {
    const target = info.width > 900 ? 800 : Math.floor(info.width * 0.8);
    const smaller = await imageinfo(fileName, target);
    if (smaller?.thumburl?.includes('/thumb/')) info = smaller;
    await sleep(250);
  }
  if (!info) return null;

  const meta = info.extmetadata ?? {};
  const license = meta.LicenseShortName?.value ?? null;
  // A file whose licence we cannot read is a file we cannot show. Some Commons
  // files are fair-use uploads from a local wiki; those have no usable terms.
  if (!license || /fair use|non-free/i.test(license)) return null;

  const author = plainAuthor(meta.Artist?.value) ?? plainAuthor(meta.Credit?.value);

  // A CC BY licence is a licence on condition of credit. If Commons records no
  // author for the file, that condition cannot be met from here, so the file is
  // unusable however freely it is licensed — reject it and look for another
  // picture of the same animal rather than printing "see the file page" where a
  // photographer's name belongs.
  if (!author && meta.AttributionRequired?.value !== 'false') return null;

  return {
    // The API appends its own campaign parameters to this URL. Served to a
    // reader they would tag every image request with Wikimedia's analytics
    // tags, so keep the file and drop the query string.
    url: (info.thumburl ?? info.url).split('?')[0],
    page: info.descriptionurl,
    author: author ?? 'Public domain, author not recorded',
    license,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
  };
}

/**
 * Other pictures of the same animal, when the article's lead image cannot be
 * used — the usual reason being a free licence with no recorded author.
 *
 * Searched by scientific name as well as common name, because Commons file
 * descriptions are written by photographers and the binomial is the one label
 * they reliably agree on.
 */
async function alternatives(name, scientific) {
  const files = [];
  for (const term of [scientific, name].filter(Boolean)) {
    const data = await api(
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2' +
        `&list=search&srsearch=${encodeURIComponent(`${term} filetype:bitmap`)}` +
        '&srnamespace=6&srlimit=8',
    );
    for (const hit of data?.query?.search ?? []) {
      const file = hit.title.replace(/^File:/, '');
      if (/\.(jpg|jpeg|png)$/i.test(file) && !files.includes(file)) files.push(file);
    }
    await sleep(250);
  }
  return files;
}

async function iucn(qid) {
  if (!qid) return null;
  const data = await api(
    `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P141`,
  );
  const claim = data?.claims?.P141?.[0];
  const id = claim?.mainsnak?.datavalue?.value?.id;
  if (!id) return null;
  // An unrecognised category is left null rather than mapped to a guess.
  return id in IUCN_BY_QID ? IUCN_BY_QID[id] : null;
}

/**
 * The Red List category from the article's own taxobox.
 *
 * Wikidata records P141 on species and mostly not on subspecies, so the
 * mountain gorilla, Grévy's zebra and the reticulated giraffe all came back
 * unassessed from there while being among the best known assessments there
 * are. The taxobox carries the category and a citation to the assessment, and
 * only the value sitting next to status_system = IUCN is accepted — a category
 * in some other system is not one this guide records.
 */
async function iucnFromTaxobox(title) {
  const data = await api(
    'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2' +
      `&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=content&rvslots=main&redirects=1`,
  );
  const text = data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
  if (!text) return null;
  if (!/\|\s*status_system\s*=\s*IUCN/i.test(text)) return null;
  const code = text.match(/\|\s*status\s*=\s*([A-Z]{2})\b/)?.[1];
  return code && code in BY_CODE ? code : null;
}

const BY_CODE = { LC: 1, NT: 1, VU: 1, EN: 1, CR: 1, DD: 1 };

/** The binomial, from the article's taxobox via Wikidata P225. */
async function binomial(qid) {
  if (!qid) return null;
  const data = await api(
    `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P225`,
  );
  return data?.claims?.P225?.[0]?.mainsnak?.datavalue?.value ?? null;
}

const candidates = JSON.parse(await readFile(input, 'utf8'));
console.log(`\n  ${candidates.length} species to resolve\n`);

const results = [];
const problems = [];

for (const c of candidates) {
  const page = await lead(c.wiki);
  if (!page) {
    problems.push(`${c.slug}: no Wikipedia article "${c.wiki}"`);
    console.log(`  ${c.slug.padEnd(34)} NO ARTICLE`);
    continue;
  }

  const redlist = (await iucn(page.qid)) ?? (await iucnFromTaxobox(page.title));
  const sci = (await binomial(page.qid)) ?? c.scientific ?? null;

  let image = await media(page.file);
  if (!image) {
    for (const file of await alternatives(c.name, sci)) {
      image = await media(file);
      if (image) {
        console.log(`    ${c.slug}: lead image unusable, took ${file}`);
        break;
      }
      await sleep(250);
    }
  }

  if (!image) problems.push(`${c.slug}: no usable photograph`);
  if (!redlist) problems.push(`${c.slug}: no IUCN category on Wikidata`);
  if (!sci) problems.push(`${c.slug}: no binomial on Wikidata`);

  results.push({
    slug: c.slug,
    name: c.name,
    scientific: sci,
    group: c.group,
    bigFive: Boolean(c.bigFive),
    iucn: redlist,
    diet: c.diet ?? null,
    rarity: c.rarity ?? null,
    image,
    call: null,
    _wiki: page.title,
    _qid: page.qid,
  });

  console.log(
    `  ${c.slug.padEnd(34)} ${(redlist ?? '--').padEnd(3)} ${image ? 'photo' : 'NO PHOTO'}  ${sci ?? ''}`,
  );

  await sleep(350);
}

await writeFile(output, JSON.stringify(results, null, 2));

console.log(`\n  wrote ${results.length} to ${output}`);
if (problems.length) {
  console.log(`\n  ${problems.length} gaps, each one left null rather than filled in:`);
  for (const p of problems) console.log(`    ${p}`);
}
console.log('');
