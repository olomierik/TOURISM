import { pool } from './db.js';

const t0 = Date.now();

try {
  const { rows: [info] } = await pool.query(
    `select current_database() as db,
            current_user      as usr,
            version()         as version,
            now()             as server_time`
  );

  console.log('Connected in', Date.now() - t0, 'ms\n');
  console.log('  database    :', info.db);
  console.log('  user        :', info.usr);
  console.log('  server time :', info.server_time.toISOString());
  console.log('  version     :', info.version.split(' ').slice(0, 2).join(' '));

  const { rows: tables } = await pool.query(
    `select table_schema, table_name
       from information_schema.tables
      where table_schema not in ('pg_catalog','information_schema')
        and table_type = 'BASE TABLE'
      order by table_schema, table_name`
  );

  console.log('\n  tables      :', tables.length);
  for (const t of tables) console.log(`     - ${t.table_schema}.${t.table_name}`);
} catch (err) {
  console.error('Connection FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
