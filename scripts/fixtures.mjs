import { pool } from './db.mjs';

/**
 * Directory fixtures for the verification suites.
 *
 * These suites used to lean on the demo seed: lead matching needed safari
 * operators serving the Serengeti, the ranking test needed a paying tier above a
 * free one, and search needed something to find. Deleting the seed took all of
 * that with it and twenty-one assertions failed at once — not because anything
 * regressed, but because the fixtures had been production data all along.
 *
 * So the suites now build what they need and remove it afterwards. That also
 * means they no longer depend on whatever the live site happens to contain,
 * which was the deeper problem: a test that passes because a real operator
 * exists will fail the day that operator is suspended.
 *
 * Everything created here is prefixed `fixture-` and is deleted by
 * dropDirectoryFixtures even if the suite aborts partway.
 */

const PREFIX = 'fixture-';

/**
 * Creates three approved safari operators serving the Serengeti, one per tier,
 * each with a published package.
 *
 * Three because the ranking assertion needs a paying tier to sort above a free
 * one, and one of each makes the expected order unambiguous.
 */
export async function createDirectoryFixtures() {
  // Clear first. The slugs are fixed, so a leftover set from an aborted run
  // would collide on the unique constraint and every caller would have to
  // remember to clean up before creating. Doing it here makes that impossible
  // to forget.
  await dropDirectoryFixtures();

  const client = await pool.connect();

  try {
    await client.query('begin');

    const { rows: cat } = await client.query("select id from categories where key = 'safaris'");
    const { rows: dest } = await client.query("select id from destinations where key = 'serengeti'");

    if (!cat.length || !dest.length) {
      throw new Error('fixtures need the safaris category and serengeti destination');
    }

    const made = [];

    // free first: the dashboard suite proves an owner cannot self-promote by
    // setting tier='featured' on the lowest-slug fixture. If that fixture were
    // already featured the update would change nothing, no trigger would fire,
    // and the silence would read as a missing guard.
    for (const [i, tier] of ['free', 'premium', 'featured'].entries()) {
      const { rows } = await client.query(
        `insert into businesses (name, slug, status, tier, city, country_code, published_at)
         values ($1, $2, 'approved', $3, 'Arusha', 'TZ', now())
         returning id`,
        [`Fixture Safari Co ${i + 1}`, `${PREFIX}safari-${i + 1}`, tier],
      );
      const id = rows[0].id;
      made.push(id);

      // Text the search assertions look for. "safari" has to appear in the
      // indexed columns, not just the name, because the tsvector is built from
      // the translation.
      // All four locales. The per-locale search assertions run against the
      // tsvector built from these columns, so a fixture translated only into
      // English fails French and Italian for want of fixture data rather than
      // for want of a working index. "plongée" carries the accent so the
      // accent-insensitive search assertions have their subject.
      await client.query(
        `insert into business_translations (business_id, locale, tagline, short_description, description)
         values ($1,'en','Safari operator fixture','Serengeti safari specialists',
                 'Safari trips and plongee diving across the Serengeti.'),
                ($1,'de','Safari-Veranstalter','Safari-Spezialisten für die Serengeti',
                 'Safari-Reisen durch die Serengeti.'),
                ($1,'fr','Organisateur de safari','Spécialistes du safari au Serengeti',
                 'Safari et plongée à travers le Serengeti.'),
                ($1,'it','Operatore safari','Specialisti del safari nel Serengeti',
                 'Safari e immersioni attraverso il Serengeti.')`,
        [id],
      );

      await client.query(
        'insert into business_categories (business_id, category_id) values ($1, $2)',
        [id, cat[0].id],
      );
      await client.query(
        'insert into business_destinations (business_id, destination_id, is_primary) values ($1, $2, true)',
        [id, dest[0].id],
      );

      await client.query(
        `insert into packages (business_id, slug, status, price_from, currency, duration_days, published_at)
         values ($1, $2, 'published', $3, 'USD', 7, now())`,
        [id, `${PREFIX}package-${i + 1}`, 2500 + i * 500],
      );

      const { rows: pkg } = await client.query('select id from packages where slug = $1', [
        `${PREFIX}package-${i + 1}`,
      ]);

      // Packages carry their own destination links, separate from the business's.
      // The destination-filtered package queries join package_destinations, so a
      // fixture without these rows returns nothing however well the business is
      // linked.
      await client.query(
        'insert into package_destinations (package_id, destination_id) values ($1, $2)',
        [pkg[0].id, dest[0].id],
      );
      await client.query(
        `insert into package_translations (package_id, locale, title, summary)
         values ($1,'en',$2,'Safari fixture package'),
                ($1,'de',$2,'Safari-Testpaket'),
                ($1,'fr',$2,'Forfait safari de test'),
                ($1,'it',$2,'Pacchetto safari di prova')`,
        [pkg[0].id, `Fixture Serengeti Safari ${i + 1}`],
      );

      // Inclusions, with translated labels: the package-detail assertions read
      // them per locale and report "0 french labels" when they are absent.
      const { rows: inc } = await client.query(
        `insert into package_inclusions (package_id, is_included, sort_order)
         values ($1, true, 0), ($1, false, 1) returning id`,
        [pkg[0].id],
      );
      for (const [j, row] of inc.entries()) {
        await client.query(
          `insert into package_inclusion_translations (inclusion_id, locale, label)
           values ($1,'en',$2), ($1,'de',$3), ($1,'fr',$4), ($1,'it',$5)`,
          [row.id,
           j === 0 ? 'Park fees' : 'International flights',
           j === 0 ? 'Parkgebühren' : 'Internationale Flüge',
           j === 0 ? 'Droits de parc' : 'Vols internationaux',
           j === 0 ? 'Tasse dei parchi' : 'Voli internazionali'],
        );
      }
    }

    await client.query('commit');
    return made;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Removes every fixture row.
 *
 * Matches on the slug prefix rather than tracked ids so a suite that aborted
 * before recording what it made still cleans up — residue from one suite fails
 * assertions in the next, which is a confusing way to spend an afternoon.
 */
export async function dropDirectoryFixtures() {
  const client = await pool.connect();
  try {
    await client.query('delete from businesses where slug like $1', [`${PREFIX}%`]);
    await client.query('delete from packages where slug like $1', [`${PREFIX}%`]);
  } finally {
    client.release();
  }
}
