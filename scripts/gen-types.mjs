import { writeFile } from 'node:fs/promises';
import { pool } from './db.mjs';

/**
 * Generates TypeScript types by introspecting the live schema.
 *
 * The Supabase CLI's `gen types` runs its own SSL probe on a direct connection,
 * which times out against the pooler host this project uses. This reads the same
 * catalogs over the connection we already know works, and emits the Row / Insert /
 * Update shape the Supabase client expects.
 */

const PG_TO_TS = {
  uuid: 'string', text: 'string', citext: 'string', bpchar: 'string', varchar: 'string',
  int2: 'number', int4: 'number', int8: 'number', float4: 'number', float8: 'number',
  numeric: 'number', bool: 'boolean', json: 'Json', jsonb: 'Json',
  timestamptz: 'string', timestamp: 'string', date: 'string', time: 'string',
  inet: 'string', regconfig: 'string', tsvector: 'string',
};

async function main() {
  const { rows: enums } = await pool.query(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as values
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname order by t.typname
  `);
  const enumNames = new Set(enums.map((e) => e.name));

  const { rows: cols } = await pool.query(`
    select c.relname as table_name,
           a.attname  as column_name,
           format_type(a.atttypid, null) as formatted,
           t.typname  as udt_name,
           not a.attnotnull as is_nullable,
           pg_get_expr(d.adbin, d.adrelid) is not null as has_default,
           a.attidentity <> '' as is_identity
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum
  `);

  const tables = new Map();
  for (const c of cols) {
    if (!tables.has(c.table_name)) tables.set(c.table_name, []);
    tables.get(c.table_name).push(c);
  }

  const tsType = (col) => {
    const isArray = col.formatted.endsWith('[]');
    const base = col.udt_name.replace(/^_/, '');
    let mapped;
    if (enumNames.has(base)) mapped = `Database['public']['Enums']['${base}']`;
    else mapped = PG_TO_TS[base] ?? 'unknown';
    return isArray ? `${mapped}[]` : mapped;
  };

  let out = `/**
 * Generated from the live database schema — do not edit by hand.
 * Regenerate with: npm run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
`;

  for (const [table, columns] of [...tables].sort()) {
    out += `      ${table}: {\n        Row: {\n`;
    for (const c of columns) {
      out += `          ${c.column_name}: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
    }
    out += `        };\n        Insert: {\n`;
    for (const c of columns) {
      // Optional on insert when nullable, defaulted, or generated.
      const optional = c.is_nullable || c.has_default || c.is_identity;
      out += `          ${c.column_name}${optional ? '?' : ''}: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
    }
    out += `        };\n        Update: {\n`;
    for (const c of columns) {
      out += `          ${c.column_name}?: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
    }
    out += `        };\n      };\n`;
  }

  out += `    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
`;
  for (const e of enums) {
    out += `      ${e.name}: ${e.values.map((v) => `'${v}'`).join(' | ')};\n`;
  }
  out += `    };
  };
};

/** Row type for a table, e.g. Tables<'businesses'>. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
`;

  await writeFile('lib/supabase/database.types.ts', out, 'utf8');
  console.log(
    `Generated lib/supabase/database.types.ts — ${tables.size} tables, ${enums.length} enums.`,
  );
}

try {
  await main();
} catch (err) {
  console.error('Type generation failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
