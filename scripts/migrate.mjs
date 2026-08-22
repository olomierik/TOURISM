import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

import { pool } from './db.mjs';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
);

/**
 * Applies pending SQL migrations in filename order.
 *
 * Each migration runs inside its own transaction, so a failure rolls that file
 * back entirely rather than leaving the schema half-built. Applied files are
 * recorded with a checksum: editing a migration that has already run is almost
 * always a mistake (the change silently never reaches environments that already
 * applied it), so that is treated as a hard error rather than a warning.
 */
async function migrate() {
  await pool.query(`
    create table if not exists schema_migrations (
      filename    text primary key,
      checksum    text        not null,
      applied_at  timestamptz not null default now()
    )
  `);

  const { rows: applied } = await pool.query(
    'select filename, checksum from schema_migrations',
  );
  const appliedMap = new Map(applied.map((r) => [r.filename, r.checksum]));

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  let ran = 0;

  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 16);
    const previous = appliedMap.get(file);

    if (previous) {
      if (previous !== checksum) {
        throw new Error(
          `${file} was modified after being applied (checksum ${previous} -> ${checksum}).\n` +
            'Migrations are immutable once run. Add a new migration instead.',
        );
      }
      continue;
    }

    const client = await pool.connect();
    const started = Date.now();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query(
        'insert into schema_migrations (filename, checksum) values ($1, $2)',
        [file, checksum],
      );
      await client.query('commit');
      console.log(`  applied  ${file}  (${Date.now() - started}ms)`);
      ran++;
    } catch (err) {
      await client.query('rollback');
      console.error(`\n  FAILED   ${file}\n`);
      console.error(`  ${err.message}\n`);
      if (err.position) {
        // Point at the offending line rather than making the reader count characters.
        const upto = sql.slice(0, Number(err.position));
        const line = upto.split('\n').length;
        console.error(`  near line ${line}: ${sql.split('\n')[line - 1]?.trim()}\n`);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(
    ran === 0
      ? 'Already up to date.'
      : `\nApplied ${ran} migration${ran === 1 ? '' : 's'}.`,
  );
}

try {
  await migrate();
} catch {
  process.exitCode = 1;
} finally {
  await pool.end();
}
