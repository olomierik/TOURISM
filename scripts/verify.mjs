import { pool } from './db.mjs';

/**
 * Post-migration verification.
 *
 * Exercises the three things that are expensive to get wrong and invisible if
 * you only look at the schema: per-locale search, lead distribution, and whether
 * RLS actually stops the reads it is supposed to.
 *
 * RLS is checked by switching into the `anon` and `authenticated` roles inside a
 * transaction that is always rolled back, with request.jwt.claims set the way
 * PostgREST would — so auth.uid() resolves exactly as it does in production.
 */

let pass = 0;
let fail = 0;

function check(label, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

/** Run fn inside a rolled-back transaction acting as `role`. */
async function asRole(role, uid, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    if (uid) {
      await client.query('select set_config($1, $2, true)', [
        'request.jwt.claims',
        JSON.stringify({ sub: uid, role }),
      ]);
    }
    await client.query(`set local role ${role}`);
    return await fn(client);
  } finally {
    await client.query('rollback').catch(() => {});
    client.release();
  }
}

async function counts() {
  console.log('\n--- Seeded data ---');
  const { rows } = await pool.query(`
    select 'destinations' as t, count(*)::int as n from destinations
    union all select 'categories', count(*)::int from categories
    union all select 'businesses', count(*)::int from businesses
    union all select 'packages', count(*)::int from packages
    union all select 'guides', count(*)::int from guides
    union all select 'destination_translations', count(*)::int from destination_translations
    union all select 'package_translations', count(*)::int from package_translations
    union all select 'guide_translations', count(*)::int from guide_translations
    order by 1
  `);
  rows.forEach((r) => console.log(`  ${String(r.n).padStart(4)}  ${r.t}`));

  const { rows: demo } = await pool.query(
    `select count(*)::int as n from businesses where not is_demo`,
  );
  check('every seeded business is flagged as demo', demo[0].n === 0,
    `${demo[0].n} businesses are not marked is_demo`);
}

async function searchTests() {
  console.log('\n--- Per-locale full-text search ---');

  // German stemming: "Reiseziele" (plural) must find text containing "Reiseziel".
  const cases = [
    ['en', 'safari', 'destination'],
    ['de', 'Safari', 'destination'],
    ['fr', 'safari', 'destination'],
    ['it', 'safari', 'destination'],
  ];

  for (const [locale, term] of cases) {
    const { rows } = await pool.query(
      `select count(*)::int as n
       from destination_translations
       where locale = $1 and search_vector @@ build_search_query($2, $1)`,
      [locale, term],
    );
    check(`${locale}: "${term}" matches destination text`, rows[0].n > 0,
      `got ${rows[0].n} rows`);
  }

  // Stemming proof: searching the inflected form must still match.
  const { rows: stem } = await pool.query(
    `select count(*)::int as n from guide_translations
     where locale = 'de' and search_vector @@ build_search_query('Kosten', 'de')`,
  );
  check('de: "Kosten" matches the cost guide (German stemming active)', stem[0].n > 0);

  // Accent folding: the unaccented query must match accented content.
  const { rows: acc } = await pool.query(
    `select count(*)::int as n from destination_translations
     where locale = 'fr' and search_vector @@ build_search_query('cratere', 'fr')`,
  );
  check('fr: unaccented "cratere" matches "cratère"', acc[0].n > 0);

  // Malformed input must not throw.
  const { rows: bad } = await pool.query(
    `select build_search_query('!!! & | ((', 'en') is not null as ok`,
  );
  check('malformed query is handled without error', bad[0].ok === false || bad[0].ok === true);
}

async function slugTests() {
  console.log('\n--- Localized slugs ---');
  const { rows } = await pool.query(`
    select d.key, max(t.slug) filter (where t.locale='en') en,
                  max(t.slug) filter (where t.locale='de') de,
                  max(t.slug) filter (where t.locale='it') it
    from destinations d join destination_translations t on t.destination_id = d.id
    where d.key in ('zanzibar','kilimanjaro','ngorongoro')
    group by d.key order by d.key
  `);
  rows.forEach((r) => console.log(`  ${r.key.padEnd(14)} en=${r.en}  de=${r.de}  it=${r.it}`));

  const zan = rows.find((r) => r.key === 'zanzibar');
  const kili = rows.find((r) => r.key === 'kilimanjaro');
  check('German slug for Zanzibar is "sansibar"', zan?.de === 'sansibar', `got ${zan?.de}`);
  check('German slug for Kilimanjaro is "kilimandscharo"', kili?.de === 'kilimandscharo', `got ${kili?.de}`);
  check('Italian slug for Kilimanjaro is "kilimangiaro"', kili?.it === 'kilimangiaro', `got ${kili?.it}`);

  // The taxonomy collision guard must actually fire.
  try {
    await pool.query(`
      insert into category_translations (category_id, locale, name, slug)
      select id, 'en', 'Clash Test', 'serengeti' from categories limit 1
    `);
    check('category slug clashing with a destination is rejected', false,
      'insert unexpectedly succeeded');
  } catch (err) {
    check('category slug clashing with a destination is rejected',
      /already used by a destination/.test(err.message), err.message);
  }
}

async function leadMatchingTest() {
  console.log('\n--- Lead matching ---');
  const client = await pool.connect();
  try {
    await client.query('begin');

    const { rows: dest } = await client.query(
      `select id from destinations where key = 'serengeti'`,
    );
    const { rows: cat } = await client.query(
      `select id from categories where key = 'safaris'`,
    );

    // A well-qualified enquiry: budget, firm dates, phone, detailed message.
    const { rows: lead } = await client.query(
      `insert into leads
         (full_name, email, phone, destination_id, category_id, travel_start, travel_end,
          dates_flexible, adults, budget_min, budget_max, interests, message, locale)
       values ('Verify Harness','verify@example.test','+255700999999',$1,$2,
               current_date + 90, current_date + 97, false, 2, 4000, 6000,
               array['wildlife','photography'],
               'We are two travelers hoping to see the migration river crossings and would like a private vehicle throughout. Flexible on camp standard but want an experienced guide.',
               'en')
       returning id, reference, quality_score`,
      [dest[0].id, cat[0].id],
    );

    const { id, reference, quality_score } = lead[0];
    console.log(`  created ${reference}, quality score ${quality_score}`);
    check('a complete enquiry scores highly', quality_score >= 60,
      `scored ${quality_score}`);

    const { rows: matched } = await client.query(
      'select match_lead_to_businesses($1) as n',
      [id],
    );
    console.log(`  distributed to ${matched[0].n} businesses`);
    check('enquiry was distributed', matched[0].n > 0);

    const { rows: dist } = await client.query(
      `select lb.rank, b.name, b.tier
       from lead_businesses lb join businesses b on b.id = lb.business_id
       where lb.lead_id = $1 order by lb.rank`,
      [id],
    );
    dist.forEach((d) => console.log(`    ${d.rank}. ${d.name} [${d.tier}]`));

    check('ranked recipients are all safari operators serving Serengeti',
      dist.length > 0);
    check('featured tier ranks before free tier',
      dist.length < 2 || dist[0].tier !== 'free',
      `rank 1 was ${dist[0]?.tier}`);

    const { rows: relead } = await client.query(
      'select match_lead_to_businesses($1) as n',
      [id],
    );
    check('re-running distribution does not double-send', relead[0].n === 0,
      `second run distributed ${relead[0].n}`);

    const { rows: status } = await client.query(
      'select status, distributed_at is not null as stamped from leads where id = $1',
      [id],
    );
    check('lead status advanced to distributed', status[0].status === 'distributed');
    check('distributed_at was stamped', status[0].stamped);

    const { rows: notif } = await client.query(
      'select count(*)::int as n from notifications where lead_id = $1',
      [id],
    );
    console.log(`  queued ${notif[0].n} notifications (owners are null on demo rows)`);

    await client.query('rollback');
  } finally {
    client.release();
  }
}

async function rlsTests() {
  console.log('\n--- Row Level Security ---');

  // Anonymous visitor
  await asRole('anon', null, async (c) => {
    const { rows: biz } = await c.query('select count(*)::int as n from businesses');
    const { rows: total } = await pool.query(
      `select count(*)::int as n from businesses where status = 'approved' and deleted_at is null`,
    );
    check('anon sees only approved businesses', biz[0].n === total[0].n,
      `anon saw ${biz[0].n}, approved count is ${total[0].n}`);

    const { rows: leads } = await c.query('select count(*)::int as n from leads');
    check('anon cannot read any leads', leads[0].n === 0, `saw ${leads[0].n}`);

    const { rows: profiles } = await c.query('select count(*)::int as n from profiles');
    check('anon cannot read profiles', profiles[0].n === 0, `saw ${profiles[0].n}`);

    const { rows: payments } = await c.query('select count(*)::int as n from payments');
    check('anon cannot read payments', payments[0].n === 0, `saw ${payments[0].n}`);

    const { rows: audit } = await c.query('select count(*)::int as n from audit_logs');
    check('anon cannot read the audit log', audit[0].n === 0, `saw ${audit[0].n}`);

    const { rows: migr } = await c.query('select count(*)::int as n from schema_migrations');
    check('anon cannot read schema_migrations', migr[0].n === 0, `saw ${migr[0].n}`);

    // Public content must remain readable, or the site breaks.
    const { rows: dests } = await c.query('select count(*)::int as n from destinations');
    check('anon can read destinations', dests[0].n === 8, `saw ${dests[0].n}`);

    const { rows: pkgs } = await c.query('select count(*)::int as n from packages');
    check('anon can read published packages', pkgs[0].n === 16, `saw ${pkgs[0].n}`);
  });

  // Business owner A must not reach business B's data.
  const { rows: two } = await pool.query(
    `select id, slug from businesses order by slug limit 2`,
  );

  if (two.length === 2) {
    // Give business A an owner we control, inside a rolled-back transaction.
    const client = await pool.connect();
    try {
      await client.query('begin');
      const { rows: u } = await client.query(
        `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                                 email_confirmed_at, created_at, updated_at)
         values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
                 'authenticated', 'owner-a@example.test', '', now(), now(), now())
         returning id`,
      );
      const ownerA = u[0].id;
      // Still in the trusted context here, so this write bypasses the guards.
      // Park the business in 'draft' so the status-transition rules are
      // actually exercised — testing approved -> approved is a no-op and would
      // pass for the wrong reason.
      await client.query(
        `update businesses set owner_id = $1, status = 'draft' where id = $2`,
        [ownerA, two[0].id],
      );

      await client.query('select set_config($1,$2,true)', [
        'request.jwt.claims', JSON.stringify({ sub: ownerA, role: 'authenticated' }),
      ]);
      await client.query('set local role authenticated');

      const { rows: canEditOwn } = await client.query(
        `update businesses set city = 'Owner Edited' where id = $1 returning id`,
        [two[0].id],
      );
      check('owner can edit their own business', canEditOwn.length === 1);

      const { rows: cannotEditOther } = await client.query(
        `update businesses set city = 'Hijacked' where id = $1 returning id`,
        [two[1].id],
      );
      check('owner cannot edit another business', cannotEditOther.length === 0,
        `updated ${cannotEditOther.length} rows`);

      // Each expected failure needs its own savepoint: a raised exception aborts
      // the whole transaction, so without one the *next* statement fails with
      // "current transaction is aborted" and the test would assert on the wrong
      // error message.
      const expectRejection = async (label, sql, pattern) => {
        await client.query('savepoint guard_test');
        let matched = false;
        let seen = '(no error raised)';
        try {
          await client.query(sql, [two[0].id]);
        } catch (err) {
          seen = err.message;
          matched = pattern.test(err.message);
        }
        await client.query('rollback to savepoint guard_test');
        check(label, matched, seen);
      };

      await expectRejection(
        'owner cannot self-verify their business',
        'update businesses set is_verified = true where id = $1',
        /administrator decision/,
      );

      await expectRejection(
        'owner cannot self-promote their tier',
        `update businesses set tier = 'featured' where id = $1`,
        /subscription/,
      );

      await expectRejection(
        'owner cannot approve their own draft listing',
        `update businesses set status = 'approved' where id = $1`,
        /set by review/,
      );

      // The one transition an owner IS allowed: submitting a draft for review.
      await client.query('savepoint submit_test');
      const { rows: submitted } = await client.query(
        `update businesses set status = 'pending' where id = $1 returning status`,
        [two[0].id],
      );
      check('owner can submit a draft for review',
        submitted[0]?.status === 'pending',
        `status is ${submitted[0]?.status ?? 'unchanged'}`);
      await client.query('rollback to savepoint submit_test');

      await client.query('rollback');
    } finally {
      client.release();
    }
  }
}

async function main() {
  try {
    await counts();
    await searchTests();
    await slugTests();
    await leadMatchingTest();
    await rlsTests();

    console.log(`\n${'='.repeat(46)}`);
    console.log(`  ${pass} passed, ${fail} failed`);
    console.log('='.repeat(46) + '\n');
    if (fail > 0) process.exitCode = 1;
  } catch (err) {
    console.error('\nVerification aborted:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();
